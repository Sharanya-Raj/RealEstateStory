import logging
import json
import re
import requests
from bs4 import BeautifulSoup
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(current_dir, ".."))
sys.path.insert(0, current_dir)

from model import Apartment
import geolocate

logger = logging.getLogger("services.craigslist")

def get_craigslist(location: str, max_price: float | None = None) -> list[Apartment]:
    """
    Search Craigslist New Jersey for apartments near the target location.
    Uses geographical coordinates (search_distance=10, lat, lon) rather than a text query.
    Extracts prices from HTML to bypass recent JSON-LD scraping protections.
    """
    logger.info("Craigslist: starting search for %s", location)
    
    # 1. Geocode the university/location to get the exact center point
    geo = geolocate.get_coordinates(location)
    if not isinstance(geo, dict) or not geo.get("latitude") or not geo.get("longitude"):
        logger.warning("Craigslist: Could not geocode %s", location)
        return []
        
    lat = geo.get("latitude")
    lon = geo.get("longitude")
    
    # Standard 10 mile radius
    url = f"https://newjersey.craigslist.org/search/apa?search_distance=10&lat={lat}&lon={lon}"
    
    try:
        response = requests.get(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }, timeout=15)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        logger.error("Craigslist Request Failed: %s", e)
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    
    # 2. Extract JSON-LD for metadata (beds, baths, map coordinates)
    script = soup.find("script", id="ld_searchpage_results")
    if not script:
        logger.warning("Craigslist: No JSON-LD data found.")
        return []
        
    try:
        data = json.loads(script.string)
    except json.JSONDecodeError:
        logger.error("Craigslist: Failed to parse JSON-LD")
        return []

    items = data.get("itemListElement", [])
    
    # DEBUG: Log first item to see structure
    if items:
        logger.info("DEBUG: First Craigslist item structure:")
        first = items[0]
        logger.info("  Type: %s", type(first))
        logger.info("  Keys: %s", list(first.keys()) if isinstance(first, dict) else "N/A")
        inner = first.get("item", first) if isinstance(first, dict) else first
        logger.info("  Inner keys: %s", list(inner.keys()) if isinstance(inner, dict) else "N/A")
        if isinstance(inner, dict):
            logger.info("  Has 'geo'? %s", "geo" in inner)
            if "geo" in inner:
                logger.info("  Geo data: %s", inner.get("geo"))
    
    # 3. Extract HTML static elements for prices (Recent CL update removed them from JSON)
    html_items = soup.select('.cl-static-search-result')
    
    seen_urls = set()
    apartments = []
    
    for i, item_entry in enumerate(items):
        try:
            # Structure handles both "ListItem" wrappers and direct entries
            inner_item = item_entry.get("item", item_entry)
            
            url = ""
            price = "N/A"
            
            # Extract basic data depending on JSON structure
            if isinstance(inner_item, str):
                url = inner_item
                inner_item = item_entry
            else:
                url = inner_item.get("url", "")
                offers = inner_item.get("offers", {})
                price_val = offers.get("price")
                if price_val is not None:
                    price = f"${price_val}"
            
            # Fallback to visual DOM matching based on list index alignment
            if i < len(html_items):
                html_node = html_items[i]
                if not url:
                    a_tag = html_node.select_one('a')
                    if a_tag:
                        url = a_tag.get('href', url)
                if price == "N/A":
                    p_tag = html_node.select_one('.price')
                    if p_tag:
                        price = p_tag.text.strip()
            
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            
            # Numeric conversion for Max Price checks
            num_price: float = 0.0
            nums = re.findall(r"[\d,]+", price)
            if nums:
                num_price = float(nums[0].replace(",", ""))
                
            if max_price is not None and num_price > max_price:
                continue

            name = inner_item.get("name", "Apartment Listing")
            
            # Extract geo coordinates from Craigslist JSON-LD (building-specific!)
            geo_node = inner_item.get("geo", {})
            
            # DEBUG: Log first 3 items' geo data
            if i < 3:
                logger.info("  Item %d geo_node: %s", i, geo_node)
            
            item_lat = float(geo_node.get("latitude", 0.0)) if geo_node.get("latitude") else 0.0
            item_lon = float(geo_node.get("longitude", 0.0)) if geo_node.get("longitude") else 0.0
            
            # Extract address components
            address_node = inner_item.get("address", {})
            street = address_node.get("streetAddress", "")
            city = address_node.get("addressLocality", "")
            state = address_node.get("addressRegion", "NJ")
            zipcode = address_node.get("postalCode", "")
            
            # Build full address - prefer street address if available
            if street:
                full_address = f"{street}, {city}, {state} {zipcode}".strip()
            elif city:
                full_address = f"{city}, {state}".strip()
            else:
                full_address = f"{location} Area"
            
            # Log if we have specific coords from Craigslist
            if item_lat != 0.0 and item_lon != 0.0:
                logger.debug(f"  CL coords for {name[:30]}: ({item_lat:.4f}, {item_lon:.4f})")
            
            apartments.append(Apartment(
                name=name,
                address=full_address,
                price=price,
                bedrooms=int(inner_item.get("numberOfBedrooms", 1) or 1),
                latitude=item_lat,
                longitude=item_lon,
                source="Craigslist",
                score=0.0,
                amenities=[] 
            ))
            
        except Exception as e:
            logger.warning("Error parsing Craigslist listing index %d: %s", i, e)

    return apartments
