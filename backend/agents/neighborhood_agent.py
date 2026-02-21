# agents/neighborhood_agent.py
import os
from google import genai

def analyze_neighborhood(listing: dict) -> dict:
    """
    Kiki: Analyzes crime, grocery, gym and walkability.
    """
    
    crime_rating = listing.get('crime_rating', 5.0) # 0 to 10
    
    summary = "A peaceful neighborhood with average activity."
    if crime_rating > 8:
        summary = "Very safe neighborhood with minimal incidents reported. Truly peaceful."
    elif crime_rating < 4:
        summary = "Some recent activity in the area; standard precautions advised."
        
    # Generate dynamic LLM insight using Gemini
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"You are Kiki from Kiki's Delivery Service, an energetic flying witch observing a town from the sky. This neighborhood has a crime/safety rating of {crime_rating}/10 and walk score of {listing.get('walk_score', 50)}. Give 1 enthusiastic sentence describing the vibe of the neighborhood."
            response = client.models.generate_content(model='gemini-flash-latest', contents=prompt)
            if response.text: summary = response.text.strip().replace('"', '')
        except: pass
        
    return {
        "safety": {
            "score": int(crime_rating),
            "nearestPolice": "0.4 mi", # mock
            "summary": summary
        },
        "hasGym": listing.get('has_gym', False),
        "hasGrocery": listing.get('has_grocery_nearby', False),
        "walkScore": listing.get('walk_score', 50)
    }
