import json
import logging
import os
import sys
import time
import requests
import re

logger = logging.getLogger("services.geolocate")

cities = ["Princeton", "New Brunswick", "Camden", "Newark", "Piscataway", "Edison", "Woodbridge", "Toms River", "Hamilton", "Trenton", "Clifton", "Passaic", "Union City", "Bayonne", "Hackensack", "Jersey City", "Elizabeth", "Paterson", "Morristown", "Wayne", "West New York"]

# ── File-backed geocode cache ──────────────────────────────────────────────
_GEOCODE_CACHE_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "geocode_cache.json")

def _load_file_cache() -> dict[str, dict]:
    """Load the persistent JSON geocode cache from disk into memory."""
    if os.path.exists(_GEOCODE_CACHE_FILE):
        try:
            with open(_GEOCODE_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            logger.info("GEOCODE FILE CACHE: loaded %d entries from %s", len(data), _GEOCODE_CACHE_FILE)
            return data
        except Exception as e:
            logger.warning("GEOCODE FILE CACHE: failed to load — %s", e)
    return {}

def _save_file_cache() -> None:
    """Persist the in-memory cache to disk."""
    try:
        os.makedirs(os.path.dirname(_GEOCODE_CACHE_FILE), exist_ok=True)
        with open(_GEOCODE_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_GEOCODE_CACHE, f, indent=1)
        logger.debug("GEOCODE FILE CACHE: saved %d entries", len(_GEOCODE_CACHE))
    except Exception as e:
        logger.warning("GEOCODE FILE CACHE: failed to save — %s", e)

# L1: in-process cache — seeded from disk on startup
_GEOCODE_CACHE: dict[str, dict] = _load_file_cache()

# Lazy import of DB helpers to avoid circular imports
def _db_get(key: str) -> dict | None:
    try:
        from db import geocode_cache_get
        return geocode_cache_get(key)
    except Exception:
        return None

def _db_set(key: str, geo: dict) -> None:
    try:
        from db import geocode_cache_set
        geocode_cache_set(key, geo)
    except Exception:
        pass


def get_coordinates(place):
    """
    Three-layer geocoding:
      L1 – in-memory dict  (instant, lives for this process)
      L2 – Supabase table  (persistent across restarts, ~10 ms)
      L3 – Nominatim API   (slow, rate-limited; result saved to L1 + L2)
    """
    cache_key = place.strip().lower()

    # L1: in-memory
    if cache_key in _GEOCODE_CACHE:
        logger.debug("GEOCODE L1 HIT (memory): %r", place)
        return _GEOCODE_CACHE[cache_key]

    # L2: Supabase
    db_row = _db_get(cache_key)
    if db_row and db_row.get("latitude") and db_row.get("longitude"):
        logger.info("GEOCODE L2 HIT (Supabase): %r → (%.4f, %.4f)", place, db_row["latitude"], db_row["longitude"])
        result = {
            "name":         place,
            "latitude":     float(db_row["latitude"]),
            "longitude":    float(db_row["longitude"]),
            "city":         db_row.get("city", ""),
            "state":        "nj",
            "zipcode":      db_row.get("zipcode", ""),
            "display_name": db_row.get("display_name", ""),
        }
        _GEOCODE_CACHE[cache_key] = result
        return result

    # L3: Nominatim
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": place, "format": "json"}
    logger.info("GEOCODE L3 (Nominatim): %r", place)
    response = requests.get(url, params=params, headers={"User-Agent": "apt-app"})
    data = response.json()

    if not data:
        logger.warning("GEOCODE L3: Nominatim no results for %r", place)
        return 0, 0, ""

    result = {
        "name":         place,
        "latitude":     float(data[0]["lat"]),
        "longitude":    float(data[0]["lon"]),
        "city":         next((c for c in cities if c in data[0].get("display_name", "")), ""),
        "state":        "nj",
        "zipcode":      re.search(r"\b\d{5}\b", data[0]["display_name"]).group()
                        if re.search(r"\b\d{5}\b", data[0]["display_name"]) else "",
        "display_name": str(data[0]["display_name"]),
    }
    logger.info("GEOCODE L3 RESULT: lat=%.4f lon=%.4f for %r — saving to Supabase", result["latitude"], result["longitude"], place)

    # Persist to L1 (memory + file) + L2 (Supabase)
    _GEOCODE_CACHE[cache_key] = result
    _save_file_cache()
    _db_set(cache_key, result)
    return result


DEMO_GEOCODE_SECS = 15.0

def geocode_batch(addresses: list[str], delay_sec: float = 1.0) -> list[dict]:
    """
    Geocode multiple addresses.
    L1 (file-backed memory) hits are instant; L2 (Supabase) hits are fast;
    only real Nominatim calls are throttled.

    When every address resolves from cache, a simulated delay of
    ~DEMO_GEOCODE_SECS is spread across the batch so the demo looks
    natural while still being deterministic.
    """
    results = []
    needs_api_delay = False
    api_calls = 0
    cache_hits = 0
    new_entries = False

    for addr in addresses:
        cache_key = addr.strip().lower()
        # Check L1 first (file-backed memory — no network)
        if cache_key in _GEOCODE_CACHE:
            geo = _GEOCODE_CACHE[cache_key]
            results.append({"latitude": geo["latitude"], "longitude": geo["longitude"]})
            cache_hits += 1
            continue
        # Check L2 (Supabase)
        db_row = _db_get(cache_key)
        if db_row and db_row.get("latitude") and db_row.get("longitude"):
            result = {
                "name": addr, "latitude": float(db_row["latitude"]),
                "longitude": float(db_row["longitude"]),
                "city": db_row.get("city", ""), "state": "nj",
                "zipcode": db_row.get("zipcode", ""), "display_name": db_row.get("display_name", ""),
            }
            _GEOCODE_CACHE[cache_key] = result
            new_entries = True
            results.append({"latitude": result["latitude"], "longitude": result["longitude"]})
            cache_hits += 1
            continue
        # L3: Nominatim — rate-limit only between real API calls
        if needs_api_delay and delay_sec > 0:
            time.sleep(delay_sec)
        needs_api_delay = True
        api_calls += 1
        geo = get_coordinates(addr)
        if isinstance(geo, dict) and geo.get("latitude"):
            results.append({"latitude": geo["latitude"], "longitude": geo["longitude"]})
        else:
            results.append({"latitude": 0, "longitude": 0})

    if new_entries:
        _save_file_cache()

    # If everything came from cache, simulate a realistic delay for the demo
    if api_calls == 0 and len(addresses) > 0:
        per_addr = DEMO_GEOCODE_SECS / max(len(addresses), 1)
        logger.info(
            "GEOCODE BATCH: all %d/%d from cache — simulating %.0fs demo delay (%.2fs each)",
            cache_hits, len(addresses), DEMO_GEOCODE_SECS, per_addr,
        )
        for i, addr in enumerate(addresses):
            time.sleep(per_addr)
            if (i + 1) % 10 == 0 or (i + 1) == len(addresses):
                logger.info("  geocoded %d/%d (cached)", i + 1, len(addresses))
    else:
        logger.info("GEOCODE BATCH: %d cache hits, %d API calls out of %d addresses", cache_hits, api_calls, len(addresses))

    return results


def geocode_address(address):
    """Thin wrapper around get_coordinates that uses the same three-layer cache."""
    result = get_coordinates(address)
    if isinstance(result, dict):
        return result
    return {"name": address, "latitude": 0, "longitude": 0, "city": ""}

if __name__ == "__main__":
    result = get_coordinates("Rutgers University")
    print("\n\n")
    # print(f"Latitude: {result['latitude']}, Longitude: {result['longitude']}, State: {result['state']}, Zipcode: {result['zipcode']}, Name: {result['display_name']}")