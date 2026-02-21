import logging
import requests
import re

logger = logging.getLogger("services.geolocate")

cities = ["Princeton", "New Brunswick", "Camden", "Newark", "Piscataway", "Edison", "Woodbridge", "Toms River", "Hamilton", "Trenton", "Clifton", "Passaic", "Union City", "Bayonne", "Hackensack", "Jersey City", "Elizabeth", "Paterson", "Morristown", "Wayne", "West New York"]


def get_coordinates(place):
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": place, "format": "json"}
    logger.info("API CALL: Nominatim/OpenStreetMap geocode place=%r", place)
    response = requests.get(url, params=params, headers={"User-Agent": "apt-app"})
    data = response.json()
    
    if not data:
        logger.warning("API RETURN: Nominatim no results for place=%r", place)
        return 0, 0, ""  # Default to (0, 0) if no results found

    return_obj = {
        "name": place,
        "latitude": float(data[0]["lat"]),
        "longitude": float(data[0]["lon"]),
        "city": next((city for city in cities if city in data[0].get("display_name", "")), ""),
        "state": "nj",
        "zipcode": re.search(r"\b\d{5}\b", data[0]["display_name"]).group() if re.search(r"\b\d{5}\b", data[0]["display_name"]) else "",
        "display_name": str(data[0]["display_name"])
    }
    logger.info("API RETURN: Nominatim lat=%.4f lon=%.4f for place=%r", return_obj["latitude"], return_obj["longitude"], place)
    return return_obj


def geocode_address(address):
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": address, "format": "json"}
    logger.info("API CALL: Nominatim/OpenStreetMap geocode_address address=%r", address)
    response = requests.get(url, params=params, headers={"User-Agent": "apt-app"})
    data = response.json()

    if not data:
        return 0, 0, ""  # Default to (0, 0) if no results found
    
    return_obj = {
        "name": address,
        "latitude": float(data[0]["lat"]),
        "longitude": float(data[0]["lon"]),
        "city": next((city for city in cities if city in data[0].get("display_name", "")), ""),
    }

    return return_obj

if __name__ == "__main__":
    result = get_coordinates("Rutgers University")
    print("\n\n")
    # print(f"Latitude: {result['latitude']}, Longitude: {result['longitude']}, State: {result['state']}, Zipcode: {result['zipcode']}, Name: {result['display_name']}")