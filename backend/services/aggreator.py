from services.zillow import get_zillow
from services.apartmentsdotcom import get_apartmentsdotcom
from services.geocode import get_coordinates
from services.scoring import score_apartment

def aggregate_apartments(university, max_price, bedrooms, radius):
    
    univ_lat, univ_lon = get_coordinates(university)

    listings = []

    listings += get_zillow(university)
    listings += get_apartmentsdotcom(university)

    # Filter
    filtered = []
    for apt in listings:
        if max_price and apt.price > max_price:
            continue
        if bedrooms and apt.bedrooms != bedrooms:
            continue
        filtered.append(apt)

    # Score
    for apt in filtered:
        apt.score = score_apartment(apt, univ_lat, univ_lon)

    return sorted(filtered, key=lambda x: x.score, reverse=True)[:10]