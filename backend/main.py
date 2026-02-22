from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import io
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
import math
import sys
import os
import json
import re
import pandas as pd
import random
from dotenv import load_dotenv
from fastmcp import FastMCP

# Define available Ghibli-style house images
IMAGE_ASSETS = [
    "/assets/houses/meadow.png",
    "/assets/houses/urban.png",
    "/assets/houses/forest.png",
    "/assets/houses/seaside.png",
    "/assets/houses/rainy.png",
    "/assets/houses/snowy.png",
]

from market_fairness.schema import MarketFairnessInput, MarketFairnessOutput
from market_fairness.handler import run_market_fairness_agent
from agents.kamaji import aggregate_insights, aggregate_insights_batch
from agents.neighborhood_agent import analyze_nearby
try:
    from services.apartmentsdotcom import get_apartmentsdotcom
except ImportError:
    print("[WARNING] Scraper dependencies missing. Real Mode (Scraper) will be unavailable.")
    get_apartmentsdotcom = None

from services.geolocate import get_coordinates
from data_loader import get_listings
from services.voice_service import generate_voice

# Load environment variables from .env file
load_dotenv()

# Load environment variables from .env file
load_dotenv()

# Ensure the backend directory is in the python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

app = FastAPI(title="The Spirited Oracle API")
mcp = FastMCP("GhibliNest")

# Configure CORS so the frontend can call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MCP Tool Schemas ---

class LocationCoords(BaseModel):
    latitude: float = Field(description="Latitude of the apartment or location (e.g. 40.495)")
    longitude: float = Field(description="Longitude of the apartment or location (e.g. -74.456)")
    address: Optional[str] = Field(default=None, description="Optional: if provided, geocode this address and use its coordinates instead of lat/lon.")

class ListingQuery(BaseModel):
    address: str = Field(description="The address to search for (e.g., '123 Main St, Edison NJ'). In our mock dataset, we will try to match the city or zip.")
    budget: float = Field(default=1500.0, description="The user's monthly budget for the rental.")
    mock_data: Optional[dict] = Field(default=None, description="Optional payload containing frontend mock data to analyze directly.")
    mock: bool = False

# --- MCP Tools (Ported from server.py) ---

@mcp.tool()
def get_neighborhood_insights(coords: LocationCoords) -> str:
    """
    Analyzes the surrounding area of a location by latitude and longitude (or by address).
    Returns nearby amenities and safety score.
    """
    lat, lon = coords.latitude, coords.longitude
    if coords.address:
        try:
            geo = get_coordinates(coords.address)
            if isinstance(geo, dict) and geo.get("latitude") and geo.get("longitude"):
                lat = float(geo["latitude"])
                lon = float(geo["longitude"])
        except Exception as e:
            return json.dumps({"error": f"Geocoding failed for address: {e}"})
    result = analyze_nearby(lat, lon)
    if result is None:
        return json.dumps({"error": "Neighborhood analysis failed."})
    return json.dumps(result, indent=2)

