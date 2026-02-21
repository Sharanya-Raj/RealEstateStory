# agents/neighborhood_agent.py
import os
from google import genai
import requests
import random


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




def neighborhood_reasoning_agent(neighborhood_data):


    prompt = f"""
    You are evaluating neighborhood livability.

    Data:
    {neighborhood_data}

    Assess:
    - Safety
    - Convenience
    - Walkability

    Return:
    - Safety rating (0-1)
    - Convenience rating (0-1)
    - Summary paragraph
    """

    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"You are Kiki from Kiki's Delivery Service, an energetic flying witch observing a town from the sky. This neighborhood has a crime/safety rating of {crime_rating}/10 and walk score of {listing.get('walk_score', 50)}. Give 1 enthusiastic sentence describing the vibe of the neighborhood."
            response = client.models.generate_content(model='gemini-flash-latest', contents=prompt)
            if response.text: 
                summary = response.text.strip().replace('"', '')
        except: pass
    return summary



def analyze_nearby(lat, lon):
    gyms = get_nearby_count(lat, lon, "gym")
    supermarkets = get_nearby_count(lat, lon, "supermarket")
    restaurants = get_nearby_count(lat, lon, "restaurant")

    transit_score = get_nearby_count(lat, lon, "bus_station")
    crime_score = get_crime_score(lat, lon)

    return {
        "gyms": gyms,
        "supermarkets": supermarkets,
        "restaurants": restaurants,
        "transit_score": transit_score,
        "crime_score": crime_score
    }


def get_crime_score(lat, lon):
    # placeholder logic
    return random.uniform(0.3, 0.8)

def get_nearby_count(lat, lon, amenity_type):

    query = f"""
    [out:json];
    node
      [amenity={amenity_type}]
      (around:10000,{lat},{lon});
    out;
    """ # 10000 meters is 6.2 miles

    response = requests.post(
        "http://overpass-api.de/api/interpreter",
        data={"data": query}
    )

    data = response.json()

    print(data)

    return len(data.get("elements", []))

if __name__ == "__main__":
    print(get_nearby_count(40.497987, -74.453992, "gym"))