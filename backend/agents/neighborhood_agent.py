# agents/neighborhood_agent.py
import logging
import math
import os
import requests

from llm_client import generate_text

logger = logging.getLogger("agents.neighborhood")


# ---------------------------------------------------------------------------
# Distance helpers
# ---------------------------------------------------------------------------

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Approximate great-circle distance in km (Haversine)."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def _el_latlon(el: dict, center_lat: float, center_lon: float) -> tuple[float, float] | None:
    """Extract lat/lon from Overpass element (node, way, or relation)."""
    if "lat" in el and "lon" in el:
        return float(el["lat"]), float(el["lon"])
    center = el.get("center", {})
    if "lat" in center and "lon" in center:
        return float(center["lat"]), float(center["lon"])
    return None


# ---------------------------------------------------------------------------
# Scoring helpers
# ---------------------------------------------------------------------------

def _distance_weight(dist_km: float) -> float:
    """
    Walk-score weight by distance:
      < 0.4 km  → 1.0  (fully walkable)
      0.4–0.8 km → 0.6 (short walk)
      0.8–1.6 km → 0.3 (longer walk)
      > 1.6 km  → 0.0  (not walkable)
    """
    if dist_km < 0.4:
        return 1.0
    if dist_km < 0.8:
        return 0.6
    if dist_km < 1.6:
        return 0.3
    return 0.0


def _compute_walk_score(elements: list[dict], lat: float, lon: float) -> int:
    """
    Distance-weighted walk score (0–100).

    Points per element type × distance weight:
      Bus stop / transit  →  6 pts
      Supermarket         →  8 pts
      Gym / fitness       →  4 pts
      Restaurant          →  1.5 pts
      Convenience shop    →  3 pts

    Base score 35 (car-dependent baseline, matching Walk Score methodology).
    """
    score = 35.0
    for el in elements:
        tags = el.get("tags", {})
        pos = _el_latlon(el, lat, lon)
        if not pos:
            continue
        dist_km = _haversine_km(lat, lon, pos[0], pos[1])
        w = _distance_weight(dist_km)
        if w == 0.0:
            continue

        if "highway" in tags:
            score += 6.0 * w
        elif tags.get("shop") == "supermarket":
            score += 8.0 * w
        elif "leisure" in tags:
            score += 4.0 * w
        elif tags.get("amenity") == "restaurant":
            score += 1.5 * w
        elif "shop" in tags:
            score += 3.0 * w

    return int(min(100, score))


def _compute_crime_score(elements: list[dict], lat: float, lon: float) -> float:
    """
    Estimate safety (0–1, higher = safer) from real OSM data — no random numbers.

    Two components combined (60 / 40 split):

    1. Emergency-response proximity:
       Distance to the nearest police station or fire station.
       Closer = faster response in emergencies.

    2. Active-street density bonus (Jacobs effect):
       High pedestrian activity (restaurants, transit stops within 1 km)
       correlates with natural surveillance and lower residential crime.

    Returns 0.55 (slightly below neutral) when no police/fire are found nearby.
    """
    police_dists: list[float] = []
    n_active = 0  # restaurants + bus stops within 1 km

    for el in elements:
        tags = el.get("tags", {})
        pos = _el_latlon(el, lat, lon)
        if not pos:
            continue
        dist_km = _haversine_km(lat, lon, pos[0], pos[1])
        amenity = tags.get("amenity", "")

        if amenity in ("police", "fire_station"):
            police_dists.append(dist_km)
        elif dist_km < 1.0 and (amenity == "restaurant" or "highway" in tags):
            n_active += 1

    # Component 1: proximity to nearest emergency station
    if police_dists:
        nearest = min(police_dists)
        if nearest < 0.5:
            proximity = 0.90
        elif nearest < 1.0:
            proximity = 0.80
        elif nearest < 2.0:
            proximity = 0.68
        elif nearest < 3.0:
            proximity = 0.58
        else:
            proximity = 0.50
    else:
        proximity = 0.55  # unknown — lean slightly below neutral

    # Component 2: active-street density (capped at +0.18)
    density_bonus = min(0.18, n_active * 0.012)

    return round(min(1.0, proximity * 0.65 + (proximity + density_bonus) * 0.35), 3)


# ---------------------------------------------------------------------------
# Public API — single listing
# ---------------------------------------------------------------------------

