from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from market_fairness.schema import MarketFairnessInput, MarketFairnessOutput
from market_fairness.handler import run_market_fairness_agent
import sys
import os

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

@app.get("/api/listings")
def get_all_listings():
    try:
        csv_path = os.path.join(os.path.dirname(__file__), "data", "listings.csv")
        df = pd.read_csv(csv_path)
        # Process and return the first 100 to avoid huge payloads
        df = df.head(100)
        results = [_map_row_to_listing(row) for _, row in df.iterrows()]
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/listings/{listing_id}")
def get_listing(listing_id: str):
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
