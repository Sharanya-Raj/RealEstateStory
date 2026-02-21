# backend/server.py
import json
import logging
import os
import random
import re
from typing import Optional

from fastmcp import FastMCP
from pydantic import BaseModel, Field

from data_loader import get_listings
from agents.kamaji import aggregate_insights
from agents.neighborhood_agent import analyze_nearby
from log_config import setup_logging
from services.apartmentsdotcom import get_apartmentsdotcom
from services.geolocate import get_coordinates

setup_logging()
logger = logging.getLogger("mcp.server")

# Initialize FastMCP server
mcp = FastMCP("GhibliNest")


class LocationCoords(BaseModel):
    latitude: float = Field(description="Latitude of the apartment or location (e.g. 40.495)")
    longitude: float = Field(description="Longitude of the apartment or location (e.g. -74.456)")
    address: Optional[str] = Field(default=None, description="Optional: if provided, geocode this address and use its coordinates instead of lat/lon.")


class ListingQuery(BaseModel):
    address: str = Field(description="The address to search for (e.g., '123 Main St, Edison NJ'). In our mock dataset, we will try to match the city or zip.")
    budget: float = Field(default=1500.0, description="The user's monthly budget for the rental.")
    mock_data: Optional[dict] = Field(default=None, description="Optional payload containing frontend mock data to analyze directly.")


@mcp.tool()
def get_neighborhood_insights(coords: LocationCoords) -> str:
    """
    Analyzes the surrounding area of a location by latitude and longitude (or by address).
    Returns nearby amenities: top 3 closest gyms, top 3 closest supermarkets, restaurant count,
    transit options, and a crime/safety score. Use this when you have the lat/lon of an apartment
    and need to understand the neighborhood (walkability, groceries, fitness, transit access).
    If 'address' is provided, it will be geocoded first and those coordinates used.
    """
    logger.info("MCP TOOL CALLED: get_neighborhood_insights(coords=%s)", coords.model_dump())
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
        logger.warning("get_neighborhood_insights: Overpass API returned no data")
        return json.dumps({"error": "Neighborhood analysis failed (Overpass API unavailable or timeout)."})
    logger.info("MCP TOOL get_neighborhood_insights completed successfully")
    return json.dumps(result, indent=2)


