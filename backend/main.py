from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import io
import logging
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
except ImportError as e:
    sys.stderr.write(f"[WARNING] Apartments.com scraper dependencies missing ({e}).\n")
    get_apartmentsdotcom = None

from services.geolocate import get_coordinates
from data_loader import get_listings
from services.voice_service import generate_voice

try:
    from db import listing_exists, insert_listing_from_agents, db_available
except ImportError:
    listing_exists = lambda a, n: False
    insert_listing_from_agents = lambda l, i=None, s="apartments.com": False
    db_available = lambda: False

# Load environment variables from .env file
load_dotenv()

# Ensure the backend directory is in the python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from log_config import setup_logging
setup_logging()

logger = logging.getLogger("api")
logger.info("Backend starting up...")

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

import time as _time

@app.middleware("http")
async def log_requests(request, call_next):
    start = _time.perf_counter()
    method = request.method
    path = request.url.path
    qs = str(request.url.query)
    logger.info(">>> %s %s%s", method, path, f"?{qs}" if qs else "")
    response = await call_next(request)
    elapsed = (_time.perf_counter() - start) * 1000
    logger.info("<<< %s %s  %d  (%.0fms)", method, path, response.status_code, elapsed)
    return response

# --- MCP Tool Schemas ---

class LocationCoords(BaseModel):
    latitude: float = Field(description="Latitude of the apartment or location (e.g. 40.495)")
    longitude: float = Field(description="Longitude of the apartment or location (e.g. -74.456)")
    address: Optional[str] = Field(default=None, description="Optional: if provided, geocode this address and use its coordinates instead of lat/lon.")

class ListingQuery(BaseModel):
    address: str = Field(description="The address to search for (e.g., '123 Main St, Edison NJ'). In our mock dataset, we will try to match the city or zip.")
    budget: float = Field(default=1500.0, description="Max monthly budget (upper end of budget range).")
    mock_data: Optional[dict] = Field(default=None, description="Optional payload containing frontend mock data to analyze directly.")
    mock: bool = False
    # User preference filters
    roommates: str = Field(default="solo", description="Roommate preference: 'solo' (1 bed), '1+' (2 beds), '2+' (3+ beds).")
    parking: str = Field(default="not_needed", description="Parking requirement: 'not_needed', '1', or '2'.")
    max_distance_miles: float = Field(default=30.0, description="Maximum distance to campus in miles.")


