import dataclasses
import json
import logging
import os
import re
import sys
import time
import undetected_chromedriver as uc
from seleniumbase import SB
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

logger = logging.getLogger("services.apartmentsdotcom")

# Add parent dir (backend/) for model import, and current dir (services/) for geolocate
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(current_dir, ".."))
sys.path.insert(0, current_dir)

from model import Apartment
import geolocate

SCRAPE_CACHE_DIR = os.path.join(os.path.dirname(current_dir), "data", "scrape_cache")


def _cache_slug(location: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", location.strip().lower()).strip("-")


def _load_cache(location: str) -> list[Apartment] | None:
    slug = _cache_slug(location)
    path = os.path.join(SCRAPE_CACHE_DIR, f"{slug}.json")
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            rows = json.load(f)
        apts = [Apartment(**row) for row in rows]
        logger.info("SCRAPE CACHE HIT: loaded %d apartments from %s", len(apts), path)
        return apts
    except Exception as e:
        logger.warning("SCRAPE CACHE: failed to read %s: %s", path, e)
        return None


def _save_cache(location: str, apartments: list[Apartment]) -> None:
    os.makedirs(SCRAPE_CACHE_DIR, exist_ok=True)
    slug = _cache_slug(location)
    path = os.path.join(SCRAPE_CACHE_DIR, f"{slug}.json")
    try:
        rows = [dataclasses.asdict(a) for a in apartments]
        with open(path, "w", encoding="utf-8") as f:
            json.dump(rows, f, indent=2)
        logger.info("SCRAPE CACHE SAVED: %d apartments → %s", len(apartments), path)
    except Exception as e:
        logger.warning("SCRAPE CACHE: failed to write %s: %s", path, e)


def _parse_beds(bed_text):
    """Convert bed label like '1 Bed', '2 Beds', 'Studio' to an integer."""
    bed_text = bed_text.strip().lower()
    if "studio" in bed_text:
        return 0
    match = re.search(r"(\d+)", bed_text)
    return int(match.group(1)) if match else 1


def _parse_price(price_str: str) -> int | None:
    """Parse price string like '$1,200' or '1200' to int. Returns None if unparseable."""
    if not price_str or price_str.upper() in ("N/A", "CALL", "CALL FOR PRICE", ""):
        return None
    digits = re.sub(r"[^\d]", "", price_str)
    return int(digits) if digits else None


def _parse_listings_from_soup(
    soup,
    geo: dict,
    location: str,
    max_price: float | None,
    min_beds: int = 1,
    require_parking: bool = False,
) -> list:
    """
    Shared parsing logic using BeautifulSoup. Same for Princeton (uc/Selenium) and other schools (SB/Playwright).
    min_beds: skip bed rows with fewer bedrooms than this (1=studio+, 2=1bed+, 3=2bed+)
    require_parking: skip articles where no amenity mentions "parking"
    """
    apartments = []
    listings = soup.find_all("article", attrs={"data-listingid": True})

    for article in listings:
        try:
            name_el = article.select_one(".js-placardTitle.title")
            if not name_el:
                continue
            name = name_el.text.strip()

            address_el = article.select_one(".property-address")
            address = address_el.get("title") or address_el.text.strip() if address_el else geo.get("display_name", location)

            amenities = []
            amenity_els = article.select(".property-amenities span")
            for amenity_el in amenity_els:
                amenities.append(amenity_el.text.strip())

            # Parking filter: skip this entire listing if parking is required but not listed
            if require_parking:
                amenity_text = " ".join(amenities).lower()
                if "parking" not in amenity_text:
                    logger.debug("Apartments.com: skipping %r — no parking amenity", name)
                    continue

            bed_rows = article.select(".bedRentBox")
            if bed_rows:
                for row in bed_rows:
                    bed_el = row.select_one(".bedTextBox")
                    price_el = row.select_one(".priceTextBox span")
                    if not bed_el or not price_el:
                        continue

                    beds = _parse_beds(bed_el.text)
                    # Beds filter: skip rows that don't meet the minimum
                    if beds < min_beds:
                        continue

                    price_str = price_el.text.strip()
                    if max_price is not None:
                        parsed = _parse_price(price_str)
                        if parsed is not None and parsed > max_price:
                            continue

                    apartments.append(Apartment(
                        name=name,
                        address=address,
                        price=price_str,
                        bedrooms=beds,
                        latitude=geo.get("latitude", 0.0),
                        longitude=geo.get("longitude", 0.0),
                        source="Apartments.com",
                        score=0.0,
                        amenities=amenities,
                    ))
            else:
                # No bed rows — only include if min_beds == 1 (solo) and price is fine
                if min_beds > 1 or max_price is not None:
                    continue
                apartments.append(Apartment(
                    name=name,
                    address=address,
                    price="N/A",
                    bedrooms=1,
                    latitude=geo.get("latitude", 0.0),
                    longitude=geo.get("longitude", 0.0),
                    source="Apartments.com",
                    score=0.0,
                    amenities=amenities,
                ))
        except Exception as e:
            logger.warning("Apartments.com: Error parsing listing card: %s", e)

    return apartments


def _get_driver():
    """Initialize uc Chrome driver (used for Princeton only)."""
    options = uc.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    )
    return uc.Chrome(options=options)


