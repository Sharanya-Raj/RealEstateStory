"""
Quick diagnostic to check Supabase setup status.

Usage:
    cd backend
    python scripts/check_supabase_status.py
"""
import logging
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from db import get_client

logging.basicConfig(level=logging.WARNING)

def check():
    print("\n" + "=" * 60)
    print("🔍 SUPABASE STATUS CHECK")
    print("=" * 60)
    
    # Check connection
    print("\n1. Connection... ", end="", flush=True)
    try:
        client = get_client()
        print("✅ Connected")
    except Exception as e:
        print(f"❌ Failed: {e}")
        print("\n💡 Check your SUPABASE_URL and SUPABASE_KEY in .env")
        return
    
    # Check if listings table exists
    print("2. Table 'listings'... ", end="", flush=True)
    try:
        result = client.table("listings").select("id").limit(1).execute()
        print("✅ Exists")
    except Exception as e:
        print(f"❌ Missing")
        print("\n💡 Run the migration SQL in Supabase SQL Editor:")
        print("   backend/scripts/supabase_migration.sql")
        return
    
    # Check listing count
    print("3. Listing count... ", end="", flush=True)
    try:
        listings = client.table("listings").select("id").execute()
        count = len(listings.data) if listings.data else 0
        if count == 0:
            print(f"⚠️  0 listings (empty database)")
            print("\n💡 Seed the database:")
            print("   python backend/scripts/seed_from_csv.py")
        else:
            print(f"✅ {count} listings")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Check RPC function exists
    print("4. RPC function 'upsert_listing_with_location'... ", end="", flush=True)
    try:
        # Try calling it with dummy data - will fail but tells us if function exists
        client.rpc("upsert_listing_with_location", {
            "p_name": "test",
            "p_address": "test",
            "p_city": "test",
            "p_state": "NJ",
            "p_zip": "00000",
            "p_price": 1000,
            "p_bedrooms": 1,
            "p_bathrooms": 1,
            "p_amenities": [],
            "p_pet_friendly": False,
            "p_has_gym": False,
            "p_description": "test",
            "p_source": "test",
            "p_latitude": 40.0,
            "p_longitude": -74.0,
        }).execute()
        print("✅ Exists")
    except Exception as e:
        error_str = str(e).lower()
        if "not found" in error_str or "does not exist" in error_str:
            print("❌ Missing")
            print("\n💡 Re-run the migration SQL (includes the RPC function)")
        else:
            # Function exists but threw a different error (probably duplicate constraint)
            print("✅ Exists")
    
    # Check geography field
    print("5. Geography field 'location'... ", end="", flush=True)
    try:
        result = client.table("listings").select("location").limit(1).execute()
        if result.data and result.data[0].get("location"):
            print("✅ Populated")
        else:
            print("⚠️  Not populated (listings have no coordinates)")
            print("\n💡 Re-seed with: python backend/scripts/seed_from_csv.py")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Supabase is ready!" if count > 0 else "⚠️  Supabase needs seeding")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    check()