def _haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Straight-line distance between two lat/lon points in miles."""
    R = 3958.8
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    a = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))

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
    listings_from_scraper = False  # True if we got listings from Apartments.com scraper

    # --- Derive filters from user preferences ---
    _roommate_min_beds = {"solo": 1, "1+": 2, "2+": 3}
    min_beds = _roommate_min_beds.get(query.roommates, 1)
    require_parking = query.parking in ("1", "2")
    max_dist = query.max_distance_miles  # miles; 30 = no effective limit

    # Geocode college once for distance filtering
    _college_lat: float | None = None
    _college_lon: float | None = None
    try:
        _cgeo = get_coordinates(query.address)
        if isinstance(_cgeo, dict) and _cgeo.get("latitude") and _cgeo.get("longitude"):
            _college_lat = float(_cgeo["latitude"])
            _college_lon = float(_cgeo["longitude"])
    except Exception:
        pass

    use_scraper = os.environ.get("USE_APARTMENTS_COM", "1").lower() in ("1", "true", "yes")
    use_mock = query.mock or os.environ.get("USE_MOCK_DATA", "0").lower() in ("1", "true", "yes")

    if use_scraper and not use_mock:
        raw_apts = []

        if get_apartmentsdotcom is not None:
            try:
                sys.stderr.write(f"[INFO] Attempting Apartments.com scrape for {query.address!r}\n")
                raw_apts = get_apartmentsdotcom(
                    query.address,
                    max_price=query.budget,
                    min_beds=min_beds,
                    require_parking=require_parking,
                ) or []
                if raw_apts:
                    sys.stderr.write(f"[INFO] Apartments.com returned {len(raw_apts)} listings\n")
            except Exception as e:
                sys.stderr.write(f"[INFO] Apartments.com failed: {e}\n")
        else:
            sys.stderr.write("[INFO] Apartments.com scraper not available (dependencies missing).\n")

        if raw_apts:
            try:
                new_count = 0
                for i, apt in enumerate(raw_apts):
                    addr = apt.address or ""
                    name = apt.name or "Unknown"
                    # Skip if already in DB
                    if db_available() and listing_exists(addr, name):
                        continue
                    # Mapping logic consolidated from server.py
                    price_str = re.sub(r"[^\d]", "", apt.price or "")
                    base_rent = int(price_str) if price_str else 1500
                    zip_match = re.search(r"\b\d{5}(?:-\d{4})?\b", addr)
                    zipcode = zip_match.group(0)[:5] if zip_match else "00000"

                    city = "Unknown"
                    state = "NJ"
                    city_state_match = re.search(r",\s*([^,]+),\s*([A-Z]{2})\b", addr)
                    if city_state_match:
                        city = city_state_match.group(1).strip()
                        state = city_state_match.group(2).strip()

                    matched_listings.append({
                        "id": f"apt_real_{new_count + 1}",
                        "name": name,
                        "address": addr,
                        "city": city,
                        "state": state,
                        "zip": zipcode,
                        "base_rent": base_rent,
                        "bedrooms": apt.bedrooms,
                        "bathrooms": 1,
                        "sqft": 800,
                        "pet_friendly": "pet" in (getattr(apt, "amenities", []) or []),
                        "has_gym": "gym" in (getattr(apt, "amenities", []) or []),
                        "avg_utilities": 120,
                        "description": f"Property from {apt.source}: {apt.name}",
                        "latitude": getattr(apt, "latitude", None),
                        "longitude": getattr(apt, "longitude", None),
                        "image_url": IMAGE_ASSETS[new_count % len(IMAGE_ASSETS)],
                    })
                    new_count += 1

                # Distance filter: remove listings too far from campus
                if _college_lat and _college_lon and max_dist < 30:
                    before = len(matched_listings)
                    matched_listings = [
                        L for L in matched_listings
                        if (
                            L.get("latitude") and L.get("longitude")
                            and _haversine_miles(_college_lat, _college_lon, L["latitude"], L["longitude"]) <= max_dist
                        )
                    ]
                    removed = before - len(matched_listings)
                    if removed:
                        sys.stderr.write(f"[INFO] Distance filter removed {removed} listings beyond {max_dist} mi\n")

                listings_from_scraper = len(matched_listings) > 0

                # Cap before the expensive agent pipeline
                max_analyze = int(os.environ.get("MAX_SCRAPER_ANALYZE", "20"))
                if len(matched_listings) > max_analyze:
                    # Sort cheapest-first within budget, then take the cap
                    matched_listings.sort(key=lambda L: abs(L["base_rent"] - query.budget))
                    dropped = len(matched_listings) - max_analyze
                    matched_listings = matched_listings[:max_analyze]
                    sys.stderr.write(
                        f"[INFO] Capped scraper results: analyzing {max_analyze} of "
                        f"{max_analyze + dropped} listings (set MAX_SCRAPER_ANALYZE to change)\n"
                    )
            except Exception:
                pass

    # Fallback to CSV if no listings found
    max_csv_listings = int(os.environ.get("MAX_CSV_LISTINGS", "12"))
    if not matched_listings:
        if not df.empty:
            # Apply budget + bed filters to CSV (no distance — CSV rows have no lat/lon)
            possible_matches = df[
                (df["base_rent"] <= query.budget) &
                (df["bedrooms"] >= min_beds)
            ]
            if not possible_matches.empty:
                take_df = possible_matches.head(max_csv_listings)
                matched_listings = take_df.to_dict("records")
    
    if not matched_listings:
        return json.dumps({"error": "No listings available."})

    use_batch = len(matched_listings) > 1
    if use_batch:
        all_insights = aggregate_insights_batch(matched_listings, query.budget, college=query.address)
        results = [{"listing": m, "insights": ins} for m, ins in zip(matched_listings, all_insights)]
    else:
        results = [{"listing": matched_listings[0], "insights": aggregate_insights(matched_listings[0], query.budget, college=query.address)}]

    # Persist scraped listings to DB after running agents
    inserted = 0
    if listings_from_scraper and db_available():
        for item in results:
            listing = item.get("listing", {})
            insights = item.get("insights", {})
            if insert_listing_from_agents(listing, insights, source="apartments.com"):
                inserted += 1

    out = {
        "total_analyzed": len(results),
        "listings": results,
    }
    if listings_from_scraper and db_available():
        out["db_inserted"] = inserted
    return json.dumps(out, indent=2)


# ============================================================================================
# --- FastAPI Endpoints ---
# ============================================================================================

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

class PipelineRequest(BaseModel):
    college: str
    budget: float = 1500.0
    roommates: str = "solo"
    parking: str = "not_needed"
    max_distance_miles: float = 30.0
    mock: bool = False

@app.post("/api/pipeline")
def run_full_pipeline(request: PipelineRequest):
    """
    Single endpoint: scrape → run agents → return combined results.
    Listings are only returned after all agents have processed them.
    When mock=True, skips scraping/Supabase and reads only from CSV.
    """
    mode_label = "CSV-ONLY" if request.mock else "LIVE"
    logger.info(
        "POST /api/pipeline [%s]  college=%r  budget=%.0f  roommates=%s  parking=%s  dist=%.0f",
        mode_label, request.college, request.budget, request.roommates, request.parking, request.max_distance_miles,
    )

    # Step 1: Scrape / fetch listings
    logger.info("  [PIPELINE] Step 1: Fetching listings (%s)...", mode_label)
    raw_listings = get_all_listings(
        college=request.college,
        radius=request.max_distance_miles,
        max_price=request.budget,
        mock=request.mock,
    )

    if not raw_listings:
        logger.info("  [PIPELINE] No listings found.")
        return {"listings": [], "agentResults": []}

    logger.info("  [PIPELINE] Step 1 done: %d listings found", len(raw_listings))

    # Step 2: Run agents on all listings
    logger.info("  [PIPELINE] Step 2: Running agent analysis on %d listings...", len(raw_listings))
    translated = [_translate_frontend_to_backend(l) for l in raw_listings]
    agent_results = aggregate_insights_batch(translated, request.budget, request.college)
    logger.info("  [PIPELINE] Step 2 done: %d agent results", len(agent_results))

    # Step 3: Return combined result — listings are only surfaced NOW
    # Propagate distanceMiles updated by OSRM routing in aggregate_insights_batch
    for raw, trans in zip(raw_listings, translated):
        raw["distanceMiles"] = trans.get("distanceMiles", raw.get("distanceMiles", 2.0))

    logger.info("  [PIPELINE] Complete. Returning %d listings with agent data.", len(raw_listings))
    return {
        "listings": raw_listings,
        "agentResults": agent_results,
    }


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
    logger.info(
        "POST /api/evaluate  address=%r  budget=%.0f  college=%r",
        request.address, request.budget, request.college,
    )
    try:
        backend_data = _translate_frontend_to_backend(request.mock_data)
        logger.info("  -> Translated listing id=%s, rent=%s", backend_data.get("id"), backend_data.get("base_rent"))
        logger.info("  -> Running agent pipeline (commute, budget, fairness, neighborhood, hidden)...")
        result = aggregate_insights(backend_data, request.budget, request.college)
        logger.info(
            "  -> DONE  trueCost=$%s  matchScore=%s  walkScore=%s",
            result.get("trueCost"), result.get("matchScore"), result.get("walkScore"),
        )
        return result
    except Exception as e:
        logger.error("  -> FAILED: %s", e, exc_info=True)
        return {"error": str(e)}

class BatchEvaluateRequest(BaseModel):
    listings: list
    budget: float
    college: str = ""

@app.post("/api/evaluate-batch")
def evaluate_batch(request: BatchEvaluateRequest):
    """Batch evaluation: runs all agents with 1 geocode, 1 OSRM, 1 Overpass, 1 LLM call."""
    n = len(request.listings)
    logger.info(
        "POST /api/evaluate-batch  listings=%d  budget=%.0f  college=%r",
        n, request.budget, request.college,
    )
    try:
        logger.info("  -> Translating %d listings to backend format...", n)
        translated = [_translate_frontend_to_backend(l) for l in request.listings]
        for i, t in enumerate(translated[:5]):
            logger.debug("     [%d] id=%s  rent=%s  addr=%s", i, t.get("id"), t.get("base_rent"), (t.get("address") or "")[:60])
        if n > 5:
            logger.debug("     ... and %d more", n - 5)

        logger.info("  -> Running BATCH agent pipeline (geocode, OSRM, Overpass, LLM)...")
        results = aggregate_insights_batch(translated, request.budget, request.college)
        logger.info(
            "  -> BATCH DONE  returned=%d results  trueCosts=[%s]",
            len(results),
            ", ".join(f"${r.get('trueCost', '?')}" for r in results[:5]),
        )
        return results
    except Exception as e:
        logger.error("  -> BATCH FAILED: %s", e, exc_info=True)
        return {"error": str(e)}

import pandas as pd
import random


def _map_scraped_to_listing(apt, idx: int = 0, college_coords: tuple = None) -> dict:
    """Convert a scraped Apartment object to the frontend Listing shape."""
    # Parse price string "$1,500" → 1500.0
    price_str = re.sub(r"[^\d]", "", str(apt.price or "0"))
    price = float(price_str) if price_str else 1500.0

    address = apt.address or "New Jersey"

    # Extract city/zip from address (e.g. "123 Main St, Piscataway, NJ 08854")
    city_match = re.search(r",\s*([^,]+),\s*NJ\b", address, re.IGNORECASE)
    city = city_match.group(1).strip() if city_match else "New Jersey"
    zip_match = re.search(r"\b(\d{5})\b", address)
    zipcode = zip_match.group(1) if zip_match else "08901"

    # Real distance if we have both listing and college coordinates
    dist = 2.0
    commute_mins = 15
    apt_lat = getattr(apt, "latitude", None) or 0.0
    apt_lon = getattr(apt, "longitude", None) or 0.0
    if college_coords and apt_lat and apt_lon:
        dist = round(_haversine_miles(apt_lat, apt_lon, college_coords[0], college_coords[1]), 1)
        commute_mins = max(5, int(dist * 2.5))

    gradients = [
        "from-ghibli-meadow/40 to-ghibli-sky/40",
        "from-ghibli-pink/40 to-ghibli-amber/40",
        "from-ghibli-sky/40 to-ghibli-meadow/40",
        "from-ghibli-amber/40 to-ghibli-pink/40",
        "from-ghibli-meadow/30 to-ghibli-pink/30",
        "from-ghibli-sky/30 to-ghibli-amber/30",
    ]

    hidden_costs = [
        {"name": "Utilities (est.)", "amount": 120},
        {"name": "Internet", "amount": 60},
        {"name": "Renter's Insurance", "amount": 18},
    ]

    listing_id = f"apt_{idx}_{abs(hash(address)) % 9999:04d}"
    amenities = list(getattr(apt, "amenities", None) or []) + ["Heating", "Air Conditioning"]

    return {
        "id": listing_id,
        "address": address,
        "city": city,
        "state": "NJ",
        "zip": zipcode,
        "price": price,
        "bedrooms": max(1, int(getattr(apt, "bedrooms", None) or 1)),
        "bathrooms": 1,
        "sqft": 800,
        "description": f"Apartment in {city}, NJ. Listed on Apartments.com.",
        "shortDesc": f"Apartment in {city}",
        "amenities": amenities,
        "distanceMiles": dist,
        "commuteMinutes": commute_mins,
        "rating": 4.0,
        "imageGradient": gradients[idx % len(gradients)],
        "landlord": f"{city} Property Management",
        "yearBuilt": 2005,
        "parkingIncluded": False,
        "utilitiesIncluded": False,
        "petFriendly": False,
        "leaseTermMonths": 12,
        "securityDeposit": price,
        "moveInDate": "2025-09-01",
        "zillowEstimate": price,
        "crimeScore": 7,
        "walkScore": 65,
        "nearbyGrocery": "Local Grocery (est.)",
        "nearbyGym": "Local Gym (est.)",
        "hiddenCosts": hidden_costs,
        "imageUrl": IMAGE_ASSETS[idx % len(IMAGE_ASSETS)],
    }


def _map_row_to_listing(row) -> dict:
    hidden_costs = []
    if float(row["parking_fee"]) > 0:
        hidden_costs.append({"name": "Parking Fee", "amount": float(row["parking_fee"])})
    # amenity_fee is missing in the new listings.csv, removing it
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

_listings_logger = logging.getLogger("api.listings")

@app.get("/api/listings")
def get_all_listings(college: str = None, radius: float = 50.0, max_price: float = 99999, mock: bool = False):
    """
    Get listings.  Priority order (when mock=False):
      1. Apartments.com scraper  (Selenium + Playwright, or local cache)
      2. Supabase database
      3. CSV file  (LAST RESORT — only if all live sources fail)
    When mock=True, skips straight to CSV.
    """
    mode_label = "CSV-ONLY" if mock else "LIVE"
    logger.info(
        "GET /api/listings [%s]  college=%r  radius=%.1f  max_price=%.0f",
        mode_label, college, radius, max_price,
    )
    _listings_logger.info(
        "REQUEST [%s]: college=%r  radius=%.1f  max_price=%.0f",
        mode_label, college, radius, max_price,
    )

    # Geocode college once — reused by scrapers + CSV fallback
    college_coords = None
    if college:
        try:
            geo = get_coordinates(college)
            if isinstance(geo, dict) and geo.get("latitude"):
                college_coords = (float(geo["latitude"]), float(geo["longitude"]))
                _listings_logger.info("College geocoded: %s -> lat=%.4f lon=%.4f", college, *college_coords)
        except Exception as e:
            _listings_logger.warning("College geocoding failed for %r: %s", college, e)

    # ── 1. Apartments.com ──────────────────────────────────────────────
    if mock:
        _listings_logger.info("SCRAPER + DB SKIPPED — mock/CSV-only mode")
    elif college and get_apartmentsdotcom is not None:
        try:
            adc_max_price = max_price if max_price < 99999 else None
            _listings_logger.info("SCRAPER Apartments.com: scraping near %r (max_price=%s)", college, adc_max_price)
            apartments = get_apartmentsdotcom(college, max_price=adc_max_price)
            if apartments:
                # Geocode each apartment's real address (the scraper
                # assigns the college's coords as a placeholder)
                from services.geolocate import geocode_batch
                apt_addresses = [apt.address for apt in apartments]
                _listings_logger.info("GEOCODING %d apartment addresses...", len(apt_addresses))
                geocoded = geocode_batch(apt_addresses)
                _SAME_THRESH = 0.001  # ~100 m — treat same-as-college as placeholder
                for apt, geo in zip(apartments, geocoded):
                    lat = geo.get("latitude", 0)
                    lon = geo.get("longitude", 0)
                    # If geocoded back to the college itself, the apt address fell back
                    # to the college's display name — discard so we use the default distance.
                    if lat and lon and college_coords:
                        if (abs(lat - college_coords[0]) < _SAME_THRESH and
                                abs(lon - college_coords[1]) < _SAME_THRESH):
                            lat, lon = 0, 0
                    if lat and lon:
                        apt.latitude = float(lat)
                        apt.longitude = float(lon)
                    else:
                        apt.latitude = 0.0
                        apt.longitude = 0.0

                adc_results = []
                for i, apt in enumerate(apartments):
                    listing = _map_scraped_to_listing(apt, i, college_coords)
                    if listing["price"] <= max_price:
                        adc_results.append(listing)
                if adc_results:
                    _listings_logger.info("SCRAPER Apartments.com SUCCESS — returning %d listings", len(adc_results))
                    return adc_results[:50]
                _listings_logger.info("SCRAPER Apartments.com returned listings but none passed filters")
            else:
                _listings_logger.info("SCRAPER Apartments.com returned 0 listings")
        except Exception as e:
            _listings_logger.warning("SCRAPER Apartments.com FAILED: %s", e)
    elif get_apartmentsdotcom is None:
        _listings_logger.info("SCRAPER Apartments.com SKIPPED — dependencies not installed")
    else:
        _listings_logger.info("SCRAPER Apartments.com SKIPPED — no college provided")

    # ── 2. Supabase ────────────────────────────────────────────────────
    supabase_url = os.environ.get("SUPABASE_URL")
    if mock:
        pass  # already logged skip above
    elif supabase_url:
        try:
            try:
                from db import get_college_coords, get_nearby_listings, get_all_listings as db_get_all
            except ImportError:
                raise Exception("Supabase not installed")

            _listings_logger.info("DATABASE: Attempting Supabase lookup")
            if college:
                db_coords = get_college_coords(college)
                if db_coords:
                    rows = get_nearby_listings(db_coords[0], db_coords[1], radius_miles=radius, max_price=max_price)
                    _listings_logger.info("DATABASE: Supabase returned %d listings near %s", len(rows), college)
                    return [_map_supabase_to_listing(r, db_coords) for r in rows]

            rows = db_get_all(limit=100)
            _listings_logger.info("DATABASE: Supabase returned %d listings (no college filter)", len(rows))
            return [_map_supabase_to_listing(r, college_coords) for r in rows]
        except Exception as e:
            _listings_logger.warning("DATABASE: Supabase FAILED: %s", e)
    else:
        _listings_logger.info("DATABASE: Supabase SKIPPED — SUPABASE_URL not set")

    # ── 3. CSV FALLBACK ──────────────────────────────────────────────
    if mock:
        _listings_logger.info("CSV MODE: Loading listings from CSV (mock/CSV-only mode)")
    else:
        _listings_logger.warning("FALLBACK: All live sources failed. Loading CSV as last resort.")
    try:
        csv_path = os.path.join(os.path.dirname(__file__), "data", "listings.csv")
        df = pd.read_csv(csv_path)

        results = []
        for _, row in df.iterrows():
            listing = _map_row_to_listing(row)

            if college_coords and row.get("latitude") and row.get("longitude"):
                dist = _haversine_miles(
                    float(row["latitude"]), float(row["longitude"]),
                    college_coords[0], college_coords[1]
                )
                listing["distanceMiles"] = round(dist, 1)
                listing["commuteMinutes"] = max(5, int(dist * 2.5))

            if listing["price"] <= max_price:
                if not college_coords or listing["distanceMiles"] <= radius:
                    results.append(listing)

        if not results and not df.empty:
            results = [_map_row_to_listing(row) for _, row in df.head(5).iterrows()]

        _listings_logger.warning("FALLBACK: CSV returned %d listings", len(results))
        return results[:100]
    except Exception as e:
        _listings_logger.error("FALLBACK: CSV ALSO FAILED: %s", e)
        return []

@app.get("/api/listings/{listing_id}")
def get_listing(listing_id: str, mock: bool = False):
    logger.info("GET /api/listings/%s", listing_id)
    # Try Supabase first (if not in mock mode)
    use_mock_env = os.environ.get("USE_MOCK_DATA", "0").lower() in ("1", "true", "yes")
    is_mock = mock or use_mock_env
    supabase_url = os.environ.get("SUPABASE_URL")
    if supabase_url and not is_mock:
        try:
            try:
                from db import get_listing_by_id
            except ImportError:
                sys.stderr.write("[WARNING] Supabase dependencies missing. Real Mode (Database) will be unavailable.\n")
                raise Exception("Supabase not installed")
            row = get_listing_by_id(listing_id)
            if row:
                return _map_supabase_to_listing(row)
        except Exception as e:
            logger_msg = f"[LISTING] Supabase error, falling back to CSV: {e}"
            sys.stderr.write(logger_msg + "\n")

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
    
    return StreamingResponse(
        io.BytesIO(audio_data), 
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        }
    )

class ChatRequest(BaseModel):
    listing_id: str
    question: str
    listing_context: Dict[str, Any] = {}
    mock: bool = False

@app.post("/api/chat")
def chat_with_howl(request: ChatRequest):
    """Chat endpoint — Howl answers questions about a specific listing using the shared LLM client."""
    from llm_client import generate_text
    
    ctx = request.listing_context
    listing_summary = f"""Property: {ctx.get('address', 'Unknown')}, {ctx.get('city', '')}, {ctx.get('state', '')} {ctx.get('zip', '')}
