import logging
import os
import sys
import time
import requests
import re

logger = logging.getLogger("services.geolocate")

cities = ["Princeton", "New Brunswick", "Camden", "Newark", "Piscataway", "Edison", "Woodbridge", "Toms River", "Hamilton", "Trenton", "Clifton", "Passaic", "Union City", "Bayonne", "Hackensack", "Jersey City", "Elizabeth", "Paterson", "Morristown", "Wayne", "West New York"]

# L1: in-process cache — avoids any I/O for addresses geocoded in the current run
_GEOCODE_CACHE: dict[str, dict] = {}

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

    # Persist to L1 + L2
    _GEOCODE_CACHE[cache_key] = result
    _db_set(cache_key, result)
    return result


def geocode_batch(addresses: list[str], delay_sec: float = 1.0) -> list[dict]:
    """
    Geocode multiple addresses.
    L1/L2 hits skip the Nominatim rate-limit delay; only real API calls are throttled.
    """
    results = []
    needs_api_delay = False
    for addr in addresses:
        cache_key = addr.strip().lower()
        # Check L1 first (no I/O)
        if cache_key in _GEOCODE_CACHE:
            geo = _GEOCODE_CACHE[cache_key]
            results.append({"latitude": geo["latitude"], "longitude": geo["longitude"]})
            continue
        # Check L2 (fast DB read)
        db_row = _db_get(cache_key)
        if db_row and db_row.get("latitude") and db_row.get("longitude"):
            result = {
                "name": addr, "latitude": float(db_row["latitude"]),
                "longitude": float(db_row["longitude"]),
                "city": db_row.get("city", ""), "state": "nj",
                "zipcode": db_row.get("zipcode", ""), "display_name": db_row.get("display_name", ""),
            }
            _GEOCODE_CACHE[cache_key] = result
            results.append({"latitude": result["latitude"], "longitude": result["longitude"]})
            continue
        # L3: Nominatim — rate-limit only between real API calls
        if needs_api_delay and delay_sec > 0:
            time.sleep(delay_sec)
        needs_api_delay = True
        geo = get_coordinates(addr)
        if isinstance(geo, dict) and geo.get("latitude"):
            results.append({"latitude": geo["latitude"], "longitude": geo["longitude"]})
        else:
            results.append({"latitude": 0, "longitude": 0})
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