@mcp.tool()
def search_and_analyze_property(query: ListingQuery) -> str:
    """
    Triggers the Ghibli Nest agentic pipeline.
    It takes an address, finds the closest listings, and runs all Ghibli agents.
    """
    df = get_listings()
    matched_listings = []
    
    use_scraper = os.environ.get("USE_APARTMENTS_COM", "1").lower() in ("1", "true", "yes")
    use_mock = query.mock or os.environ.get("USE_MOCK_DATA", "0").lower() in ("1", "true", "yes")
    
    if use_scraper and not use_mock:
        if get_apartmentsdotcom is None:
            print("[INFO] Scraper is disabled because dependencies are missing.")
        else:
            try:
                real_apts = get_apartmentsdotcom(query.address, max_price=query.budget)
                if real_apts:
                    for i, apt in enumerate(real_apts):
                        # Mapping logic consolidated from server.py
                        price_str = re.sub(r"[^\d]", "", apt.price or "")
                        base_rent = int(price_str) if price_str else 1500
                        addr_str = apt.address or ""
                        zip_match = re.search(r"\b\d{5}(?:-\d{4})?\b", addr_str)
                        zipcode = zip_match.group(0)[:5] if zip_match else "00000"
                        
                        # More robust city/state parsing: "Address, City, ST ZIP"
                        city = "Unknown"
                        state = "NJ"
                        city_state_match = re.search(r",\s*([^,]+),\s*([A-Z]{2})\b", addr_str)
                        if city_state_match:
                            city = city_state_match.group(1).strip()
                            state = city_state_match.group(2).strip()
                        
                        matched_listings.append({
                            "id": f"apt_real_{i + 1}",
                            "name": apt.name,
                            "address": apt.address,
                            "city": city,
                            "state": state,
                            "zip": zipcode,
                            "base_rent": base_rent,
                            "bedrooms": apt.bedrooms,
                            "bathrooms": 1,
                            "sqft": 800,
                            "pet_friendly": "pet" in (getattr(apt, 'amenities', []) or []),
                            "has_gym": "gym" in (getattr(apt, 'amenities', []) or []),
                            "avg_utilities": 120,
                            "description": f"Property from {apt.source}: {apt.name}",
                            "latitude": getattr(apt, "latitude", None),
                            "longitude": getattr(apt, "longitude", None),
                            "image_url": IMAGE_ASSETS[i % len(IMAGE_ASSETS)]
                        })
            except Exception:
                pass

    # Fallback to CSV if no listings found
    if not matched_listings:
        if not df.empty:
            possible_matches = df[df["base_rent"] <= query.budget]
            if not possible_matches.empty:
                # Use a sample for MCP tool simplicity
                matched_listings = [possible_matches.sample(1).iloc[0].to_dict()]
    
    if not matched_listings:
        return json.dumps({"error": "No listings available."})

    use_batch = len(matched_listings) > 1
    if use_batch:
        all_insights = aggregate_insights_batch(matched_listings, query.budget, college=query.address)
        results = [{"listing": m, "insights": ins} for m, ins in zip(matched_listings, all_insights)]
    else:
        results = [{"listing": matched_listings[0], "insights": aggregate_insights(matched_listings[0], query.budget, college=query.address)}]
    
    return json.dumps({"total_analyzed": len(results), "listings": results}, indent=2)

# --- FastAPI Endpoints ---

@app.post("/api/fairness", response_model=MarketFairnessOutput)
def evaluate_market_fairness(input_data: MarketFairnessInput):
    try:
        # Run our deterministic agent
        result = run_market_fairness_agent(input_data)
        
        # If the explanation contains an error because the zip code wasn't found,
        # return a 404 with the explanation. (Returning 200 with the error is also an option
        # depending on how you'd like the frontend to handle it).
        if "error" in result.explanation:
             raise HTTPException(status_code=404, detail=result.explanation["error"])
             
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class EvaluateRequest(BaseModel):
    address: str
    budget: float
    mock_data: Dict[str, Any]
    college: str = ""
    mock: bool = False

