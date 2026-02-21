# backend/server.py
from fastmcp import FastMCP
from pydantic import BaseModel, Field
import json
import random
from data_loader import get_listings
from agents.kamaji import aggregate_insights
import re
from services.apartmentsdotcom import get_apartmentsdotcom

# Initialize FastMCP server
mcp = FastMCP("RealEstateStory")

class ListingQuery(BaseModel):
    address: str = Field(description="The address to search for (e.g., '123 Main St, Edison NJ'). In our mock dataset, we will try to match the city or zip.")
    budget: float = Field(default=1500.0, description="The user's monthly budget for the rental.")

@mcp.tool()
def search_and_analyze_property(query: ListingQuery) -> str:
    """
    Triggers the RealEstateStory agentic pipeline.
    It takes an address, finds the closest mock listing, and runs all 6 Ghibli agents (Conductor, Lin, Baron, Kiki, Soot Sprite, and Kamaji) on it.
    Returns the comprehensive aggregated insights.
    """
    df = get_listings()
    # 1. Try fetching real data via team's scraper
    matched_listing = None
    try:
        real_apts = get_apartmentsdotcom(query.address)
        if real_apts:
            apt = real_apts[0]
            # Clean price string like "$1,200"
            price_str = re.sub(r'[^\d]', '', apt.price)
            base_rent = int(price_str) if price_str else 1500
            
            # Extract basic zipcode from address for fairness module
            zip_match = re.search(r'\b\d{5}\b', apt.address)
            zipcode = zip_match.group(0) if zip_match else "00000"
            
            matched_listing = {
                "id": "apt_real_1",
                "name": apt.name,
                "address": apt.address,
                "city": "Unknown",
                "state": "Unknown",
                "zip": zipcode,
                "base_rent": base_rent,
                "bedrooms": apt.bedrooms,
                "bathrooms": 1,
                "sqft": 800,
                "pet_friendly": True,
                "description": f"A beautiful property found dynamically on {apt.source}."
            }
    except Exception as e:
        print(f"Scraper error: {e}")
        pass
        
    # 2. Fallback to Mock Data if no real data found
    if not matched_listing:
        if not df.empty:
            query_lower = query.address.lower()
            possible_matches = df[df['city'].str.lower().apply(lambda x: x in query_lower)]
            
            if not possible_matches.empty:
                matched_listing = possible_matches.sample(1).iloc[0].to_dict()
            else:
                matched_listing = df.sample(1).iloc[0].to_dict()
            
    if not matched_listing:
        return json.dumps({"error": "No listings available. Please ensure data is generated."})
    
    # Run the full agent pipeline (Kamaji orchestrates the other 5)
    insights = aggregate_insights(matched_listing, query.budget)
    
    return json.dumps(insights, indent=2)

if __name__ == "__main__":
    # You can run this file directly to test the stdio transport, 
    # or you can use `mcp run server.py` 
    mcp.run()
