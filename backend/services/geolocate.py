import requests
import regex as re

cities = ["Princeton", "New Brunswick", "Camden", "Newark", "Piscataway", "Edison", "Woodbridge", "Toms River", "Hamilton", "Trenton", "Clifton", "Passaic", "Union City", "Bayonne", "Hackensack", "Jersey City", "Elizabeth", "Paterson", "Morristown", "Wayne", "West New York"]

def get_coordinates(place):
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": place, "format": "json"}
    
    response = requests.get(url, params=params, headers={"User-Agent": "apt-app"})
    data = response.json()
    
    print(data) #debugging

    if not data:
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

    return return_obj
if __name__ == "__main__":
    result = get_coordinates("Rutgers University")
    print("\n\n")
    # print(f"Latitude: {result['latitude']}, Longitude: {result['longitude']}, State: {result['state']}, Zipcode: {result['zipcode']}, Name: {result['display_name']}")