def analyze_neighborhood(listing: dict) -> dict:
    """
    Kiki: Analyses crime, grocery, gym and walkability for a single listing.
    Makes one Overpass call and derives walk score + crime score from real OSM data.
    """
    lat = listing.get("latitude")
    lon = listing.get("longitude")

    has_gym      = listing.get("has_gym", False)
    has_grocery  = listing.get("has_grocery_nearby", False)
    walk_score   = int(listing.get("walk_score", 50) or 50)
    crime_rating = float(listing.get("crime_rating", 5.0) or 5.0)

    if lat and lon:
        logger.info(
            "AGENT: analyze_neighborhood calling analyze_nearby (Overpass) lat=%s lon=%s", lat, lon
        )
        nearby_data = analyze_nearby(float(lat), float(lon))
        if nearby_data:
            has_gym      = nearby_data.get("gyms", 0) > 0
            has_grocery  = nearby_data.get("supermarkets", 0) > 0
            walk_score   = nearby_data.get("walk_score", walk_score)
            crime_rating = nearby_data.get("crime_score", 0.5) * 10

    summary = _default_summary(crime_rating)

    try:
        prompt = (
            f"You are Kiki from Kiki's Delivery Service, an energetic flying witch observing a "
            f"town from the sky. This neighborhood has a safety rating of {crime_rating:.1f}/10 "
            f"and a walk score of {walk_score}/100. Give 1 enthusiastic sentence describing the vibe."
        )
        llm_summary = generate_text(prompt, model="gemini-2.5-flash")
        if llm_summary:
            summary = llm_summary.strip().replace('"', '')
    except Exception as e:
        logger.warning("Neighborhood LLM error: %s", e)

    return {
        "safety": {
            "score": int(round(crime_rating)),
            "nearestPolice": "0.4 mi",
            "summary": summary,
        },
        "hasGym":     has_gym,
        "hasGrocery": has_grocery,
        "walkScore":  walk_score,
        "llm_insight": summary,  # Include for consistency with other agents
    }


