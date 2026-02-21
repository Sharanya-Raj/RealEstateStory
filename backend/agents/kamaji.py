# agents/kamaji.py
import base64
import json
import logging
import os
import random
import requests
import concurrent.futures

from elevenlabs.client import ElevenLabs

from .commute_agent import analyze_commute
from .budget_agent import analyze_budget
from .fairness_agent import analyze_fairness
from .neighborhood_agent import analyze_neighborhood
from .hidden_cost_agent import analyze_hidden_costs

logger = logging.getLogger("agents.kamaji")

def aggregate_insights(listing: dict, target_budget: float) -> dict:
    """
    Kamaji (Final Synthesis): orchestrates all agents and bundles their outputs 
    into a structured dict matching the frontend expectation.
    """
    
    logger.info("AGENT: analyze_commute (Conductor)")
    commute = analyze_commute(listing)
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
    
    if eleven_key:
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
        "images": []
    }
    
    return result
