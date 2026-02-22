# agents/commute_agent.py
import logging
import os
import re
import requests

logger = logging.getLogger("agents.commute")


def _get_commute_matrix_batch(
    apt_coords: list[tuple[float, float]],
    college_lon: float,
    college_lat: float,
) -> list[dict | None]:
    """
    OSRM Table API: one call for all apartments to one destination (college).
    Returns list of {driving_mins, distance_km} or None per listing.
    """
    if not apt_coords:
        return []
    # Coords: apt1;apt2;...;college. Format: lon,lat
    coord_str = ";".join(f"{lon},{lat}" for lat, lon in apt_coords) + f";{college_lon},{college_lat}"
    n_apts = len(apt_coords)
    sources = ";".join(str(i) for i in range(n_apts))
    destinations = str(n_apts)
    url = (
        f"http://router.project-osrm.org/table/v1/driving/{coord_str}"
        f"?sources={sources}&destinations={destinations}&annotations=duration,distance"
    )
    try:
        logger.info("API CALL: OSRM table (batch) %d apartments → college", n_apts)
        resp = requests.get(url, timeout=30, headers={"User-Agent": "ghibli-nest-app"})
        if not resp.ok:
            logger.warning("[COMMUTE] OSRM table non-OK: %s", resp.status_code)
            return [None] * n_apts
        data = resp.json()
        if data.get("code") != "Ok":
            return [None] * n_apts
        durations = data.get("durations") or []
        distances = data.get("distances") or []
        results = []
        for i in range(n_apts):
            dur = durations[i][0] if durations and durations[i] else None
            dist = distances[i][0] if distances and distances[i] else None
            if dur is not None and dist is not None:
                results.append({
                    "driving_mins": int(dur / 60),
                    "distance_km": dist / 1000,
                })
            else:
                results.append(None)
        logger.info("[COMMUTE] OSRM batch: %d/%d routes OK", sum(1 for r in results if r), n_apts)
        return results
    except Exception as e:
        logger.warning("[COMMUTE] OSRM table failed: %s", e)
        return [None] * n_apts


def _get_real_commute(apt_address: str, college_name: str) -> dict | None:
    """
    Geocode the apartment address and college via Nominatim, then fetch the
    driving route from the free OSRM public API.

    Returns a dict with:
        driving_mins  – actual driving time in minutes
        distance_km   – road distance in kilometres
    or None if geocoding / routing fails.
    """
    try:
        from services.geolocate import get_coordinates

        apt_geo = get_coordinates(apt_address)
        if not isinstance(apt_geo, dict) or not apt_geo.get("latitude"):
            logger.warning("[COMMUTE] Geocoding failed for apartment: %s", apt_address)
            return None

        college_geo = get_coordinates(college_name)
        if not isinstance(college_geo, dict) or not college_geo.get("latitude"):
            logger.warning("[COMMUTE] Geocoding failed for college: %s", college_name)
            return None

        apt_lat = apt_geo["latitude"]
        apt_lon = apt_geo["longitude"]
        col_lat = college_geo["latitude"]
        col_lon = college_geo["longitude"]

        # OSRM public routing API – no API key required
        url = (
            f"http://router.project-osrm.org/route/v1/driving/"
            f"{apt_lon},{apt_lat};{col_lon},{col_lat}?overview=false"
        )
        logger.info("API CALL: OSRM routing %s → %s", apt_address, college_name)
        resp = requests.get(url, timeout=10, headers={"User-Agent": "ghibli-nest-app"})
        if not resp.ok:
            logger.warning("[COMMUTE] OSRM non-OK response: %s", resp.status_code)
            return None

        data = resp.json()
        if data.get("code") != "Ok" or not data.get("routes"):
            logger.warning("[COMMUTE] OSRM returned no routes: %s", data.get("code"))
            return None

        duration_secs = data["routes"][0]["duration"]
        distance_m = data["routes"][0]["distance"]

        return {
            "driving_mins": int(duration_secs / 60),
            "distance_km": distance_m / 1000,
        }
    except Exception as e:
        logger.warning("[COMMUTE] Real commute lookup failed: %s", e)
        return None