@mcp.tool()
def search_and_analyze_property(query: ListingQuery) -> str:
    """
    Triggers the Ghibli Nest agentic pipeline.
    It takes an address, finds the closest mock listing, and runs all 6 Ghibli agents (Conductor, Lin, Baron, Kiki, Soot Sprite, and Kamaji) on it.
    Returns the comprehensive aggregated insights.
    """
    logger.info("MCP TOOL CALLED: search_and_analyze_property(address=%r, budget=%s)", query.address, query.budget)
    df = get_listings()
    matched_listing = None

    # 0. Check if the frontend passed in explicit mock data directly from Figma UI
    # if query.mock_data:
    #     # Convert frontend listing shape to backend expected shape
    #     md = query.mock_data
    #     matched_listing = {
    #         "id": md.get("id", "figma_1"),
    #         "name": md.get("address", "Figma Listing"),
    #         "address": md.get("address", query.address),
    #         "city": md.get("city", "Unknown"),
    #         "state": md.get("state", "NJ"),
    #         "zip": md.get("zip", "00000"),
    #         "base_rent": md.get("price", 1500),
    #         "bedrooms": md.get("bedrooms", 1),
    #         "bathrooms": md.get("bathrooms", 1),
    #         "sqft": md.get("sqft", 800),
    #         "pet_friendly": md.get("petFriendly", False),
    #         "description": md.get("description", "A magical listing.")
    #     }
    
    # 1. Try fetching real data via Apartments.com scraper (requires Chrome/Selenium)
    use_scraper = os.environ.get("USE_APARTMENTS_COM", "1").lower() in ("1", "true", "yes")
    logger.info("Apartments.com scraper mode: %s", "enabled" if use_scraper else "disabled (set USE_APARTMENTS_COM=1 to enable)")
    if not matched_listing and use_scraper:
        try:
            logger.info("API: calling get_apartmentsdotcom for address=%r", query.address)
            real_apts = get_apartmentsdotcom(query.address)
            if real_apts:
                apt = real_apts[0]
                # Clean price string like "$1,200" or "N/A"
                price_str = re.sub(r'[^\d]', '', apt.price or "")
                base_rent = int(price_str) if price_str else 1500
    
                # Extract zipcode from address for fairness module
                zip_match = re.search(r'\b\d{5}\b', apt.address or "")
                zipcode = zip_match.group(0) if zip_match else "00000"
    
            # Get city/state from geolocate (apartmentsdotcom uses it internally but doesn't return it)
            city, state = "Unknown", "Unknown"
            try:
                logger.info("API: calling get_coordinates (Nominatim) for address=%r", query.address)
                geo = get_coordinates(query.address)
                if isinstance(geo, dict) and geo.get("latitude"):
                    city = geo.get("city", "") or "Unknown"
                    state = geo.get("state", "nj").upper()
                    if zipcode == "00000" and geo.get("zipcode"):
                        zipcode = str(geo.get("zipcode", "")) or "00000"
            except Exception:
                pass

            # Infer pet_friendly and has_gym from amenities
            amenity_list = getattr(apt, "amenities", None) or []
            amenity_str = " ".join(str(a).lower() for a in amenity_list)
            pet_friendly = any(
                x in amenity_str for x in ("pet", "dog", "cat", "cats allowed", "dogs allowed")
            )
            has_gym = any(
                x in amenity_str for x in ("gym", "fitness", "exercise")
            )

            desc_parts = [f"Property found on {apt.source}: {apt.name}."]
            if amenity_list:
                desc_parts.append(f"Amenities: {', '.join(amenity_list)}.")

            matched_listing = {
                "id": "apt_real_1",
                "name": apt.name,
                "address": apt.address,
                "city": city,
                "state": state,
                "zip": zipcode,
                "base_rent": base_rent,
                "bedrooms": apt.bedrooms,
                "bathrooms": 1,
                "sqft": 800,
                "pet_friendly": pet_friendly,
                "has_gym": has_gym,
                "avg_utilities": 120,
                "latitude": getattr(apt, "latitude", None),
                "longitude": getattr(apt, "longitude", None),
                "description": " ".join(desc_parts),
            }
        except Exception as e:
            logger.warning("Apartments.com scraper failed (set USE_APARTMENTS_COM=0 to skip): %s", e)

    # 2. Fallback to CSV data if Apartments.com skipped, failed, or returned empty
    # if not matched_listing:
    #     logger.info("Apartments.com returned no listings, using CSV fallback for university=%r", query.address)
    #     if not df.empty:
    #         query_lower = query.address.lower()
    #         possible_matches = df[df['city'].str.lower().apply(lambda x: x in query_lower)]
            
    #         if not possible_matches.empty:
    #             matched_listing = possible_matches.sample(1).iloc[0].to_dict()
    #         else:
    #             matched_listing = df.sample(1).iloc[0].to_dict()

    #         # Geocode the university so neighborhood agent can use Overpass API
    #         try:
    #             geo = get_coordinates(query.address)
    #             if isinstance(geo, dict) and geo.get("latitude") and geo.get("longitude"):
    #                 matched_listing["latitude"] = float(geo["latitude"])
    #                 matched_listing["longitude"] = float(geo["longitude"])
    #                 logger.info("Geocoded university for Overpass: lat=%.4f lon=%.4f", matched_listing["latitude"], matched_listing["longitude"])
    #         except Exception as geo_err:
    #             logger.warning("Could not geocode university for Overpass: %s", geo_err)
            
    if not matched_listing:
        logger.error("No listings found (mock or real)")
        return json.dumps({"error": "No listings available. Please ensure data is generated."})

    if matched_listing.get("id", "").startswith("apt_real"):
        logger.info("Using REAL listing from Apartments.com: %s", matched_listing.get("address", "?"))
    else:
        logger.info("Using MOCK listing from CSV: %s", matched_listing.get("address", "?"))

    # Run the full agent pipeline (Kamaji orchestrates the other 5)
    logger.info("PIPELINE: starting aggregate_insights (Kamaji + 5 agents)")
    insights = aggregate_insights(matched_listing, query.budget)
    logger.info("MCP TOOL search_and_analyze_property completed successfully")

    return json.dumps(insights, indent=2)




if __name__ == "__main__":
    # You can run this file directly to test the stdio transport, 
    # or you can use `mcp run server.py` 
    mcp.run()
