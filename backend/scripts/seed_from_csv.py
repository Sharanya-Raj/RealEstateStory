"""
Quick script to populate Supabase from the existing CSV file.
Use this if you don't want to wait for the full scraper.

Usage:
    cd backend
    python scripts/seed_from_csv.py
"""
import logging
import os
import sys

import pandas as pd

# Add backend/ to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from db import get_client
from services.geolocate import get_coordinates
import time

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("seed")


def main():
    logger.info("🌱 Seeding Supabase from CSV...")
    
    # Load CSV
    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "listings.csv")
    if not os.path.exists(csv_path):
        logger.error("❌ CSV file not found at: %s", csv_path)
        return
    
    df = pd.read_csv(csv_path)
    logger.info("📊 Loaded %d listings from CSV", len(df))
    
    client = get_client()
    success = 0
    failed = 0
    
    for idx, row in df.iterrows():
        try:
            # Get or geocode coordinates
            lat = row.get("latitude") or 0
            lon = row.get("longitude") or 0
            
            if lat == 0 or lon == 0:
                # Try to geocode from address
                full_addr = f"{row['address']}, {row['city']}, {row['state']} {row['zip']}"
                logger.info("Geocoding: %s", full_addr)
                try:
                    geo = get_coordinates(full_addr)
                    if isinstance(geo, dict):
                        lat = geo.get("latitude", 0)
                        lon = geo.get("longitude", 0)
                    time.sleep(1.1)  # Nominatim rate limit
                except Exception as e:
                    logger.warning("Geocoding failed for %s: %s", full_addr, e)
            
            # Parse amenities if they exist
            amenities = []
            if row.get("has_gym"):
                amenities.append("Gym")
            if row.get("has_grocery_nearby"):
                amenities.append("Near Grocery")
            
            # Build listing object
            listing = {
                "name": f"Property at {row['address']}",
                "address": str(row["address"]),
                "city": str(row["city"]),
                "state": str(row["state"]),
                "zip": str(row["zip"]),
                "price": float(row["base_rent"]) if pd.notna(row["base_rent"]) else None,
                "bedrooms": int(row["bedrooms"]) if pd.notna(row["bedrooms"]) else 1,
                "bathrooms": int(row["bathrooms"]) if pd.notna(row["bathrooms"]) else 1,
                "sqft": int(row["sqft"]) if pd.notna(row["sqft"]) else None,
                "amenities": amenities,
                "pet_friendly": bool(row.get("pet_friendly")),
                "has_gym": bool(row.get("has_gym")),
                "description": str(row.get("description", "")),
                "source": "csv_seed",
                "latitude": float(lat) if lat else None,
                "longitude": float(lon) if lon else None,
            }
            
            # Use the RPC function to properly handle PostGIS geography
            if listing["latitude"] and listing["longitude"]:
                client.rpc("upsert_listing_with_location", {
                    "p_name": listing["name"],
                    "p_address": listing["address"],
                    "p_city": listing["city"],
                    "p_state": listing["state"],
                    "p_zip": listing["zip"],
                    "p_price": listing["price"],
                    "p_bedrooms": listing["bedrooms"],
                    "p_bathrooms": listing["bathrooms"],
                    "p_amenities": listing["amenities"],
                    "p_pet_friendly": listing["pet_friendly"],
                    "p_has_gym": listing["has_gym"],
                    "p_description": listing["description"],
                    "p_source": listing["source"],
                    "p_latitude": listing["latitude"],
                    "p_longitude": listing["longitude"],
                }).execute()
            else:
                # No coordinates - insert without location field
                client.table("listings").upsert(
                    listing,
                    on_conflict="address,name"
                ).execute()
            
            success += 1
            if success % 10 == 0:
                logger.info("✓ Seeded %d/%d listings", success, len(df))
                
        except Exception as e:
            failed += 1
            logger.error("Failed to seed row %d: %s", idx, e)
    
    logger.info("═" * 50)
    logger.info("✅ Seeding complete!")
    logger.info("   Success: %d", success)
    logger.info("   Failed:  %d", failed)
    logger.info("   Total:   %d", len(df))


if __name__ == "__main__":
    main()
