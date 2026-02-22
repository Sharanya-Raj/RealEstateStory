import logging
import os
import re
import sys
import time
import undetected_chromedriver as uc
from selenium import webdriver

logger = logging.getLogger("services.apartmentsdotcom")
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup

# Add parent dir (backend/) for model import, and current dir (services/) for geolocate
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(current_dir, ".."))
sys.path.insert(0, current_dir)

from model import Apartment
import geolocate

def _parse_beds(bed_text):
    """Convert bed label like '1 Bed', '2 Beds', 'Studio' to an integer."""
    bed_text = bed_text.strip().lower()
    if "studio" in bed_text:
        return 0
    match = re.search(r"(\d+)", bed_text)
    return int(match.group(1)) if match else 1

def _get_driver():
    """Initialize a reusable headless Chrome driver."""
    options = Options()
    # options.add_argument("--headless=new")
    # options.add_argument("head")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    )
    return uc.Chrome(options=options)

def _parse_price(price_str: str) -> int | None:
    """Parse price string like '$1,200' or '1200' to int. Returns None if unparseable."""
    if not price_str or price_str.upper() in ("N/A", "CALL", "CALL FOR PRICE", ""):
        return None
    digits = re.sub(r"[^\d]", "", price_str)
    return int(digits) if digits else None


def get_apartmentsdotcom(location, max_price: float | None = None):
    """
    Scrape Apartments.com for listings near the given location.
    If max_price is set, only listings with price <= max_price are added.
    """
    logger.info("API: Apartments.com scrape starting for location=%r, max_price=%s", location, max_price)
    geo = geolocate.get_coordinates(location)


    
    # geolocate returns (0,0,"") tuple on failure, or dict with latitude/longitude on success
    if not isinstance(geo, dict) or not geo.get("latitude") or not geo.get("longitude"):
        logger.warning("Apartments.com: Could not geocode location=%r (got %s)", location, type(geo).__name__)
        return []

    city = geo.get("city", "").replace(" ", "-").lower()
    state = geo.get("state", "nj").lower()
    univ_slug = location.replace(" ", "-").lower()

# Base URL construction
    if location.lower() == "rutgers university":
        # base_url = "https://www.apartments.com/off-campus-housing/nj/new-brunswick/rutgers-university/"
        base_url = "https://www.apartments.com/new-brunswick-nj/"
        
        if not isinstance(geo, dict) or not geo.get("latitude"):
            geo = {"latitude": 40.4862, "longitude": -74.4518, "city": "New Brunswick", "state": "nj"}

    else:
        if not isinstance(geo, dict) or not geo.get("latitude") or not geo.get("longitude"):
            logger.warning("Could not geocode location=%r", location)
            return []
        city = geo.get("city", "").replace(" ", "-").lower()
        state = geo.get("state", "nj").lower()
        univ_slug = location.replace(" ", "-").lower()
        if city:
            base_url = f"https://www.apartments.com/off-campus-housing/{state}/{city}/{univ_slug}/"
        else:
            base_url = f"https://www.apartments.com/off-campus-housing/{state}/{univ_slug}/"

    all_apartments = []
    current_page_url = base_url
    driver = _get_driver()

    try:
        while current_page_url:
            logger.info("API: Apartments.com fetching page %s", current_page_url)
            driver.get(current_page_url)
            time.sleep(10)  # Allow JS to load
            
            soup = BeautifulSoup(driver.page_source, "html.parser")
            listings = soup.find_all("article", attrs={"data-listingid": True})
            
            if not listings:
                logger.info("Apartments.com: No listings found on page, ending search")
                break

            for article in listings:
                try:
                    # Name
                    name_el = article.select_one(".js-placardTitle.title")
                    if not name_el: continue
                    name = name_el.text.strip()

                    # Address
                    address_el = article.select_one(".property-address")
                    address = address_el.get("title") or address_el.text.strip() if address_el else geo.get("display_name", location)


                    #Amenities
                    amenities = []
                    amenity_els = article.select(".property-amenities span")
                    for amenity_el in amenity_els:
                        amenities.append(amenity_el.text.strip())         

                    # Price/Beds
                    bed_rows = article.select(".bedRentBox")
                    if bed_rows:
                        for row in bed_rows:
                            bed_el = row.select_one(".bedTextBox")
                            price_el = row.select_one(".priceTextBox span")
                            if not bed_el or not price_el: continue

                            price_str = price_el.text.strip()
                            if max_price is not None:
                                parsed = _parse_price(price_str)
                                if parsed is not None and parsed > max_price:
                                    continue  # Skip over-budget listings

                            all_apartments.append(Apartment(
                                name=name, address=address, price=price_str,
                                bedrooms=_parse_beds(bed_el.text),
                                latitude=geo.get("latitude", 0.0), longitude=geo.get("longitude", 0.0),
                                source="Apartments.com", score=0.0,
                                amenities=amenities
                            ))
                    else:
                        # No bed/price rows - only include if no max_price filter, or we can't filter
                        if max_price is not None:
                            continue  # Skip listings with no parseable price when filtering
                        all_apartments.append(Apartment(
                            name=name, address=address, price="N/A", bedrooms=1,
                            latitude=geo.get("latitude", 0.0), longitude=geo.get("longitude", 0.0),
                            source="Apartments.com", score=0.0,
                            amenities=amenities
                        ))
                except Exception as e:
                    logger.warning("Apartments.com: Error parsing listing card: %s", e)

            # --- PAGINATION LOGIC ---
            # Look for the 'next' button in the pagination nav
            next_button = soup.select_one("a.next")
            if next_button and next_button.get("href"):
                current_page_url = next_button.get("href")
                # Ensure the URL is absolute
                if not current_page_url.startswith("http"):
                    current_page_url = "https://www.apartments.com" + current_page_url
            else:
                current_page_url = None # Exit loop if no next page

    finally:
        driver.quit()

    logger.info("API: Apartments.com scrape completed, total listings=%d", len(all_apartments))
    return all_apartments

if __name__ == "__main__":
    results = get_apartmentsdotcom("Princeton University")
    # results = get_apartmentsdotcom("Rutgers University")
    for apt in results:
        print(f"{apt.name} - {apt.price} - {apt.bedrooms} beds - {apt.address}")