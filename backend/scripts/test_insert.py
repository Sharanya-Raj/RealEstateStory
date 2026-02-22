"""
Quick test to verify we can insert a single listing to Supabase.
This isolates the database insert from the scraper logic.

Usage:
    cd backend
    python scripts/test_insert.py
"""
import logging
import os
import sys
import requests

# Add backend/ to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("test_insert")


def main():
    logger.info("🧪 Testing Supabase listing insert...")
    
    # Check environment variables
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    
    if not SUPABASE_URL:
        logger.error("❌ SUPABASE_URL not set!")
        return False
    if not SUPABASE_KEY:
        logger.error("❌ SUPABASE_KEY not set!")
        return False
        
    logger.info("✅ Credentials found")
    logger.info("   URL: %s", SUPABASE_URL[:50] + "...")
    logger.info("   Key: %s", SUPABASE_KEY[:20] + "...")
    
    # Test data - a sample listing near Rutgers
    test_listing = {
        "p_name": "Test Apartment",
        "p_address": "123 College Ave, New Brunswick, NJ 08901",
        "p_city": "New Brunswick",
        "p_state": "NJ",
        "p_zip": "08901",
        "p_price": 1500.0,
        "p_bedrooms": 2,
        "p_bathrooms": 1,
        "p_amenities": ["parking", "laundry"],
        "p_pet_friendly": True,
        "p_has_gym": False,
        "p_description": "Test listing near Rutgers",
        "p_source": "TEST",
        "p_latitude": 40.5008,
        "p_longitude": -74.4474,
    }
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    logger.info("📤 Inserting test listing...")
    
    try:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/upsert_listing_with_location",
            headers=headers,
            json=test_listing
        )
        
        logger.info("   Status code: %d", r.status_code)
        logger.info("   Response: %s", r.text[:500])
        
        if r.status_code in (200, 201):
            result = r.json()
            logger.info("✅ SUCCESS! Listing inserted with ID: %s", result)
            return True
        else:
            logger.error("❌ FAILED! Status %d: %s", r.status_code, r.text)
            return False
            
    except Exception as e:
        logger.error("❌ Exception during insert: %s", e, exc_info=True)
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