def _filter_cached(apartments: list[Apartment], max_price: float | None, min_beds: int, require_parking: bool) -> list[Apartment]:
    """Apply runtime filters to cached apartments."""
    out = []
    for apt in apartments:
        if min_beds > 1 and apt.bedrooms < min_beds:
            continue
        if max_price is not None:
            parsed = _parse_price(apt.price)
            if parsed is not None and parsed > max_price:
                continue
        if require_parking:
            amenity_text = " ".join(apt.amenities or []).lower()
            if "parking" not in amenity_text:
                continue
        out.append(apt)
    return out


def get_apartmentsdotcom(
    location,
    max_price: float | None = None,
    min_beds: int = 1,
    require_parking: bool = False,
):
    """
    Scrape Apartments.com for listings near the given location.
    Checks a local JSON cache first (instant for demos); if no cache,
    scrapes live and saves results for next time.
    """
    logger.info(
        "API: Apartments.com starting for location=%r, max_price=%s, min_beds=%d, parking=%s",
        location, max_price, min_beds, require_parking,
    )

    # ── Check cache first ─────────────────────────────────────────────
    cached = _load_cache(location)
    if cached is not None:
        filtered = _filter_cached(cached, max_price, min_beds, require_parking)
        logger.info(
            "SCRAPE CACHE: %d/%d apartments passed filters (max_price=%s, min_beds=%d)",
            len(filtered), len(cached), max_price, min_beds,
        )
        return filtered

    # ── No cache — scrape live ────────────────────────────────────────
    logger.info("SCRAPE CACHE MISS for %r — scraping live", location)
    geo = geolocate.get_coordinates(location)

    if not isinstance(geo, dict) or not geo.get("latitude") or not geo.get("longitude"):
        logger.warning("Apartments.com: Could not geocode location=%r (got %s)", location, type(geo).__name__)
        return []

    city = geo.get("city", "").replace(" ", "-").lower()
    state = geo.get("state", "nj").lower()
    univ_slug = location.replace(" ", "-").lower()

    loc_lower = location.strip().lower()
    if "rutgers" in loc_lower and ("university" in loc_lower or "new brunswick" in loc_lower):
        base_url = "https://www.apartments.com/off-campus-housing/nj/new-brunswick/rutgers-university/"
    elif "new jersey institute" in loc_lower or "njit" in loc_lower:
        base_url = "https://www.apartments.com/off-campus-housing/nj/newark/new-jersey-institute-of-technology/"
    elif city:
        base_url = f"https://www.apartments.com/off-campus-housing/{state}/{city}/{univ_slug}/"
    else:
        base_url = f"https://www.apartments.com/off-campus-housing/{state}/{univ_slug}/"

    # Scrape with NO price/bed filters so cache is reusable for any budget
    all_apartments: list[Apartment] = []

    logger.info("Apartments.com: Using SB + Playwright for %r", location)
    logger.info("Apartments.com: Target URL = %s", base_url)
    with SB(uc=True, headless=True) as sb:
        debugger_address = sb.driver.capabilities["goog:chromeOptions"]["debuggerAddress"]
        cdp_url = f"http://{debugger_address}"

        with sync_playwright() as p:
            browser = p.chromium.connect_over_cdp(cdp_url)
            context = browser.contexts[0]
            page = context.pages[0]

            current_page_url = base_url
            while current_page_url:
                logger.info("API: Apartments.com fetching page %s", current_page_url)
                page.goto(current_page_url)
                page.wait_for_timeout(10000)
                html = page.content()
                soup = BeautifulSoup(html, "html.parser")
                page_apts = _parse_listings_from_soup(
                    soup, geo, location,
                    max_price=None, min_beds=1, require_parking=False,
                )
                all_apartments.extend(page_apts)
                logger.info("Apartments.com: Page parsed — %d new listings (%d total so far)", len(page_apts), len(all_apartments))
                if not soup.find_all("article", attrs={"data-listingid": True}):
                    logger.info("Apartments.com: No listings found on page, ending search")
                    break
                next_button = soup.select_one("a.next")
                if next_button and next_button.get("href"):
                    current_page_url = next_button.get("href")
                    if not current_page_url.startswith("http"):
                        current_page_url = "https://www.apartments.com" + current_page_url
                else:
                    current_page_url = None

    logger.info("API: Apartments.com scrape completed, total listings=%d", len(all_apartments))

    # Save unfiltered results to cache for future runs
    if all_apartments:
        _save_cache(location, all_apartments)

    # Apply runtime filters before returning
    return _filter_cached(all_apartments, max_price, min_beds, require_parking)


if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(name)s | %(message)s")

    parser = argparse.ArgumentParser(description="Scrape & cache apartments for demo")
    parser.add_argument("--schools", nargs="*", default=["Princeton University", "Rutgers New Brunswick"],
                        help="Schools to scrape (default: Princeton + Rutgers)")
    args = parser.parse_args()

    for school in args.schools:
        print(f"\n{'='*60}")
        print(f"  Scraping: {school}")
        print(f"{'='*60}")
        results = get_apartmentsdotcom(school)
        print(f"\n  >> {len(results)} apartments scraped & cached for {school}")
        for apt in results:
            print(f"    {apt.name} - {apt.price} - {apt.bedrooms} beds - {apt.address}")
