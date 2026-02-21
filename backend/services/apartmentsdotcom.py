import requests
from bs4 import BeautifulSoup
import path
import sys
import os
from . import geolocate

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir, ".."))

from model import Apartment


def get_apartmentsdotcom(location):
    location = location.replace(" ", "-").lower()
    results = geolocate.get_coordinates(location)

    url = f"https://www.apartments.com/{results['name'].replace(' ', '-')}/"
    headers = {"User-Agent": "Mozilla/5.0"}
    
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, "html.parser")
    
    apartments = []
    
    for card in soup.select(".property"):
        try:
            name = card.select_one(".property-title").text.strip()
            price = card.select_one(".property-pricing").text.strip()
            
            apartments.append(
                Apartment(
                    name=name,
                    address=results['display_name'],
                    price=price if price else "N/A",  # demo fallback
                    bedrooms=2,
                    latitude=results['latitude'],
                    longitude=results['longitude'],
                    source="Apartments.com",
                    score=0
                )
            )
        except:
            continue

    return apartments

if __name__ == "__main__":
    print(get_apartmentsdotcom("Rutgers University"))