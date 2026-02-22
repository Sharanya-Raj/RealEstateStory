# agents/kamaji.py
import base64
import json
import logging
import os
import random
import re
import requests
import concurrent.futures

try:
    from elevenlabs.client import ElevenLabs
except ImportError:
    ElevenLabs = None

from .commute_agent import analyze_commute, _get_commute_matrix_batch
from .budget_agent import analyze_budget
from .fairness_agent import analyze_fairness
from .neighborhood_agent import analyze_neighborhood, analyze_nearby_batch
from .hidden_cost_agent import analyze_hidden_costs, _compute_structured_costs

logger = logging.getLogger("agents.kamaji")


def aggregate_insights_batch(
    listings: list[dict],
    target_budget: float,
    college: str = "",
) -> list[dict]:
    """
    Batched pipeline: 1 geocode batch, 1 OSRM table, 1 Overpass, 1 LLM.
    Analyzes all listings with minimal API calls.
    """
    from services.geolocate import get_coordinates, geocode_batch
    from market_fairness.handler import run_market_fairness_agent
    from market_fairness.schema import MarketFairnessInput

    n = len(listings)
    if n == 0:
        return []

    logger.info("BATCH PIPELINE: analyzing %d listings (1 geocode batch, 1 OSRM, 1 Overpass, 1 LLM)", n)

    # 1. Geocode: college once + all listing addresses
    college_geo = get_coordinates(college) if college else None
    if not isinstance(college_geo, dict):
        college_geo = None
    col_lat = college_geo.get("latitude") if college_geo else None
    col_lon = college_geo.get("longitude") if college_geo else None

    addr_list = []
    for L in listings:
        raw = (L.get("address") or "").strip()
        if raw and re.search(r"\b\d{5}\b", raw):
            addr_list.append(raw)
        else:
            parts = [raw or L.get("address"), L.get("city"), L.get("state"), L.get("zip")]
            addr_list.append(", ".join(p for p in parts if p))
    geos = geocode_batch(addr_list, delay_sec=1.0)
    for i, L in enumerate(listings):
        g = geos[i] if i < len(geos) else {}
        L["_lat"] = g.get("latitude") or L.get("latitude") or 0
        L["_lon"] = g.get("longitude") or L.get("longitude") or 0

    apt_coords = [(L["_lat"], L["_lon"]) for L in listings]
    listings_with_coords = [(L, L["_lat"], L["_lon"]) for L in listings]

    # 2. OSRM Table: all apts → college
    commute_route_results = []
    if col_lat and col_lon and college:
        commute_route_results = _get_commute_matrix_batch(apt_coords, col_lon, col_lat)
    if len(commute_route_results) < n:
        commute_route_results = commute_route_results + [None] * (n - len(commute_route_results))

    # 3. Overpass batch
    nearby_results = analyze_nearby_batch(listings_with_coords)

    # 4. Per-listing deterministic: budget, fairness, hidden (structured)
    commutes = []
    budgets = []
    fairnesses = []
    hiddens = []

    for i, L in enumerate(listings):
        route = commute_route_results[i] if i < len(commute_route_results) else None
        driving_time = "15 mins"
        transit_time = "25 mins"
        walk_score = nearby_results[i].get("walk_score", 50) if i < len(nearby_results) else 50
        L["walk_score"] = walk_score
        if route:
            dm = route["driving_mins"]
            dk = route["distance_km"]
            driving_time = f"{dm} mins"
            transit_time = f"{int(dm * 1.4)} mins"
        commutes.append({
            "driving": driving_time,
            "transit": transit_time,
            "walking": f"{int(walk_score * 2)} mins",
            "biking": driving_time,
            "walkScore": walk_score,
            "llm_insight": "",
        })

        rent = float(L.get("base_rent", 0))
        util = float(L.get("avg_utilities", 0))
        total = rent + util
        fit = 100
        if total > target_budget:
            fit = max(0, 100 - (total - target_budget) / 10)
        else:
            fit = min(100, 80 + (target_budget - total) / 50)
        budgets.append({
            "matchScore": int(fit),
            "llm_insight": "",
            "costBreakdown": {"rent": rent, "utilities": util, "transportation": 80, "groceries": 200},
        })

        try:
            mf = run_market_fairness_agent(MarketFairnessInput(
                listing_id=str(L.get("id", i)),
                listing_rent=rent,
                zip_code=L.get("city") or L.get("zip", "08817"),
            ))
            pct = mf.percentile_position
            trend = "down" if mf.fairness_score > 60 else ("up" if mf.fairness_score < 40 else "stable")
            insight = mf.explanation.get("summary", mf.explanation.get("error", "Market data unavailable."))
        except Exception:
            pct = 50
            trend = "stable"
            insight = "Market data unavailable."
        fairnesses.append({
            "historicalInsight": insight,
            "historicalTrend": trend,
            "percentile": pct,
            "historicalPrices": [{"month": "Jan", "price": rent * 0.9}, {"month": "Apr", "price": rent}],
        })

        nb = nearby_results[i] if i < len(nearby_results) else {}
        L["has_gym"] = L.get("has_gym") or nb.get("gyms", 0) > 0
        L["has_grocery_nearby"] = L.get("has_grocery_nearby") or nb.get("supermarkets", 0) > 0
        struct = _compute_structured_costs(L)
        rent_f = float(L.get("base_rent", 0))
        true_cost = rent_f + sum(x["amount"] for x in struct)
        hiddens.append({
            "trueCost": round(true_cost, 0),
            "transparencyScore": 85,
            "fees": {"parking": 0, "amenities": 0, "unstructured": 0},
            "llm_insight": "",
            "agenticBreakdown": {
                "items": struct,
                "structuredTrueCost": round(true_cost, 2),
                "llmTrueCost": round(true_cost, 2),
                "reasoning": "Structured analysis (batch mode).",
                "negotiationTips": [],
                "riskFlags": [],
            },
        })

    # 5. Single batched LLM call for all narrative insights
    api_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPEN_ROUTER_API_KEY")
    llm_insights = [{"budget": "", "commute": "", "neighborhood": "", "fairness": "", "kamaji": ""}] * n
    if api_key:
        rows = []
        for i, L in enumerate(listings):
            rows.append({
                "i": i,
                "address": L.get("address", "Unknown"),
                "rent": L.get("base_rent"),
                "commute": commutes[i]["driving"],
                "walk_score": commutes[i]["walkScore"],
                "percentile": fairnesses[i]["percentile"],
                "true_cost": hiddens[i]["trueCost"],
            })
        prompt = f"""You are the Ghibli Nest real estate AI. For each of these {n} NJ rental listings near {college}, provide SHORT insights (1 sentence each).

Listings data:
{json.dumps(rows, indent=2)}

Return ONLY valid JSON with this exact structure (one object per listing, same order):
{{"insights": [
  {{"budget_insight": "...", "commute_insight": "...", "neighborhood_summary": "...", "fairness_insight": "...", "kamaji_verdict": "..."}},
  ...
]}}"""
        try:
            logger.info("API CALL: Batched LLM for %d listings", n)
            resp = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "google/gemini-2.5-flash",
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                },
                timeout=60,
            )
            if resp.ok:
                raw = resp.json()["choices"][0]["message"]["content"]
                data = json.loads(raw.replace("```json", "").replace("```", "").strip())
                arr = data.get("insights", [])
                for i, item in enumerate(arr[:n]):
                    if i < len(llm_insights):
                        llm_insights[i] = {
                            "budget": item.get("budget_insight", ""),
                            "commute": item.get("commute_insight", ""),
                            "neighborhood": item.get("neighborhood_summary", ""),
                            "fairness": item.get("fairness_insight", ""),
                            "kamaji": item.get("kamaji_verdict", ""),
                        }
        except Exception as e:
            logger.warning("Batched LLM failed: %s", e)

    # 6. Merge and build final results
    results = []
    for i, L in enumerate(listings):
        li = llm_insights[i] if i < len(llm_insights) else {}
        budgets[i]["llm_insight"] = li.get("budget", "")
        commutes[i]["llm_insight"] = li.get("commute", "")
        fairnesses[i]["historicalInsight"] = li.get("fairness", fairnesses[i]["historicalInsight"])
        hiddens[i]["llm_insight"] = ""
        nb = nearby_results[i] if i < len(nearby_results) else {}
        crime = int((nb.get("crime_score", 0.5) or 0.5) * 10)
        safety_summary = li.get("neighborhood", "Peaceful neighborhood.")
        match = int(max(0, min(100, 100 - max(0, 80 - budgets[i]["matchScore"]) * 1.5 - (10 if crime < 6 else 0))))
        pros = ["Pet friendly"] if L.get("pet_friendly") else []
        cons = ["Over budget"] if budgets[i]["matchScore"] < 50 else []
        if not pros:
            pros.append("Standard rental")
        if not cons:
            cons.append("No major red flags")
        summary = li.get("kamaji", f"Spirit match {match}%. True cost ${hiddens[i]['trueCost']}/mo.")

        results.append({
            "id": L.get("id"),
            "rank": random.randint(1, 100),
            "name": (L.get("address") or "Unknown").split(",")[0] + " Apartments",
            "address": f"{L.get('address')}, {L.get('city')}, {L.get('state')} {L.get('zip')}",
            "rent": L.get("base_rent"),
            "trueCost": hiddens[i]["trueCost"],
            "matchScore": match,
            "bedrooms": L.get("bedrooms"),
            "bathrooms": L.get("bathrooms"),
            "sqft": L.get("sqft"),
            "distanceToCampus": f"{random.uniform(0.5, 4.0):.1f} mi",
            "walkScore": commutes[i]["walkScore"],
            "hasGym": L.get("has_gym", False),
            "hasGrocery": L.get("has_grocery_nearby", False),
            "petFriendly": L.get("pet_friendly", False),
            "amenities": ["In-unit Laundry", "Dishwasher", "Air Conditioning"],
            "description": L.get("description"),
            "historicalInsight": fairnesses[i]["historicalInsight"],
            "historicalTrend": fairnesses[i]["historicalTrend"],
            "historicalPercent": fairnesses[i]["percentile"],
            "costBreakdown": budgets[i]["costBreakdown"],
            "budgetInsight": budgets[i]["llm_insight"],
            "commute": commutes[i],
            "safety": {"score": crime, "nearestPolice": "0.4 mi", "summary": safety_summary},
            "historicalPrices": fairnesses[i]["historicalPrices"],
            "percentile": fairnesses[i]["percentile"],
            "pros": pros[:4],
            "cons": cons[:3],
            "sophieSummary": summary,
            "voiceoverBase64": None,
            "audioStreams": {},
            "images": [],
            "agenticBreakdown": hiddens[i]["agenticBreakdown"],
        })
    return results


