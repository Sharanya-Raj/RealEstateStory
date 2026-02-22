"""
Supabase client wrapper for the listings database.
Requires SUPABASE_URL and SUPABASE_KEY in .env
"""
import logging
import os
from typing import Optional

from supabase import create_client, Client

logger = logging.getLogger("db")

_client: Optional[Client] = None


def get_client() -> Client:
    """Lazy-init Supabase client."""
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        _client = create_client(url, key)
    return _client


# ── NJ Colleges lookup (name → lat/lon) ────────────────────────────
# Cached so we don't geocode on every request
NJ_COLLEGES = {
    "Rutgers University - New Brunswick":   (40.5008, -74.4474),
    "Rutgers University - Newark":          (40.7414, -74.1724),
    "Rutgers University - Camden":          (39.9480, -75.1220),
    "Princeton University":                 (40.3431, -74.6551),
    "NJIT":                                 (40.7424, -74.1790),
    "Stevens Institute of Technology":      (40.7453, -74.0257),
    "Seton Hall University":                (40.7428, -74.2481),
    "Rowan University":                     (39.7092, -75.1193),
    "Montclair State University":           (40.8621, -74.1992),
    "Kean University":                      (40.6799, -74.2346),
    "New Jersey City University":           (40.7282, -74.0776),
    "William Paterson University":          (40.9540, -74.1948),
    "Ramapo College":                       (41.0812, -74.1735),
    "Stockton University":                  (39.4820, -74.5775),
    "Rider University":                     (40.2848, -74.7471),
    "Fairleigh Dickinson University":       (40.8912, -74.0797),
    "Drew University":                      (40.7623, -74.4229),
    "Saint Peter's University":             (40.7273, -74.0666),
    "Felician University":                  (40.8684, -74.0875),
    "Caldwell University":                  (40.8399, -74.2818),
    "The College of New Jersey":            (40.2683, -74.7781),
    "Monmouth University":                  (40.2774, -74.0039),
    "Georgian Court University":            (40.0902, -74.2105),
    "New Jersey Institute of Technology":   (40.7424, -74.1790),
}


def get_college_coords(college_name: str) -> tuple[float, float] | None:
    """Return (lat, lon) for a known NJ college, or None."""
    # Exact match first
    if college_name in NJ_COLLEGES:
        return NJ_COLLEGES[college_name]
    # Fuzzy: check if the college name is contained in any key
    lower = college_name.lower()
    for name, coords in NJ_COLLEGES.items():
        if lower in name.lower() or name.lower() in lower:
            return coords
    return None


# ── DB availability (graceful degradation when Supabase not configured) ───

