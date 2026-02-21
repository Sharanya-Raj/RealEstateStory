from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict
from market_fairness.schema import MarketFairnessInput, MarketFairnessOutput
from market_fairness.handler import run_market_fairness_agent
from agents.kamaji import aggregate_insights
import sys
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Ensure the backend directory is in the python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

app = FastAPI(title="Market Fairness API")

# Configure CORS so the frontend can call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        # Translate frontend field names to backend field names
        backend_data = _translate_frontend_to_backend(request.mock_data)
        print(f"\n{'='*60}")
        print(f"[EVALUATE] Received listing: {backend_data.get('id', '?')}")
        print(f"[EVALUATE] base_rent={backend_data.get('base_rent')}, walk_score={backend_data.get('walk_score')}, crime_rating={backend_data.get('crime_rating')}")
        print(f"[EVALUATE] OPENROUTER_API_KEY loaded: {bool(os.environ.get('OPENROUTER_API_KEY'))}")
        print(f"{'='*60}")
        # Pass the translated data to Kamaji along with the budget target
        result = aggregate_insights(backend_data, request.budget, request.college)
        print(f"[EVALUATE] Result keys: {list(result.keys())}")
        print(f"[EVALUATE] commute.llm_insight: '{result.get('commute', {}).get('llm_insight', 'MISSING')}'")
        print(f"[EVALUATE] budgetInsight: '{result.get('budgetInsight', 'MISSING')}'")
        print(f"[EVALUATE] historicalInsight: '{result.get('historicalInsight', 'MISSING')}'")
        return result
    except Exception as e:
        # If orchestration fails, return an error block so frontend falls back
        print(f"[EVALUATE] ERROR: {e}")
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
        "distanceMiles": round(random.uniform(0.5, 5.0), 1),
        "commuteMinutes": int(row["transit_time_to_hub"]) if pd.notna(row["transit_time_to_hub"]) else 15,
        "rating": round(random.uniform(3.5, 5.0), 1),
        "imageGradient": gradient,
        "landlord": f"{city} Property Management",
        "yearBuilt": random.randint(1970, 2023),
        "parkingIncluded": float(row["parking_fee"]) == 0,
        "utilitiesIncluded": float(row["avg_utilities"]) == 0,
        "petFriendly": row["pet_friendly"] in [True, "True", 1, "1"],
        "leaseTermMonths": 12,
        "securityDeposit": float(row["base_rent"]),
        "moveInDate": "2025-08-01",
        "zillowEstimate": max(500, float(row["base_rent"]) + random.randint(-150, 100)),
        "crimeScore": int(row["crime_rating"]) if pd.notna(row["crime_rating"]) else 7,
        "walkScore": int(row["walk_score"]) if pd.notna(row["walk_score"]) else 70,
        "nearbyGrocery": "Local Grocery (0.5 mi)" if row["has_grocery_nearby"] in [True, "True", 1, "1"] else "Supermarket (1.5 mi)",
        "nearbyGym": "On-site Gym" if row["has_gym"] in [True, "True", 1, "1"] else "Local Gym (1.0 mi)",
        "hiddenCosts": hidden_costs,
    }

def _map_supabase_to_listing(row: dict) -> dict:
    """Convert a Supabase row to the frontend Listing shape."""
    gradients = [
        "from-ghibli-meadow/40 to-ghibli-sky/40",
        "from-ghibli-pink/40 to-ghibli-amber/40",
        "from-ghibli-sky/40 to-ghibli-meadow/40",
        "from-ghibli-amber/40 to-ghibli-pink/40",
    ]
    gradient = gradients[hash(str(row.get("id", ""))) % len(gradients)]
    price = float(row.get("price") or 0)
    amenities = row.get("amenities") or []

    hidden_costs = []
    return {
        "id": str(row["id"]),
        "address": row.get("address", ""),
        "city": row.get("city", ""),
        "state": row.get("state", "NJ"),
        "zip": row.get("zip", ""),
        "price": price,
        "bedrooms": row.get("bedrooms", 1),
        "bathrooms": row.get("bathrooms", 1),
        "sqft": row.get("sqft") or 800,
        "description": row.get("description", ""),
        "shortDesc": f"Apartment in {row.get('city', 'NJ')}",
        "amenities": amenities if isinstance(amenities, list) else [],
        "distanceMiles": round(random.uniform(0.5, 5.0), 1),
        "commuteMinutes": random.randint(5, 30),
        "rating": round(random.uniform(3.5, 5.0), 1),
        "imageGradient": gradient,
        "landlord": f"{row.get('city', 'NJ')} Property Management",
        "yearBuilt": random.randint(1970, 2023),
        "parkingIncluded": False,
        "utilitiesIncluded": False,
        "petFriendly": row.get("pet_friendly", False),
        "leaseTermMonths": 12,
        "securityDeposit": price,
        "moveInDate": "2025-08-01",
        "zillowEstimate": max(500, price + random.randint(-150, 100)) if price else 1200,
        "crimeScore": 7,
        "walkScore": 70,
        "nearbyGrocery": "Local Grocery (0.5 mi)",
        "nearbyGym": "On-site Gym" if row.get("has_gym") else "Local Gym (1.0 mi)",
        "hiddenCosts": hidden_costs,
    }

@app.get("/api/listings")
def get_all_listings(college: str = None, radius: float = 10.0, max_price: float = 99999):
    """
    Get listings. If Supabase is configured and college is provided, uses geo-radius query.
    Otherwise falls back to CSV.
    """
    # Try Supabase first
    supabase_url = os.environ.get("SUPABASE_URL")
    if supabase_url:
        try:
            from db import get_college_coords, get_nearby_listings, get_all_listings as db_get_all

            if college:
                coords = get_college_coords(college)
                if coords:
                    rows = get_nearby_listings(coords[0], coords[1], radius_miles=radius, max_price=max_price)
                    return [_map_supabase_to_listing(r) for r in rows]

            # No college filter — return all
            rows = db_get_all(limit=100)
            return [_map_supabase_to_listing(r) for r in rows]
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
def get_listing(listing_id: str):
    # Try Supabase first
    supabase_url = os.environ.get("SUPABASE_URL")
    if supabase_url:
        try:
            from db import get_listing_by_id
            row = get_listing_by_id(listing_id)
            if row:
                return _map_supabase_to_listing(row)
        except Exception as e:
            print(f"[LISTING] Supabase error, falling back to CSV: {e}")

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

class ChatRequest(BaseModel):
    listing_id: str
    question: str
    listing_context: Dict[str, Any] = {}

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