def aggregate_insights(listing: dict, target_budget: float, college: str = "") -> dict:
    """
    Kamaji (Final Synthesis): orchestrates all agents and bundles their outputs 
    into a structured dict matching the frontend expectation.
    """
    
    logger.info("AGENT: analyze_commute (Conductor)")
    commute = analyze_commute(listing, college)
    logger.info("AGENT: analyze_budget (Lin)")
    budget = analyze_budget(listing, target_budget)
    logger.info("AGENT: analyze_fairness (Baron)")
    fairness = analyze_fairness(listing)
    logger.info("AGENT: analyze_neighborhood (Kiki)")
    neighborhood = analyze_neighborhood(listing)
    logger.info("AGENT: analyze_hidden_costs (Soot Sprite)")
    hidden = analyze_hidden_costs(listing)
    
    # 0. LLM Data Completion Layer (OpenRouter / Gemini)
    logger.info("AGENT: Kamaji LLM data padding")
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if api_key:
        try:
            completion_prompt = f"""You are an expert real estate AI. Evaluate the property at {listing.get('address', 'Unknown')}.
Based on your world knowledge of this area, provide educated estimates in strict JSON:
{{"walk_score": (int 0-100), "driving_minutes_to_center": (int), "market_fairness_percentile": (int 0-100), "safety_score_out_of_10": (int 1-10)}}
Return ONLY the valid JSON, no markdown."""
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "google/gemini-2.5-flash",
                    "messages": [{"role": "user", "content": completion_prompt}],
                    "response_format": {"type": "json_object"}
                },
                timeout=15
            )
            if response.ok:
                text = response.json()["choices"][0]["message"]["content"]
                clean_json = text.replace("```json", "").replace("```", "").strip()
                ai_data = json.loads(clean_json)
                if commute["walkScore"] == 0 or commute["walkScore"] == 70:
                    commute["walkScore"] = ai_data.get("walk_score", commute["walkScore"])
                if neighborhood["safety"]["score"] == 0 or neighborhood["safety"]["score"] == 7:
                    neighborhood["safety"]["score"] = ai_data.get("safety_score_out_of_10", neighborhood["safety"]["score"])
                if fairness["percentile"] == 0 or fairness["percentile"] == 50:
                    fairness["percentile"] = ai_data.get("market_fairness_percentile", fairness["percentile"])
        except Exception as e:
            logger.warning("LLM Data Padding error: %s", e)

    # 1. The Spirit Match Score (overall rating)
    base = 100
    if budget["matchScore"] < 80:
        base -= (80 - budget["matchScore"]) * 1.5
    if neighborhood["safety"]["score"] < 6:
        base -= 10
    if hidden["transparencyScore"] < 50:
        base -= 15
        
    match_score = int(max(0, min(100, base)))
    
    # 2. Pros / Cons generation
    pros = []
    cons = []
    
    if listing.get('pet_friendly'): pros.append("Pet friendly — bring your companion!")
    if listing.get('has_gym'): pros.append("On-site fitness center")
    if commute["walkScore"] > 80: pros.append(f"Highly walkable ({commute['walkScore']}/100)")
    if budget["matchScore"] > 90: pros.append("Fits your budget comfortably")
    if fairness["percentile"] < 30: pros.append("Priced below market average")
    
    if budget["matchScore"] < 50: cons.append("Significantly over target budget")
    if hidden["fees"]["parking"] > 100: cons.append(f"High monthly parking fee (${hidden['fees']['parking']})")
    if neighborhood["safety"]["score"] < 5: cons.append("Safety concerns in immediate area")
    if fairness["percentile"] > 80: cons.append("Priced significantly above market average")
    
    if len(pros) == 0: pros.append("A standard rental unit")
    if len(cons) == 0: cons.append("No major red flags detected")
    
    summary_text = f"A true find. The overall feeling is a {match_score}% match. Be mindful of the true cost of ${hidden['trueCost']}/mo."
    
    # Generate dynamic LLM summary using OpenRouter
    if api_key:
        try:
            prompt = f"You are Kamaji from Spirited Away, a gruff but caring boiler man giving rental advice. Analyze these reports and give a 2-sentence final verdict on the property focusing on the Pros and Cons. Mention the Spirit Match score ({match_score}/100) and True Cost (${hidden['trueCost']}). Pros: {pros}. Cons: {cons}."
            
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "google/gemini-2.5-flash",
                    "messages": [{"role": "user", "content": prompt}]
                },
                timeout=10
            )
            if response.ok:
                data = response.json()
                summary_text = data["choices"][0]["message"]["content"].strip().replace('"', '')
        except Exception as e:
            logger.warning("OpenRouter Kamaji error: %s", e)
    
    # 3. ElevenLabs TTS for All Agents (Parallelized)
    eleven_key = os.environ.get("ELEVENLABS_API_KEY")
    audio_streams = {
        "commute": None,
        "budget": None,
        "market": None,
        "neighborhood": None,
        "hidden": None,
        "kamaji": None
    }
    
    if eleven_key and ElevenLabs is not None:
        try:
            logger.info("API: ElevenLabs TTS for 6 agents (parallel)")
            client = ElevenLabs(api_key=eleven_key)
            
            voice_map = {
                "commute":      "auq43ws1oslv0tO4BDa7",
                "budget":       "auq43ws1oslv0tO4BDa7",
                "market":       "auq43ws1oslv0tO4BDa7",
                "neighborhood": "auq43ws1oslv0tO4BDa7",
                "hidden":       "auq43ws1oslv0tO4BDa7",
                "kamaji":       "auq43ws1oslv0tO4BDa7"
            }
            
            speech_texts = {
                "commute": f"Driving takes {commute.get('driving', 'some time')}. Transit takes {commute.get('transit', 'some time')}. {commute.get('llm_insight', 'Hmm, no commute data found.')}",
                "budget": f"Base Rent is ${budget.get('costBreakdown', {}).get('rent', listing.get('base_rent'))}. {budget.get('llm_insight', 'My calculations are clouded.')}",
                "market": f"This property sits around the {fairness['percentile']}th percentile for this ZIP code. {fairness.get('historicalInsight', 'A landlord never reveals their secrets.')}",
                "neighborhood": f"Walk Score is {commute['walkScore']} out of 100. {neighborhood['safety'].get('summary', 'The spirits are quiet today.')}",
                "hidden": f"Total True Cost is ${hidden['trueCost']} per month. I sense some hidden fees lurking in the shadows. Always read the contract!",
                "kamaji": summary_text
            }
            
            def fetch_tts(agent_id, text, voice_id):
                try:
                    audio_generator = client.text_to_speech.convert(
                        text=text,
                        voice_id=voice_id,
                        model_id="eleven_turbo_v2_5",
                        output_format="mp3_44100_128",
                    )
                    audio_bytes = b"".join(audio_generator)
                    return agent_id, base64.b64encode(audio_bytes).decode('utf-8')
                except Exception as e:
                    logger.warning("ElevenLabs error for %s: %s", agent_id, e)
                    return agent_id, None
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
                futures = [executor.submit(fetch_tts, agent, speech_texts[agent], voice_map[agent]) for agent in speech_texts]
                for future in concurrent.futures.as_completed(futures):
                    agent_id, base64_audio = future.result()
                    audio_streams[agent_id] = base64_audio
                    
        except Exception as e:
            logger.warning("ElevenLabs parallel execution error: %s", e)
            
    result = {
        "id": listing["id"],
        "rank": random.randint(1, 100),
        "name": f"{listing.get('address', 'Unknown').split(',')[0]} Apartments",
        "address": f"{listing.get('address')}, {listing.get('city')}, {listing.get('state')} {listing.get('zip')}",
        "rent": listing.get('base_rent'),
        "trueCost": hidden["trueCost"],
        "matchScore": match_score,
        "bedrooms": listing.get('bedrooms'),
        "bathrooms": listing.get('bathrooms'),
        "sqft": listing.get('sqft'),
        "distanceToCampus": f"{random.uniform(0.5, 4.0):.1f} mi",
        "walkScore": commute["walkScore"],
        "hasGym": neighborhood["hasGym"],
        "hasGrocery": neighborhood["hasGrocery"],
        "petFriendly": listing.get('pet_friendly', False),
        "amenities": ["In-unit Laundry" if random.random() > 0.5 else "Shared Laundry", "Dishwasher" if random.random() > 0.3 else "None", "Air Conditioning"],
        "description": listing.get('description'),
        "historicalInsight": fairness["historicalInsight"],
        "historicalTrend": fairness["historicalTrend"],
        "historicalPercent": fairness["percentile"],
        "fairnessScore": fairness.get("fairnessScore", 50),
        "fairnessExplanation": fairness.get("explanation", {}),
        "costBreakdown": budget["costBreakdown"],
        "budgetInsight": budget.get("llm_insight", ""),
        "commute": commute,
        "safety": neighborhood["safety"],
        "historicalPrices": fairness["historicalPrices"],
        "percentile": fairness["percentile"],
        "pros": pros[:4],
        "cons": cons[:3],
        "sophieSummary": summary_text,
        "voiceoverBase64": audio_streams["kamaji"],
        "audioStreams": audio_streams,
        "images": [],
        "agenticBreakdown": hidden.get("agenticBreakdown", {}),
    }
    
    return result
