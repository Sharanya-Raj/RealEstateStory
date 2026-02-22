"""
NJ apartment scraper — uses the existing Selenium-based apartmentsdotcom.py.
Scrapes apartments.com for each NJ university and stores results in Supabase.

Usage:
    cd backend
    python scripts/scrape_nj.py
"""
import logging
import os
import re
import sys
import time

# Add backend/ to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from services.apartmentsdotcom import get_apartmentsdotcom
from db import get_client

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("scraper")

# University names — apartments.com off-campus-housing URLs need these
NJ_UNIVERSITIES = [
    "Rutgers University",
    "Princeton University",
    "NJIT",
    "Stevens Institute of Technology",
    "Montclair State University",
    "Rowan University",
    "Seton Hall University",
    "The College of New Jersey",
    "Kean University",
    "William Paterson University",
    "Ramapo College",
    "Stockton University",
    "Rider University",
    "Fairleigh Dickinson University",
    "New Jersey City University",
    "Monmouth University",
    "Drew University",
    "Saint Peter's University",
    "Caldwell University",
    "Georgian Court University",
]


def _extract_zip(address: str) -> str:
    match = re.search(r"\b(\d{5})\b", address or "")
    return match.group(1) if match else ""


def _parse_price(price_str: str) -> float | None:
    if not price_str or price_str.strip().upper() == "N/A":
        return None
    nums = re.findall(r"[\d,]+", price_str)
    return float(nums[0].replace(",", "")) if nums else None


def scrape_and_store(university: str) -> int:
    """Scrape one university using the existing Selenium scraper and store in Supabase."""
    logger.info("Scraping: %s", university)

    try:
        apartments = get_apartmentsdotcom(university)
    except Exception as e:
        logger.error("Scraper failed for %s: %s", university, e)
        return 0

    if not apartments:
        logger.warning("No results for %s", university)
        return 0

    logger.info("Found %d listings for %s", len(apartments), university)

    client = get_client()
    stored = 0

    for i, apt in enumerate(apartments):
        try:
            price = _parse_price(apt.price)
            amenity_list = getattr(apt, "amenities", None) or []
            amenity_str = " ".join(str(a).lower() for a in amenity_list)

            # Infer city from address (second-to-last comma-separated part)
            city = ""
            if apt.address:
                parts = apt.address.split(",")
                if len(parts) >= 2:
                    city = parts[-2].strip()

            # Geocode the INDIVIDUAL apartment address (not the university!)
            lat = getattr(apt, "latitude", None) or 0.0
            lon = getattr(apt, "longitude", None) or 0.0
            
            # CRITICAL: The scraper gives all apts the university coords.
            # We need to geocode each apartment's actual address.
            if (lat == 0 or lon == 0) and apt.address:
                logger.info("  Geocoding %d/%d: %s", i+1, len(apartments), apt.address[:50])
                try:
                    from services.geolocate import get_coordinates
                    geo = get_coordinates(apt.address)
                    if isinstance(geo, dict):
                        lat = geo.get("latitude", 0)
                        lon = geo.get("longitude", 0)
                        if not city and geo.get("city"):
                            city = geo.get("city")
                    time.sleep(1.1)  # Respect Nominatim rate limit (1 req/sec)
                except Exception as geo_err:
                    logger.warning("  Geocoding failed for %s: %s", apt.name, geo_err)

            row = {
                "name": apt.name,
                "address": apt.address,
                "city": city,
                "state": "NJ",
                "zip": _extract_zip(apt.address),
                "price": price,
                "bedrooms": apt.bedrooms,
                "bathrooms": 1,
                "amenities": [str(a).strip() for a in amenity_list if str(a).strip()],
                "pet_friendly": any(x in amenity_str for x in ("pet", "dog", "cat")),
                "has_gym": any(x in amenity_str for x in ("gym", "fitness")),
                "description": f"Off-campus housing near {university}: {apt.name}",
                "source": "apartments.com",
                "latitude": lat if lat else None,
                "longitude": lon if lon else None,
            }

            # IMPORTANT: Don't set 'location' field directly as a string!
            # Supabase PostGIS will auto-populate it from lat/lon via a trigger,
            # OR we use ST_Point in the RPC. For now, we'll use the RPC approach.
            
            # Use Supabase's built-in geospatial insert via RPC
            if row["latitude"] and row["longitude"]:
                # Call the upsert_listing RPC that handles PostGIS point creation
                result = client.rpc("upsert_listing_with_location", {
                    "p_name": row["name"],
                    "p_address": row["address"],
                    "p_city": row["city"],
                    "p_state": row["state"],
                    "p_zip": row["zip"],
                    "p_price": row["price"],
                    "p_bedrooms": row["bedrooms"],
                    "p_bathrooms": row["bathrooms"],
                    "p_amenities": row["amenities"],
                    "p_pet_friendly": row["pet_friendly"],
                    "p_has_gym": row["has_gym"],
                    "p_description": row["description"],
                    "p_source": row["source"],
                    "p_latitude": row["latitude"],
                    "p_longitude": row["longitude"],
                }).execute()
                stored += 1
            else:
                # No coordinates - insert without location field
                client.table("listings").upsert(
                    row, on_conflict="address,name"
                ).execute()
                stored += 1

        except Exception as e:
            logger.warning("Failed to store %s: %s", apt.name, e)

    logger.info("✅ Stored %d/%d listings for %s", stored, len(apartments), university)
    return stored


def main():
    logger.info("🕷️  Starting NJ apartments scrape (Selenium mode)")
    logger.info("Universities: %d", len(NJ_UNIVERSITIES))

    total = 0
    for i, uni in enumerate(NJ_UNIVERSITIES, 1):
        logger.info("═" * 50)
        logger.info("[%d/%d] %s", i, len(NJ_UNIVERSITIES), uni)
        count = scrape_and_store(uni)
        total += count
        # Wait between searches to be polite
        if i < len(NJ_UNIVERSITIES):
            time.sleep(3)

    logger.info("═" * 50)
    logger.info("✅ Scrape complete! Total listings stored: %d", total)


if __name__ == "__main__":
    main()
