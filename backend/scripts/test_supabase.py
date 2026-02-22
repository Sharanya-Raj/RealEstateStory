"""
Test script to verify Supabase is working correctly.

Usage:
    cd backend
    python scripts/test_supabase.py
"""
import logging
import os
import sys

# Add backend/ to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from db import get_client, get_college_coords, get_nearby_listings, get_all_listings, get_listing_by_id

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("test")


def test_connection():
    """Test basic Supabase connection."""
    logger.info("🔌 Testing Supabase connection...")
    try:
        client = get_client()
        logger.info("✅ Connected to Supabase!")
        return True
    except Exception as e:
        logger.error("❌ Connection failed: %s", e)
        return False


def test_count():
    """Test counting total listings."""
    logger.info("📊 Counting listings...")
    try:
        listings = get_all_listings(limit=1000)
        count = len(listings)
        logger.info("✅ Found %d total listings", count)
        return count > 0
    except Exception as e:
        logger.error("❌ Count failed: %s", e)
        return False


def test_college_coords():
    """Test college coordinate lookup."""
    logger.info("🎓 Testing college coordinate lookup...")
    test_colleges = [
        "Rutgers University",
        "Princeton University",
        "NJIT",
    ]
    
    passed = 0
    for college in test_colleges:
        coords = get_college_coords(college)
        if coords:
            logger.info("✅ %s → (%s, %s)", college, coords[0], coords[1])
            passed += 1
        else:
            logger.warning("❌ %s → Not found", college)
    
    return passed == len(test_colleges)


def test_geo_radius():
    """Test geo-radius query."""
    logger.info("📍 Testing geo-radius query...")
    
    # Rutgers New Brunswick coordinates
    coords = get_college_coords("Rutgers University - New Brunswick")
    if not coords:
        logger.error("❌ Could not get Rutgers coordinates")
        return False
    
    lat, lon = coords
    logger.info("   Searching near Rutgers (%s, %s) within 5 miles...", lat, lon)
    
    try:
        listings = get_nearby_listings(lat, lon, radius_miles=5.0, max_price=2500)
        count = len(listings)
        logger.info("✅ Found %d listings within 5 miles of Rutgers", count)
        
        if count > 0:
            sample = listings[0]
            logger.info("   Sample listing: %s at $%s/mo", sample.get("address"), sample.get("price"))
        
        return True
    except Exception as e:
        logger.error("❌ Geo-radius query failed: %s", e)
        return False


def test_get_by_id():
    """Test fetching a single listing by ID."""
    logger.info("🔍 Testing get listing by ID...")
    
    try:
        # First get all listings to grab an ID
        all_listings = get_all_listings(limit=1)
        if not all_listings:
            logger.warning("⚠️  No listings in database to test with")
            return False
        
        test_id = all_listings[0]["id"]
        logger.info("   Test ID: %s", test_id)
        
        listing = get_listing_by_id(test_id)
        if listing:
            logger.info("✅ Successfully fetched listing: %s", listing.get("address"))
            return True
        else:
            logger.error("❌ Listing not found")
            return False
            
    except Exception as e:
        logger.error("❌ Get by ID failed: %s", e)
        return False


def main():
    logger.info("═" * 60)
    logger.info("🧪 SUPABASE INTEGRATION TEST")
    logger.info("═" * 60)
    
    tests = [
        ("Connection", test_connection),
        ("Count Listings", test_count),
        ("College Coords", test_college_coords),
        ("Geo-Radius Query", test_geo_radius),
        ("Get By ID", test_get_by_id),
    ]
    
    results = []
    for name, test_func in tests:
        logger.info("")
        try:
            passed = test_func()
            results.append((name, passed))
        except Exception as e:
            logger.error("💥 Test crashed: %s", e)
            results.append((name, False))
    
    logger.info("")
    logger.info("═" * 60)
    logger.info("📋 TEST RESULTS")
    logger.info("═" * 60)
    
    passed_count = 0
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        logger.info("%s: %s", status, name)
        if passed:
            passed_count += 1
    
    logger.info("═" * 60)
    logger.info("Total: %d/%d tests passed", passed_count, len(results))
    
    if passed_count == len(results):
        logger.info("🎉 All tests passed! Supabase is ready to use.")
        return 0
    else:
        logger.error("⚠️  Some tests failed. Check configuration.")
        return 1


if __name__ == "__main__":
    exit(main())