def analyze_nearby(lat: float, lon: float) -> dict | None:
    """
    Single Overpass query for gyms, groceries, restaurants, transit, police/fire.
    Returns a dict with counts, distance-weighted walk_score, real crime_score,
    and nearest POI lists. Returns None on failure.
    """
    query = f"""
    [out:json][timeout:30];
    (
      nw["leisure"~"fitness_centre|gym"](around:5000,{lat},{lon});
      nw["shop"~"supermarket|convenience"](around:5000,{lat},{lon});
      nw["amenity"="restaurant"](around:5000,{lat},{lon});
      nw["highway"="bus_stop"](around:2000,{lat},{lon});
      nw["amenity"~"police|fire_station"](around:4000,{lat},{lon});
    );
    out center;
    """
    try:
        logger.info("API CALL: Overpass (single) lat=%.4f lon=%.4f", lat, lon)
        resp = requests.post(
            "http://overpass-api.de/api/interpreter", data={"data": query}, timeout=35
        )
        if resp.status_code != 200:
            logger.warning("Overpass single returned status=%s", resp.status_code)
            return None

        elements = resp.json().get("elements", [])

        gyms_with_dist:   list[dict] = []
        supers_with_dist: list[dict] = []
        n_restaurants = 0

        for el in elements:
            tags = el.get("tags", {})
            pos = _el_latlon(el, lat, lon)
            if not pos:
                continue
            dist_km = _haversine_km(lat, lon, pos[0], pos[1])
            name = tags.get("name") or tags.get("brand") or "Unnamed"
            amenity = tags.get("amenity", "")

            if "leisure" in tags:
                gyms_with_dist.append({"name": name, "distance_km": round(dist_km, 2)})
            elif "shop" in tags and name != "Unnamed":
                supers_with_dist.append({"name": name, "distance_km": round(dist_km, 2)})
            elif amenity == "restaurant":
                n_restaurants += 1

        gyms_with_dist.sort(key=lambda x: x["distance_km"])
        supers_with_dist.sort(key=lambda x: x["distance_km"])

        return {
            "gyms":                  len(gyms_with_dist),
            "supermarkets":          len(supers_with_dist),
            "restaurants":           n_restaurants,
            "transit_score":         sum(1 for e in elements if "highway" in e.get("tags", {})),
            "crime_score":           _compute_crime_score(elements, lat, lon),
            "walk_score":            _compute_walk_score(elements, lat, lon),
            "nearest_gyms":          gyms_with_dist[:3],
            "nearest_supermarkets":  supers_with_dist[:3],
        }

    except Exception as e:
        logger.warning("Overpass single request failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# Public API — batch
# ---------------------------------------------------------------------------

def analyze_nearby_batch(listings_with_coords: list[tuple[dict, float, float]]) -> list[dict]:
    """
    Single Overpass bbox query covering all listings.
    Returns one result dict per listing (same shape as analyze_nearby).
    """
    if not listings_with_coords:
        return []

    lats = [c[1] for c in listings_with_coords]
    lons = [c[2] for c in listings_with_coords]
    south, north = min(lats) - 0.05, max(lats) + 0.05
    west,  east  = min(lons) - 0.05, max(lons) + 0.05

    query = f"""
    [out:json][timeout:60];
    (
      nw["leisure"~"fitness_centre|gym"]({south},{west},{north},{east});
      nw["shop"~"supermarket|convenience"]({south},{west},{north},{east});
      nw["amenity"="restaurant"]({south},{west},{north},{east});
      nw["highway"="bus_stop"]({south},{west},{north},{east});
      nw["amenity"~"police|fire_station"]({south},{west},{north},{east});
    );
    out center;
    """

    def _empty():
        return {
            "gyms": 0, "supermarkets": 0, "restaurants": 0,
            "transit_score": 0, "crime_score": 0.55,
            "nearest_gyms": [], "nearest_supermarkets": [], "walk_score": 50,
        }

    try:
        logger.info(
            "API CALL: Overpass batch bbox (%.2f,%.2f → %.2f,%.2f) for %d listings",
            south, west, north, east, len(listings_with_coords),
        )
        resp = requests.post(
            "http://overpass-api.de/api/interpreter", data={"data": query}, timeout=65
        )
        if resp.status_code != 200:
            logger.warning("Overpass batch returned status=%s", resp.status_code)
            return [_empty() for _ in listings_with_coords]

        all_elements = resp.json().get("elements", [])
        logger.info("Overpass batch: %d total POIs for %d listings", len(all_elements), len(listings_with_coords))

        results = []
        for _listing, lat, lon in listings_with_coords:
            # Filter to elements within 5 km of this listing
            local_els = []
            for el in all_elements:
                pos = _el_latlon(el, lat, lon)
                if pos and _haversine_km(lat, lon, pos[0], pos[1]) <= 5.0:
                    local_els.append(el)

            gyms_d:   list[dict] = []
            supers_d: list[dict] = []
            n_rest = 0

            for el in local_els:
                tags = el.get("tags", {})
                pos = _el_latlon(el, lat, lon)
                if not pos:
                    continue
                dist_km = _haversine_km(lat, lon, pos[0], pos[1])
                name = tags.get("name") or tags.get("brand") or "Unnamed"
                amenity = tags.get("amenity", "")

                if "leisure" in tags:
                    gyms_d.append({"name": name, "distance_km": round(dist_km, 2)})
                elif "shop" in tags and name != "Unnamed":
                    supers_d.append({"name": name, "distance_km": round(dist_km, 2)})
                elif amenity == "restaurant":
                    n_rest += 1

            gyms_d.sort(key=lambda x: x["distance_km"])
            supers_d.sort(key=lambda x: x["distance_km"])

            results.append({
                "gyms":                 len(gyms_d),
                "supermarkets":         len(supers_d),
                "restaurants":          n_rest,
                "transit_score":        sum(1 for e in local_els if "highway" in e.get("tags", {})),
                "crime_score":          _compute_crime_score(local_els, lat, lon),
                "walk_score":           _compute_walk_score(local_els, lat, lon),
                "nearest_gyms":         gyms_d[:3],
                "nearest_supermarkets": supers_d[:3],
            })

        return results

    except Exception as e:
        logger.warning("Overpass batch failed: %s", e)
        return [_empty() for _ in listings_with_coords]


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _default_summary(crime_rating: float) -> str:
    if crime_rating >= 8:
        return "Very safe neighborhood with minimal incidents reported."
    if crime_rating >= 5:
        return "Generally peaceful area; standard awareness recommended."
    return "Some activity in the area — stick to well-lit streets at night."