def _translate_frontend_to_backend(frontend_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    The frontend sends listing data using camelCase field names (e.g. 'price', 'walkScore'),
    but the backend agents expect the original CSV snake_case names (e.g. 'base_rent', 'walk_score').
    This function bridges that gap so the agents get real data instead of defaults.
    """
    # Start with a copy of the original data (preserves any fields that already match)
    backend = dict(frontend_data)
    
    # Map frontend → backend field names
    field_map = {
        "price": "base_rent",
        "walkScore": "walk_score",
        "crimeScore": "crime_rating",
        "commuteMinutes": "transit_time_to_hub",
        "petFriendly": "pet_friendly",
    }
    
    for frontend_key, backend_key in field_map.items():
        if frontend_key in frontend_data and backend_key not in frontend_data:
            backend[backend_key] = frontend_data[frontend_key]
    
    # Extract hidden costs into flat fee fields if not already present
    hidden_costs = frontend_data.get("hiddenCosts", [])
    if hidden_costs and "parking_fee" not in backend:
        for cost in hidden_costs:
            name = cost.get("name", "").lower()
            amount = cost.get("amount", 0)
            if "parking" in name:
                backend.setdefault("parking_fee", amount)
            elif "amenity" in name:
                backend.setdefault("amenity_fee", amount)
            elif "utilit" in name:
                backend.setdefault("avg_utilities", amount)
    
    # Ensure critical fields have sensible defaults
    backend.setdefault("parking_fee", 0)
    backend.setdefault("amenity_fee", 0)
    backend.setdefault("avg_utilities", 0)
    backend.setdefault("base_rent", frontend_data.get("price", 1500))
    backend.setdefault("walk_score", 50)
    backend.setdefault("crime_rating", 5)
    backend.setdefault("transit_time_to_hub", 20)
    backend.setdefault("has_gym", False)
    backend.setdefault("has_grocery_nearby", False)
    backend.setdefault("pet_friendly", False)
    backend.setdefault("description", "")
    backend.setdefault("bedrooms", 1)
    backend.setdefault("bathrooms", 1)
    backend.setdefault("sqft", 800)
    
    return backend

@app.post("/api/evaluate")
def evaluate_listing(request: EvaluateRequest):
    try:
        backend_data = _translate_frontend_to_backend(request.mock_data)
        result = aggregate_insights(backend_data, request.budget, request.college)
        return result
    except Exception as e:
        import traceback; traceback.print_exc()
        return {"error": str(e)}

class BatchEvaluateRequest(BaseModel):
    listings: list
    budget: float
    college: str = ""

@app.post("/api/evaluate-batch")
def evaluate_batch(request: BatchEvaluateRequest):
    """Batch evaluation: runs all agents with 1 geocode, 1 OSRM, 1 Overpass, 1 LLM call."""
    try:
        translated = [_translate_frontend_to_backend(l) for l in request.listings]
        results = aggregate_insights_batch(translated, request.budget, request.college)
        return results
    except Exception as e:
        import traceback; traceback.print_exc()
        return {"error": str(e)}

import pandas as pd
import random

def _map_row_to_listing(row) -> dict:
    hidden_costs = []
    if float(row["parking_fee"]) > 0:
        hidden_costs.append({"name": "Parking Fee", "amount": float(row["parking_fee"])})
    if float(row["amenity_fee"]) > 0:
        hidden_costs.append({"name": "Amenity Fee", "amount": float(row["amenity_fee"])})
    if float(row["avg_utilities"]) > 0:
        hidden_costs.append({"name": "Utilities (avg)", "amount": float(row["avg_utilities"])})

    amenities = []
    if row["has_gym"] in [True, "True", 1, "1"]:
        amenities.append("Gym/Fitness Center")
    if row["has_grocery_nearby"] in [True, "True", 1, "1"]:
        amenities.append("Near Grocery")
    amenities.extend(["Heating", "Air Conditioning"])
    
    gradients = [
        "from-ghibli-meadow/40 to-ghibli-sky/40",
        "from-ghibli-pink/40 to-ghibli-amber/40",
        "from-ghibli-sky/40 to-ghibli-meadow/40",
        "from-ghibli-amber/40 to-ghibli-pink/40",
        "from-ghibli-meadow/30 to-ghibli-pink/30",
        "from-ghibli-sky/30 to-ghibli-amber/30",
    ]
    city = str(row["city"])
    # Seed gradient by id length so it's somewhat stable
    gradient = gradients[hash(str(row["id"])) % len(gradients)]

    return {
        "id": str(row["id"]),
        "address": str(row["address"]),
        "city": city,
        "state": str(row["state"]),
        "zip": str(row["zip"]),
        "price": float(row["base_rent"]),
        "bedrooms": int(row["bedrooms"]),
        "bathrooms": float(row["bathrooms"]),
        "sqft": int(row["sqft"]),
        "description": str(row["description"]),
        "shortDesc": f"Apartment in {city}",
        "amenities": amenities,
        # Approximate distance
        "distanceMiles": row.get("distance_miles") if pd.notna(row.get("distance_miles")) else 2.0,
        "commuteMinutes": int(row["transit_time_to_hub"]) if pd.notna(row["transit_time_to_hub"]) else 15,
        "rating": row.get("rating") if pd.notna(row.get("rating")) else 4.0,
        "imageGradient": gradient,
        "landlord": f"{city} Property Management",
        "yearBuilt": int(row["year_built"]) if pd.notna(row.get("year_built")) else 2000,
        "parkingIncluded": float(row["parking_fee"]) == 0,
        "utilitiesIncluded": float(row["avg_utilities"]) == 0,
        "petFriendly": row["pet_friendly"] in [True, "True", 1, "1"],
        "leaseTermMonths": 12,
        "securityDeposit": float(row["base_rent"]),
        "moveInDate": "2025-08-01",
        "zillowEstimate": float(row.get("zillow_estimate")) if pd.notna(row.get("zillow_estimate")) else float(row["base_rent"]),
        "crimeScore": int(row["crime_rating"]) if pd.notna(row["crime_rating"]) else 7,
        "walkScore": int(row["walk_score"]) if pd.notna(row["walk_score"]) else 70,
        "nearbyGrocery": "Local Grocery (0.5 mi)" if row["has_grocery_nearby"] in [True, "True", 1, "1"] else "Supermarket (1.5 mi)",
        "nearbyGym": "On-site Gym" if row["has_gym"] in [True, "True", 1, "1"] else "Local Gym (1.0 mi)",
        "hiddenCosts": hidden_costs,
        "imageUrl": row.get("image_url") or IMAGE_ASSETS[hash(str(row["id"])) % len(IMAGE_ASSETS)],
    }

def _haversine_miles(lat1, lon1, lat2, lon2):
    """Haversine distance in miles between two lat/lon points."""
    R = 3958.8  # Earth radius in miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def _map_supabase_to_listing(row: dict, college_coords: tuple = None) -> dict:
    """Convert a Supabase row to the frontend Listing shape."""
    gradients = [
        "from-ghibli-meadow/40 to-ghibli-sky/40",
        "from-ghibli-pink/40 to-ghibli-amber/40",
        "from-ghibli-sky/40 to-ghibli-meadow/40",
        "from-ghibli-amber/40 to-ghibli-pink/40",
    ]
    # Deterministic seed per listing so values don't change on each call
    id_str = str(row.get("id", ""))
    rng = random.Random(hash(id_str))
    gradient = gradients[hash(id_str) % len(gradients)]
    price = float(row.get("price") or 0)
    amenities = row.get("amenities") or []

    # Compute real distance from listing coords to college
    lat = float(row.get("latitude") or 0)
    lon = float(row.get("longitude") or 0)
    if college_coords and lat and lon:
        dist = round(_haversine_miles(lat, lon, college_coords[0], college_coords[1]), 1)
        commute_mins = max(5, int(dist * 2.5))  # ~2.5 min per mile avg driving
    else:
        dist = round(rng.uniform(0.5, 5.0), 1)
        commute_mins = rng.randint(5, 30)

    # Estimate hidden costs from Supabase data
    hidden_costs = []
    sqft = row.get("sqft") or 800
    est_utils = round(min(max(60 + int(sqft) * 0.09, 85), 210))
    hidden_costs.append({"name": "Utilities (est.)", "amount": est_utils})
    hidden_costs.append({"name": "Internet", "amount": 60})
    hidden_costs.append({"name": "Renter's Insurance", "amount": 18})
    if not row.get("has_gym"):
        hidden_costs.append({"name": "Gym Membership", "amount": 35})

    return {
        "id": id_str,
        "address": row.get("address", ""),
        "city": row.get("city", ""),
        "state": row.get("state", "NJ"),
        "zip": row.get("zip", ""),
        "price": price,
        "bedrooms": row.get("bedrooms", 1),
        "bathrooms": row.get("bathrooms", 1),
        "sqft": sqft,
        "description": row.get("description", ""),
        "shortDesc": f"Apartment in {row.get('city', 'NJ')}",
        "amenities": amenities if isinstance(amenities, list) else [],
        "distanceMiles": dist,
        "commuteMinutes": commute_mins,
        "rating": 4.5,
        "imageGradient": gradient,
        "landlord": f"{row.get('city', 'NJ')} Property Management",
        "yearBuilt": 2010,
        "parkingIncluded": False,
        "utilitiesIncluded": False,
        "petFriendly": row.get("pet_friendly", False),
        "leaseTermMonths": 12,
        "securityDeposit": price,
        "moveInDate": "2025-08-01",
        "zillowEstimate": price if price else 1200,
        "crimeScore": 7,
        "walkScore": 70,
        "nearbyGrocery": "Local Grocery (0.5 mi)",
        "nearbyGym": "On-site Gym" if row.get("has_gym") else "Local Gym (1.0 mi)",
        "hiddenCosts": hidden_costs,
        "imageUrl": IMAGE_ASSETS[hash(id_str) % len(IMAGE_ASSETS)],
    }

@app.get("/api/listings")
def get_all_listings(college: str = None, radius: float = 50.0, max_price: float = 99999, mock: bool = False):
    """
    Get listings. If Supabase is configured and college is provided, uses geo-radius query.
    Otherwise falls back to CSV.
    """
    # Try Supabase first (if not in mock mode)
    use_mock_env = os.environ.get("USE_MOCK_DATA", "0").lower() in ("1", "true", "yes")
    is_mock = mock or use_mock_env
    supabase_url = os.environ.get("SUPABASE_URL")
    if supabase_url and not is_mock:
        try:
            try:
                from db import get_college_coords, get_nearby_listings, get_all_listings as db_get_all
            except ImportError:
                print("[WARNING] Supabase dependencies missing. Real Mode (Database) will be unavailable.")
                raise Exception("Supabase not installed")

            college_coords = None
            if college:
                college_coords = get_college_coords(college)
                if college_coords:
                    rows = get_nearby_listings(college_coords[0], college_coords[1], radius_miles=radius, max_price=max_price)
                    return [_map_supabase_to_listing(r, college_coords) for r in rows]

            # No college filter — return all
            rows = db_get_all(limit=100)
            return [_map_supabase_to_listing(r, college_coords) for r in rows]
        except Exception as e:
            print(f"[LISTINGS] Supabase error, falling back to CSV: {e}")

    # Fallback to CSV
    try:
        csv_path = os.path.join(os.path.dirname(__file__), "data", "listings.csv")
        df = pd.read_csv(csv_path)
        df = df.head(100)
        results = [_map_row_to_listing(row) for _, row in df.iterrows()]
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/listings/{listing_id}")
def get_listing(listing_id: str, mock: bool = False):
    # Try Supabase first (if not in mock mode)
    use_mock_env = os.environ.get("USE_MOCK_DATA", "0").lower() in ("1", "true", "yes")
    is_mock = mock or use_mock_env
    supabase_url = os.environ.get("SUPABASE_URL")
    if supabase_url and not is_mock:
        try:
            try:
                from db import get_listing_by_id
            except ImportError:
                print("[WARNING] Supabase dependencies missing. Real Mode (Database) will be unavailable.")
                raise Exception("Supabase not installed")
            row = get_listing_by_id(listing_id)
            if row:
                return _map_supabase_to_listing(row)
        except Exception as e:
            logger_msg = f"[LISTING] Supabase error, falling back to CSV: {e}"
            print(logger_msg)

    # Fallback to CSV
    try:
        csv_path = os.path.join(os.path.dirname(__file__), "data", "listings.csv")
        df = pd.read_csv(csv_path)
        df_filtered = df[df["id"] == listing_id]
        if len(df_filtered) == 0:
            raise HTTPException(status_code=404, detail="Listing not found")
        return _map_row_to_listing(df_filtered.iloc[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/tts")
def text_to_speech(text: str, agent: str = "default"):
    """
    Generates audio for the given text using ElevenLabs and streams it.
    """
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    
    audio_data = generate_voice(text, agent)
    if not audio_data:
        raise HTTPException(status_code=500, detail="Failed to generate voice")
    
    return StreamingResponse(io.BytesIO(audio_data), media_type="audio/mpeg")

class ChatRequest(BaseModel):
    listing_id: str
    question: str
    listing_context: Dict[str, Any] = {}
    mock: bool = False

@app.post("/api/chat")
def chat_with_howl(request: ChatRequest):
    """Chat endpoint — Howl answers questions about a specific listing using OpenRouter."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    
    ctx = request.listing_context
    listing_summary = f"""Property: {ctx.get('address', 'Unknown')}, {ctx.get('city', '')}, {ctx.get('state', '')} {ctx.get('zip', '')}
Price: ${ctx.get('price', '?')}/mo | Beds: {ctx.get('bedrooms', '?')} | Baths: {ctx.get('bathrooms', '?')} | Sqft: {ctx.get('sqft', '?')}
Walk Score: {ctx.get('walkScore', '?')}/100 | Safety: {ctx.get('crimeScore', '?')}/10 | Commute: {ctx.get('commuteMinutes', '?')} min
Parking: {'Included' if ctx.get('parkingIncluded') else 'Not included'} | Pets: {'Allowed' if ctx.get('petFriendly') else 'Not allowed'}
Utilities: {'Included' if ctx.get('utilitiesIncluded') else 'Not included'}
Amenities: {', '.join(ctx.get('amenities', []))}
Description: {ctx.get('description', 'N/A')}"""
    
    if not api_key:
        return {"response": f"I'd love to help, but my magic mirror is cloudy right now (API key not configured). Here's what I know: {listing_summary}"}
    
    try:
        import requests as req
        prompt = f"""You are Howl from Howl's Moving Castle — charming, dramatic, and knowledgeable about real estate. 
You are helping a college student evaluate a rental property. Be concise (2-3 sentences max), helpful, and stay in character.

Property details:
{listing_summary}

Student's question: {request.question}"""
        
        response = req.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "google/gemini-2.5-flash",
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=15
        )
        if response.ok:
            data = response.json()
            answer = data["choices"][0]["message"]["content"].strip().replace('"', '')
            return {"response": answer}
        else:
            return {"response": "My castle seems to be having engine trouble... try again in a moment!"}
    except Exception as e:
        print(f"Chat error: {e}")
        return {"response": "The fire demon ate my response! Please try again."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
