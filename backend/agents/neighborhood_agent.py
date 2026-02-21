# agents/neighborhood_agent.py
import logging
import math
import random
import requests
import os
from llm_client import generate_text

logger = logging.getLogger("agents.neighborhood")

# hardcoded for now
def analyze_neighborhood(listing: dict) -> dict:
    """
    Kiki: Analyzes crime, grocery, gym and walkability.
    """
    crime_rating = listing.get('crime_rating', 5.0) # 0 to 10
    
    lat = listing.get("latitude")
    lon = listing.get("longitude")
    
    has_gym = listing.get("has_gym", False)
    has_grocery = listing.get("has_grocery_nearby", False)
    walk_score = listing.get("walk_score", 50)
    
    if lat and lon:
        logger.info("AGENT: analyze_neighborhood calling analyze_nearby (Overpass API) for lat=%s lon=%s", lat, lon)
        nearby_data = analyze_nearby(lat, lon)
        if nearby_data:
            has_gym = nearby_data.get("gyms", 0) > 0
            has_grocery = nearby_data.get("supermarkets", 0) > 0
            
            # Simple dynamic walkability estimation
            total_amenities = nearby_data.get("restaurants", 0) + nearby_data.get("supermarkets", 0) * 3 + nearby_data.get("transit_score", 0) * 2 
            walk_score = min(100, 40 + total_amenities)
            crime_rating = nearby_data.get("crime_score", 0.5) * 10
    
    summary = "A peaceful neighborhood with average activity."
    if crime_rating > 8:
        summary = "Very safe neighborhood with minimal incidents reported. Truly peaceful."
    elif crime_rating < 4:
        summary = "Some recent activity in the area; standard precautions advised."
        
    # Generate dynamic LLM insight using Gemini
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"You are Kiki from Kiki's Delivery Service, an energetic flying witch observing a town from the sky. This neighborhood has a crime/safety rating of {crime_rating}/10 and walk score of {walk_score}. Give 1 enthusiastic sentence describing the vibe of the neighborhood."
            response = client.models.generate_content(model='gemini-flash-latest', contents=prompt)
            if response.text: summary = response.text.strip().replace('"', '')
        except: pass
        
    return {
        "safety": {
            "score": int(crime_rating),
            "nearestPolice": "0.4 mi", # mock
            "summary": summary
        },
        "hasGym": has_gym,
        "hasGrocery": has_grocery,
        "walkScore": walk_score
    }


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Approximate distance in km between two points (Haversine)."""
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return R * c


def _el_latlon(el: dict, center_lat: float, center_lon: float) -> tuple[float, float] | None:
    """Extract lat/lon from Overpass element (node, way, or relation)."""
    if "lat" in el and "lon" in el:
        return float(el["lat"]), float(el["lon"])
    center = el.get("center", {})
    if "lat" in center and "lon" in center:
        return float(center["lat"]), float(center["lon"])
    return None


def analyze_nearby(lat, lon):
    # We use a union (parentheses) to get everything in one go
    # This is much lighter on the server.
    query = f"""
    [out:json][timeout:25];
    (
      nw["leisure"~"fitness_centre|gym"](around:5000,{lat},{lon});
      nw["shop"~"supermarket|convenience"](around:5000,{lat},{lon});
      nw["amenity"="restaurant"](around:5000,{lat},{lon});
      nw["highway"="bus_stop"](around:2000,{lat},{lon});
    );
    out center;
    """
    
    try:
        logger.info("API CALL: Overpass (OpenStreetMap) for gyms/supermarkets/restaurants/transit at lat=%s lon=%s", lat, lon)
        response = requests.post("http://overpass-api.de/api/interpreter", data={"data": query})

        # Check if we got a 200 OK before trying to parse JSON
        if response.status_code != 200:
            logger.warning("Overpass API returned status=%s: %s", response.status_code, response.text[:200])
            return None
            
        data = response.json()
        elements = data.get("elements", [])

        # Collect gyms and supermarkets with distance
        gyms_with_dist = []
        supermarkets_with_dist = []

        for el in elements:
            tags = el.get("tags", {})
            pos = _el_latlon(el, lat, lon)
            if not pos:
                continue
            dist_km = _haversine_km(lat, lon, pos[0], pos[1])
            name = tags.get("name") or tags.get("brand") or "Unnamed"

            if "leisure" in tags:
                gyms_with_dist.append({"name": name, "distance_km": round(dist_km, 2)})
            elif "shop" in tags:
                if name == "Unnamed":
                    continue
                supermarkets_with_dist.append({"name": name, "distance_km": round(dist_km, 2)})

        # Sort by distance and take top 3
        gyms_with_dist.sort(key=lambda x: x["distance_km"])
        supermarkets_with_dist.sort(key=lambda x: x["distance_km"])
        top_gyms = gyms_with_dist[:3]
        top_supermarkets = supermarkets_with_dist[:3]
        logger.info("API RETURN: Overpass completed gyms=%d supermarkets=%d restaurants=%d transit=%d",
                    len(gyms_with_dist), len(supermarkets_with_dist),
                    sum(1 for el in elements if el.get("tags", {}).get("amenity") == "restaurant"),
                    sum(1 for el in elements if "highway" in el.get("tags", {})))

        # Initialize counters and top-3 lists
        results = {
            "gyms": len(gyms_with_dist),
            "supermarkets": len(supermarkets_with_dist),
            "restaurants": sum(1 for el in elements if el.get("tags", {}).get("amenity") == "restaurant"),
            "transit_score": sum(1 for el in elements if "highway" in el.get("tags", {})),
            "crime_score": get_crime_score(lat, lon),
            "nearest_gyms": top_gyms,
            "nearest_supermarkets": top_supermarkets,
        }

        return results

    except Exception as e:
        logger.warning("API ERROR: Overpass request failed: %s", e)
        return None


def get_crime_score(lat, lon):
    # placeholder logic
    return random.uniform(0.3, 0.8)


if __name__ == "__main__":
    print(analyze_nearby(40.49505782194983, -74.45620979016748))