def analyze_commute(listing: dict, college: str = "") -> dict:
    """
    The Conductor: Calculates travel time and converts to a commute score.

    When a college name is provided, geocodes both the apartment address and
    the college with Nominatim and fetches real driving time from OSRM.
    Falls back to the hardcoded heuristics derived from listing['transit_time_to_hub']
    if geocoding or routing is unavailable.

    Returns transit/driving/walking/biking times and a walk score.
    """
    # --- Hardcoded fallback values (existing logic preserved) ---
    fallback_hub_mins = listing.get('transit_time_to_hub', 20)
    driving_time  = f"{fallback_hub_mins // 2} mins"
    transit_time  = f"{fallback_hub_mins} mins"
    walking_time  = f"{fallback_hub_mins * 4} mins"
    biking_time   = f"{int(fallback_hub_mins * 1.5)} mins"
    walk_score    = listing.get('walk_score', 50)

    # --- Real routing via Nominatim + OSRM ---
    used_real_data = False
    if college:
        # Use raw address when it already contains a US zip (full address from listing source).
        # Avoid appending city/state/zip that may come from geocoding the search term (wrong for the listing).
        raw_addr = (listing.get("address") or "").strip()
        if raw_addr and re.search(r"\b\d{5}\b", raw_addr):
            apt_address = raw_addr
        else:
            addr_parts = [
                raw_addr or listing.get("address", ""),
                listing.get("city", ""),
                listing.get("state", ""),
                listing.get("zip", ""),
            ]
            apt_address = ", ".join(str(p) for p in addr_parts if p is not None and p != "")
        logger.info("[COMMUTE] Attempting real routing: '%s' → '%s'", apt_address, college)

        real = _get_real_commute(apt_address, college)
        if real:
            driving_mins = real["driving_mins"]
            distance_km  = real["distance_km"]

            driving_time = f"{driving_mins} mins"
            # NJ suburban transit adds ~40% over driving on average
            transit_time = f"{int(driving_mins * 1.4)} mins"
            # Biking at 15 km/h
            biking_time  = f"{max(1, int(distance_km / 15 * 60))} mins"
            # Walking at 5 km/h
            walking_time = f"{max(1, int(distance_km / 5 * 60))} mins"
            used_real_data = True
            logger.info(
                "[COMMUTE] Real route: %.1f km, %d mins driving (to %s)",
                distance_km, driving_mins, college,
            )
        else:
            logger.info("[COMMUTE] Real routing unavailable, using fallback heuristics")

    # --- LLM insight (Gemini or OpenRouter) ---
    logger.info("AGENT: commute calling LLM (Conductor insight)")
    insight_text = ""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if api_key:
        try:
            destination = college if college else "the university"
            data_source = "real routing data" if used_real_data else "estimated data"
            prompt = (
                f"You are the Conductor from Spirited Away, speaking about a train journey. "
                f"Based on {data_source}, the commute from this apartment to {destination} is: "
                f"driving {driving_time}, transit {transit_time}, "
                f"and the area has a walk score of {walk_score}/100. "
                f"Give 1 sentence advising the traveler on their commute options."
            )
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "google/gemini-2.5-flash",
                    "messages": [{"role": "user", "content": prompt}]
                },
                timeout=15
            )
            if response.ok:
                data = response.json()
                insight_text = data["choices"][0]["message"]["content"].strip().replace('"', '')
            else:
                logger.warning("[COMMUTE] LLM API failed: %s", response.status_code)
        except Exception as e:
            logger.warning("[COMMUTE] LLM exception: %s", e)
    
    # Fallback insight if LLM failed
    if not insight_text:
        destination = college if college else "campus"
        if transit_time < 30:
            insight_text = f"A swift {transit_time}-minute journey to {destination}. Your commute will be a breeze!"
        elif transit_time < 45:
            insight_text = f"A {transit_time}-minute commute to {destination} — manageable with good planning."
        elif transit_time < 60:
            insight_text = f"The {transit_time}-minute trek to {destination} is lengthy. Consider your schedule carefully."
        else:
            insight_text = f"Fair warning: {transit_time} minutes to {destination}. This commute will take a toll on your time and energy."

    return {
        "driving": driving_time,
        "transit": transit_time,
        "walking": walking_time,
        "biking": biking_time,
        "walkScore": walk_score,
        "llm_insight": insight_text,
    }
