# agents/kamaji.py
from .commute_agent import analyze_commute
from .budget_agent import analyze_budget
from .fairness_agent import analyze_fairness
from .neighborhood_agent import analyze_neighborhood
from .hidden_cost_agent import analyze_hidden_costs
import random
import os
import base64
from elevenlabs.client import ElevenLabs
import requests

def aggregate_insights(listing: dict, target_budget: float) -> dict:
    """
    Kamaji (Final Synthesis): orchestrates all agents and bundles their outputs 
    into a structured dict matching the frontend expectation.
    """
    
    commute = analyze_commute(listing)
    budget = analyze_budget(listing, target_budget)
    fairness = analyze_fairness(listing)
    neighborhood = analyze_neighborhood(listing)
    hidden = analyze_hidden_costs(listing)
    
    # 1. The Spirit Match Score (overall rating)
    # Combine individual sub-scores into an overall score 0-100
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
    
    # Generate dynamic LLM summary using Gemini
    api_key = os.environ.get("OPENROUTER_API_KEY")
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
            print(f"OpenRouter Kamaji error: {str(e)}")
    
    # 3. ElevenLabs TTS for Kamaji's Voiceover
    audio_base64 = None
    eleven_key = os.environ.get("ELEVENLABS_API_KEY")
    if eleven_key:
        try:
            client = ElevenLabs(api_key=eleven_key)
            audio_generator = client.text_to_speech.convert(
                text=summary_text,
                voice_id="pNInz6obbf5AWCG1NVKt",
                model_id="eleven_monolingual_v1",
                output_format="mp3_44100_128",
            )
            audio_bytes = b"".join(audio_generator)
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        except Exception as e:
            print(f"ElevenLabs error: {e}")
            
    result = {
        "id": listing["id"],
        "rank": random.randint(1, 100), # Let frontend sort
        "name": f"{listing.get('address').split(',')[0]} Apartments",
        "address": f"{listing.get('address')}, {listing.get('city')}, {listing.get('state')} {listing.get('zip')}",
        "rent": listing.get('base_rent'),
        "trueCost": hidden["trueCost"],
        "matchScore": match_score,
        "bedrooms": listing.get('bedrooms'),
        "bathrooms": listing.get('bathrooms'),
        "sqft": listing.get('sqft'),
        "distanceToCampus": f"{random.uniform(0.5, 4.0):.1f} mi", # Synthetic
        "walkScore": commute["walkScore"],
        "hasGym": neighborhood["hasGym"],
        "hasGrocery": neighborhood["hasGrocery"],
        "petFriendly": listing.get('pet_friendly', False),
        "amenities": ["In-unit Laundry" if random.random() > 0.5 else "Shared Laundry", "Dishwasher" if random.random() > 0.3 else "None", "Air Conditioning"],
        "description": listing.get('description'),
        "historicalInsight": fairness["historicalInsight"],
        "historicalTrend": fairness["historicalTrend"],
        "historicalPercent": fairness["percentile"], # To match frontend mapping
        "costBreakdown": budget["costBreakdown"],
        "budgetInsight": budget.get("llm_insight", ""),
        "commute": commute,
        "safety": neighborhood["safety"],
        "historicalPrices": fairness["historicalPrices"],
        "percentile": fairness["percentile"],
        "pros": pros[:4],
        "cons": cons[:3],
        "sophieSummary": summary_text,
        "voiceoverBase64": audio_base64,
        "images": []
    }
    
    return result
