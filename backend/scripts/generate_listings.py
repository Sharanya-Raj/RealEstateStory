import pandas as pd
import random
from faker import Faker
import os

fake = Faker()
Faker.seed(42)
random.seed(42)

def generate_listings(num_listings=500):
    listings = []
    
    # Middlesex and Monmouth counties
    cities = [
        "Edison", "New Brunswick", "Woodbridge", "Piscataway", "East Brunswick", 
        "Red Bank", "Asbury Park", "Middletown", "Long Branch", "Freehold"
    ]
    
    zip_codes = {
        "Edison": ["08817", "08820", "08837"],
        "New Brunswick": ["08901", "08902"],
        "Woodbridge": ["07095"],
        "Piscataway": ["08854"],
        "East Brunswick": ["08816"],
        "Red Bank": ["07701"],
        "Asbury Park": ["07712"],
        "Middletown": ["07748"],
        "Long Branch": ["07740"],
        "Freehold": ["07728"]
    }

    for i in range(num_listings):
        city = random.choice(cities)
        zip_code = random.choice(zip_codes[city])
        
        bedrooms = random.choices([1, 2, 3, 4], weights=[0.4, 0.4, 0.15, 0.05])[0]
        bathrooms = random.choices([1, 1.5, 2, 2.5], weights=[0.5, 0.2, 0.2, 0.1])[0]
        if bedrooms == 1: bathrooms = 1
            
        sqft = random.randint(500, 1500) if bedrooms <= 2 else random.randint(1000, 2500)
        
        # Base rent loosely correlated to bedrooms
        base_rent = random.randint(1200, 2200) if bedrooms == 1 else \
                    random.randint(1800, 2800) if bedrooms == 2 else \
                    random.randint(2400, 3500)
                    
        has_gym = random.choice([True, False])
        has_grocery_nearby = random.choice([True, False])
        pet_friendly = random.choice([True, False])
        
        # Synthetic hidden costs
        parking_fee = random.choice([0, 50, 100, 150])
        amenity_fee = random.choice([0, 0, 25, 50, 75])
        avg_utilities = random.randint(80, 250)
        
        # Synthetic proximity metrics
        walk_score = random.randint(20, 98)
        transit_score = random.randint(10, 85)
        crime_rating = round(random.uniform(3.0, 9.5), 1)
        transit_time_to_hub = random.randint(10, 60) # minutes

        listing = {
            "id": f"L{i+1000}",
            "address": fake.street_address(),
            "city": city,
            "state": "NJ",
            "zip": zip_code,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "sqft": sqft,
            "base_rent": base_rent,
            "has_gym": has_gym,
            "has_grocery_nearby": has_grocery_nearby,
            "pet_friendly": pet_friendly,
            "parking_fee": parking_fee,
            "amenity_fee": amenity_fee,
            "avg_utilities": avg_utilities,
            "walk_score": walk_score,
            "transit_score": transit_score,
            "crime_rating": crime_rating,
            "transit_time_to_hub": transit_time_to_hub,
            "description": fake.text(max_nb_chars=150)
        }
        listings.append(listing)
        
    df = pd.DataFrame(listings)
    
    # Save to data directory
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'listings.csv')
    df.to_csv(output_path, index=False)
    print(f"Successfully generated {num_listings} mock listings at {output_path}")

if __name__ == "__main__":
    generate_listings()
