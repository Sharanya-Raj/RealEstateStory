# agents/neighborhood_agent.py
import os
import requests

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
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if api_key:
        try:
            prompt = f"You are Kiki from Kiki's Delivery Service, an energetic flying witch observing a town from the sky. This neighborhood has a crime/safety rating of {crime_rating}/10 and walk score of {listing.get('walk_score', 50)}. Give 1 enthusiastic sentence describing the vibe of the neighborhood."
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
                summary = data["choices"][0]["message"]["content"].strip().replace('"', '')
        except Exception as e:
            print("Neighborhood API error:", e)
        
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
