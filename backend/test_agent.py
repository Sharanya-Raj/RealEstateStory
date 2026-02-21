from market_fairness.schema import MarketFairnessInput
from market_fairness.handler import run_market_fairness_agent
import json
import os
import sys

# Ensure the backend directory is in the python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_agent():
    print("--- Testing Market Fairness Agent ---\n")
    
    # Create sample input for a region that should exist in the data
    # (Using "New York" instead of a zip code because the Zillow CSV uses RegionName)
    sample_input = MarketFairnessInput(
        listing_id="LISTING_123",
        listing_rent=3500.0,
        zip_code="New York"
    )
    
    print(f"Input: {sample_input.model_dump_json(indent=2)}\n")
    
    try:
        # Run the agent
        output = run_market_fairness_agent(sample_input)
        
        print("Output Result:")
        print(output.model_dump_json(indent=2))
        
    except Exception as e:
        print(f"Error running agent: {e}")

if __name__ == "__main__":
    test_agent()