Price: ${ctx.get('price', '?')}/mo | Beds: {ctx.get('bedrooms', '?')} | Baths: {ctx.get('bathrooms', '?')} | Sqft: {ctx.get('sqft', '?')}
Walk Score: {ctx.get('walkScore', '?')}/100 | Safety: {ctx.get('crimeScore', '?')}/10 | Commute: {ctx.get('commuteMinutes', '?')} min
Parking: {'Included' if ctx.get('parkingIncluded') else 'Not included'} | Pets: {'Allowed' if ctx.get('petFriendly') else 'Not allowed'}
Utilities: {'Included' if ctx.get('utilitiesIncluded') else 'Not included'}
Amenities: {', '.join(ctx.get('amenities', []))}
Description: {ctx.get('description', 'N/A')}"""
    
    # Check if any API key is available
    or_api_key = os.environ.get("OPENROUTER_API_KEY")
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not or_api_key and not gemini_api_key:
        return {"response": f"I'd love to help, but my magic mirror is cloudy right now (API keys not configured). Here's what I know: {listing_summary}"}
    
    try:
        prompt = f"""You are Howl from Howl's Moving Castle — charming, dramatic, and knowledgeable about real estate. 
You are helping a college student evaluate a rental property. Be concise (2-3 sentences max), helpful, and stay in character.

Property details:
{listing_summary}

Student's question: {request.question}"""

        # Use the shared LLM client which respects USE_OPENROUTER and has proper fallback logic
        answer = generate_text(prompt, model="gemini-2.5-flash")
        
        if answer:
            return {"response": answer.strip().replace('"', '')}
        else:
            return {"response": "My castle seems to be having engine trouble... try again in a moment!"}
            
    except Exception as e:
        sys.stderr.write(f"Chat error: {e}\n")
        return {"response": "The fire demon ate my response! Please try again."}

if __name__ == "__main__":
    import uvicorn
    reload = os.environ.get("RELOAD", "0").lower() in ("1", "true", "yes")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=reload, log_level="info")
