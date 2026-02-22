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

from services.craigslist import get_craigslist
import requests

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
    """Scrape one university using the Craigslist radius scraper and store in Supabase."""
    logger.info("Scraping: %s", university)
    
    # Verify Supabase credentials are loaded
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("❌ SUPABASE_URL or SUPABASE_KEY not set in environment!")
        return 0

    try:
        apartments = get_craigslist(university)
    except Exception as e:
        logger.error("Scraper failed for %s: %s", university, e)
        return 0

    if not apartments:
        logger.warning("No results for %s", university)
        return 0

    logger.info("Found %d listings for %s", len(apartments), university)

    stored = 0
    skipped_no_coords = 0
    skipped_errors = 0

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
            
            # Debug: Show what coords we got from scraper
            if i < 3:  # Only log first 3 to avoid spam
                logger.info("  DEBUG listing #%d: %s - lat=%s, lon=%s, addr=%s", 
                          i+1, apt.name[:30], lat, lon, apt.address[:40])
            
            # Only geocode if coordinates are missing AND we have an address
            if (lat == 0 or lon == 0) and apt.address:
                # Skip geocoding if address is just "City, State" (not specific enough)
                if apt.address.count(',') <= 1:
                    logger.debug("  Skipping geocode for city-only address: %s", apt.address)
                else:
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
            elif lat != 0 and lon != 0:
                logger.debug("  Using existing coords for %s: (%.4f, %.4f)", apt.name[:30], lat, lon)

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
                "source": "Craigslist",
                "latitude": lat if lat else None,
                "longitude": lon if lon else None,
            }

            # IMPORTANT: Don't set 'location' field directly as a string!
            # Supabase PostGIS will auto-populate it from lat/lon via a trigger,
            # OR we use ST_Point in the RPC. For now, we'll use the RPC approach.
            
            # Insert via direct Supabase REST API
            headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            }
            
            # Skip listings without valid coordinates - they won't work for geo queries
            if not row["latitude"] or not row["longitude"] or row["latitude"] == 0 or row["longitude"] == 0:
                logger.warning("  ⚠️  Skipping %s - no valid coordinates (lat=%s, lon=%s)", 
                             apt.name[:40], row.get("latitude"), row.get("longitude"))
                skipped_no_coords += 1
                continue
            
            # Build the RPC payload for PostGIS insertion
            payload = {
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
            }
            r = requests.post(
                f"{SUPABASE_URL}/rest/v1/rpc/upsert_listing_with_location",
                headers=headers,
                json=payload
            )
            
            # Check the response status
            if r.status_code not in (200, 201):
                logger.error("❌ Failed to insert %s - Status %d: %s", 
                           apt.name[:40], r.status_code, r.text[:200])
                continue
            
            # The RPC returns a UUID
            result = r.json()
            logger.debug("✅ Inserted %s → ID %s", apt.name[:40], result)
            stored += 1

        except Exception as e:
            logger.error("❌ Failed to store %s: %s", apt.name, e, exc_info=True)
            skipped_errors += 1

    logger.info("=" * 60)
    logger.info("✅ Stored:   %d/%d listings", stored, len(apartments))
    logger.info("⚠️  Skipped (no coords): %d", skipped_no_coords)
    logger.info("❌ Skipped (errors):    %d", skipped_errors)
    logger.info("=" * 60)
    return stored


def main():
    logger.info("🕷️  Starting NJ apartments scrape (Craigslist Radius mode)")
    logger.info("Universities: %d", len(NJ_UNIVERSITIES))
    
    # Verify environment variables
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    
    if not supabase_url:
        logger.error("❌ SUPABASE_URL not set! Check your .env file.")
        return
    if not supabase_key:
        logger.error("❌ SUPABASE_KEY not set! Check your .env file.")
        return
        
    logger.info("✅ Supabase URL: %s", supabase_url[:50] + "...")
    logger.info("✅ Supabase Key: %s", supabase_key[:20] + "..." if len(supabase_key) > 20 else "***")

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