def db_available() -> bool:
    """Return True if Supabase is configured; False otherwise."""
    return bool(os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_KEY"))


def listing_exists(address: str, name: str) -> bool:
    """Check if a listing with this address+name already exists. Returns False if DB unavailable."""
    if not db_available():
        return False
    try:
        client = get_client()
        result = (
            client.table("listings")
            .select("id")
            .eq("address", address)
            .eq("name", name)
            .limit(1)
            .execute()
        )
        return bool(result.data)
    except Exception as e:
        logger.warning("listing_exists failed: %s", e)
        return False


def insert_listing_from_agents(listing: dict, insights: dict | None = None, source: str = "apartments.com") -> bool:
    """
    Insert a listing (with optional agent insights) into the DB.
    Expects listing dict with: name, address, city, state, zip, base_rent/price, bedrooms, bathrooms,
    pet_friendly, has_gym, description, latitude, longitude.
    Returns True on success, False if DB unavailable or insert fails.
    """
    if not db_available():
        return False
    try:
        client = get_client()
        amenities = []
        if listing.get("has_gym"):
            amenities.append("Gym")
        if listing.get("has_grocery_nearby"):
            amenities.append("Near Grocery")
        if listing.get("pet_friendly"):
            amenities.append("Pet Friendly")
        lat = listing.get("latitude") or 0
        lon = listing.get("longitude") or 0
        if lat and lon:
            client.rpc("upsert_listing_with_location", {
                "p_name": str(listing.get("name", "Unknown")),
                "p_address": str(listing.get("address", "")),
                "p_city": str(listing.get("city", "")),
                "p_state": str(listing.get("state", "NJ")),
                "p_zip": str(listing.get("zip", "")),
                "p_price": float(listing.get("base_rent") or listing.get("price") or 0),
                "p_bedrooms": int(listing.get("bedrooms", 1)),
                "p_bathrooms": float(listing.get("bathrooms", 1)) or 1,
                "p_amenities": amenities,
                "p_pet_friendly": bool(listing.get("pet_friendly")),
                "p_has_gym": bool(listing.get("has_gym")),
                "p_description": str(listing.get("description", "")),
                "p_source": source,
                "p_latitude": float(lat),
                "p_longitude": float(lon),
            }).execute()
        else:
            client.table("listings").upsert({
                "name": str(listing.get("name", "Unknown")),
                "address": str(listing.get("address", "")),
                "city": str(listing.get("city", "")),
                "state": str(listing.get("state", "NJ")),
                "zip": str(listing.get("zip", "")),
                "price": float(listing.get("base_rent") or listing.get("price") or 0),
                "bedrooms": int(listing.get("bedrooms", 1)),
                "bathrooms": float(listing.get("bathrooms", 1)) or 1,
                "amenities": amenities,
                "pet_friendly": bool(listing.get("pet_friendly")),
                "has_gym": bool(listing.get("has_gym")),
                "description": str(listing.get("description", "")),
                "source": source,
            }, on_conflict="address,name").execute()
        return True
    except Exception as e:
        logger.warning("insert_listing_from_agents failed: %s", e)
        return False


# ── Geocode cache ────────────────────────────────────────────────────

def geocode_cache_get(address_key: str) -> dict | None:
    """
    Look up a pre-geocoded address from Supabase.
    Returns a dict with latitude, longitude, display_name, city, zipcode — or None on miss.
    """
    if not db_available():
        return None
    try:
        client = get_client()
        result = (
            client.table("geocode_cache")
            .select("latitude,longitude,display_name,city,zipcode")
            .eq("address_key", address_key)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        logger.warning("geocode_cache_get failed: %s", e)
        return None


def geocode_cache_set(address_key: str, geo: dict) -> None:
    """
    Persist a geocoding result so it is found on future runs.
    Silently skips if DB is unavailable.
    """
    if not db_available():
        return
    try:
        client = get_client()
        client.table("geocode_cache").upsert(
            {
                "address_key":  address_key,
                "latitude":     geo.get("latitude"),
                "longitude":    geo.get("longitude"),
                "display_name": geo.get("display_name", ""),
                "city":         geo.get("city", ""),
                "zipcode":      geo.get("zipcode", ""),
            },
            on_conflict="address_key",
        ).execute()
    except Exception as e:
        logger.warning("geocode_cache_set failed: %s", e)


# ── Listing queries ─────────────────────────────────────────────────

def get_nearby_listings(
    lat: float,
    lon: float,
    radius_miles: float = 10.0,
    max_price: float = 99999,
    limit: int = 100,
) -> list[dict]:
    """
    Query listings within `radius_miles` of a lat/lon point.
    Uses the PostGIS `nearby_listings` RPC function.
    """
    client = get_client()
    radius_meters = radius_miles * 1609.34  # miles → meters

    result = client.rpc("nearby_listings", {
        "lat": lat,
        "lon": lon,
        "radius_meters": radius_meters,
        "max_price": max_price,
        "lim": limit,
    }).execute()

    return result.data or []


def get_listing_by_id(listing_id: str) -> dict | None:
    """Fetch a single listing by UUID."""
    client = get_client()
    result = (
        client.table("listings")
        .select("*")
        .eq("id", listing_id)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]
    return None


def get_all_listings(limit: int = 100) -> list[dict]:
    """Get all listings (no geo filter), for fallback."""
    client = get_client()
    result = (
        client.table("listings")
        .select("*")
        .order("price")
        .limit(limit)
        .execute()
    )
    return result.data or []


def upsert_listing(listing: dict) -> None:
    """Insert or update a listing (de-duplicates by address+name)."""
    client = get_client()
    client.table("listings").upsert(
        listing,
        on_conflict="address,name"
    ).execute()
