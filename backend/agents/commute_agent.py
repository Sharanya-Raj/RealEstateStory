# agents/commute_agent.py
import os
from google import genai

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

    # Generate dynamic LLM insight using Gemini
    insight_text = ""
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"You are the Conductor from Spirited Away, speaking about a train journey. This property has a transit time of {transit_time} to the hub, driving time {driving_time}, and a walk score of {walk_score}/100. Give 1 sentence advising the traveler on their commute options."
            response = client.models.generate_content(model='gemini-flash-latest', contents=prompt)
            if response.text: insight_text = response.text.strip().replace('"', '')
        except: pass

    return {
        "driving": driving_time,
        "transit": transit_time,
        "walking": walking_time,
        "biking": biking_time,
        "walkScore": walk_score,
        "llm_insight": insight_text
    }
