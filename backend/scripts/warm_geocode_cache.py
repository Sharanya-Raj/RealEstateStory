"""
Pre-populate the Supabase geocode_cache table from the listings CSV so the demo
never waits on Nominatim for any apartment address.

Run ONCE before your demo:
    cd backend
    python scripts/warm_geocode_cache.py

    # Or just the first N rows to test:
    python scripts/warm_geocode_cache.py --limit 50

The script is safe to re-run — already-cached addresses are skipped instantly.
"""
import argparse
import logging
import os
import sys
import time

import pandas as pd

# ── Path setup ──────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from db import geocode_cache_get, geocode_cache_set, db_available
from services.geolocate import get_coordinates, _GEOCODE_CACHE

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("warm_geocode")

# ── CSV path ─────────────────────────────────────────────────────────────────
CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "listings.csv")


def build_address_list(df: pd.DataFrame) -> list[str]:
    """Collect every unique geocodable string from the CSV."""
    addrs: set[str] = set()
    for _, row in df.iterrows():
        # Full street address is best
        parts = [str(row.get("address", "") or "").strip(),
                 str(row.get("city", "") or "").strip(),
                 str(row.get("state", "NJ") or "NJ").strip()]
        full = ", ".join(p for p in parts if p)
        if full:
            addrs.add(full)
        # Also cache city-only lookups used by the market-fairness agent
        city = str(row.get("city", "") or "").strip()
        if city:
            addrs.add(city)
    return sorted(addrs)


def main():
    parser = argparse.ArgumentParser(description="Warm Supabase geocode cache from listings.csv")
    parser.add_argument("--limit", type=int, default=0, help="Only process first N addresses (0 = all)")
    parser.add_argument("--delay", type=float, default=1.1, help="Seconds between Nominatim calls (default 1.1)")
    args = parser.parse_args()

    if not db_available():
        logger.error("Supabase is not configured (SUPABASE_URL / SUPABASE_KEY missing). Exiting.")
        sys.exit(1)

    if not os.path.exists(CSV_PATH):
        logger.error("CSV not found at %s", CSV_PATH)
        sys.exit(1)

    df = pd.read_csv(CSV_PATH)
    addresses = build_address_list(df)
    if args.limit:
        addresses = addresses[: args.limit]

    total = len(addresses)
    logger.info("Addresses to geocode: %d", total)

    skipped = 0
    cached = 0
    failed = 0

    for i, addr in enumerate(addresses, 1):
        key = addr.strip().lower()

        # Already in DB?
        row = geocode_cache_get(key)
        if row and row.get("latitude") and row.get("longitude"):
            logger.info("[%d/%d] DB HIT — %s", i, total, addr)
            skipped += 1
            continue

        # Need Nominatim — respect rate limit
        if i > 1 and args.delay > 0:
            time.sleep(args.delay)

        result = get_coordinates(addr)
        if isinstance(result, dict) and result.get("latitude"):
            logger.info("[%d/%d] GEOCODED — %s → (%.4f, %.4f)", i, total, addr, result["latitude"], result["longitude"])
            cached += 1
        else:
            logger.warning("[%d/%d] NO RESULT — %s", i, total, addr)
            failed += 1

    logger.info(
        "\nDone.  db_hits=%d  newly_geocoded=%d  failed=%d  total=%d",
        skipped, cached, failed, total,
    )


if __name__ == "__main__":
    main()
