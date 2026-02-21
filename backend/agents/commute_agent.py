# agents/commute_agent.py
import logging
import os
import requests
from llm_client import generate_text

logger = logging.getLogger("agents.commute")


def analyze_commute(listing: dict) -> dict:
    """
    The Conductor: Calculates travel time and converts to a commute score.
    Returns transit/driving times and a walk score.
    """
    driving_time = f"{listing.get('transit_time_to_hub', 20) // 2} mins"
    transit_time = f"{listing.get('transit_time_to_hub', 40)} mins"
    
    # We pretend taking an hour to walk somewhere is 60+ mins
    walking_time = f"{listing.get('transit_time_to_hub', 30) * 4} mins"
    biking_time = f"{listing.get('transit_time_to_hub', 30) * 1.5} mins"
    walk_score = listing.get('walk_score', 50)

    # Generate dynamic LLM insight (Gemini or OpenRouter)
    logger.info("AGENT: commute calling LLM (Conductor insight)")
    insight_text = ""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    print(f"[COMMUTE] API key present: {bool(api_key)}, prefix: {api_key[:12] if api_key else 'NONE'}...")
    if api_key:
        try:
            prompt = f"You are the Conductor from Spirited Away, speaking about a train journey. This property has a transit time of {transit_time} to the hub, driving time {driving_time}, and a walk score of {walk_score}/100. Give 1 sentence advising the traveler on their commute options."
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "google/gemini-2.5-flash",
                    "messages": [{"role": "user", "content": prompt}]
                },
                timeout=15
            )
            print(f"[COMMUTE] Response status: {response.status_code}")
            print(f"[COMMUTE] Response body: {response.text[:300]}")
            if response.ok:
                data = response.json()
                insight_text = data["choices"][0]["message"]["content"].strip().replace('"', '')
                print(f"[COMMUTE] LLM insight: {insight_text[:100]}")
            else:
                print(f"[COMMUTE] API FAILED: {response.status_code} - {response.text[:200]}")
        except Exception as e: 
            print(f"[COMMUTE] EXCEPTION: {e}")
    else:
        print("[COMMUTE] No API key found, skipping LLM call")

    return {
        "driving": driving_time,
        "transit": transit_time,
        "walking": walking_time,
        "biking": biking_time,
        "walkScore": walk_score,
        "llm_insight": insight_text
    }
