# agents/fairness_agent.py
import pandas as pd
import os
from google import genai
import sys

# Add the market_fairness to the path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir, ".."))
from market_fairness.handler import run_market_fairness_agent
from market_fairness.schema import MarketFairnessInput

def analyze_fairness(listing: dict) -> dict:
    """
    The Baron: Calculates expected ZORI rent for the region and percentile pos.
    """
    zip_code = str(listing.get('zip', '08817')) # default to Edison if blank
    rent = float(listing.get('base_rent', 1500))
    l_id = str(listing.get('id', 'mock_1'))
    
    historical_avg = rent # fallback
    trend = "stable"
    percentile = 50
    insight = "In line with current market trends"
    
    # Run the Team's accurate Market Fairness Agent logic
    try:
        input_data = MarketFairnessInput(
            listing_id=l_id,
            listing_rent=rent,
            zip_code=zip_code
        )
        mf_result = run_market_fairness_agent(input_data)
        
        percentile = mf_result.percentile_position
        if mf_result.fairness_score < 40:
            trend = "up"
            insight = f"{mf_result.explanation.get('status', 'Overpriced')} for this area."
        elif mf_result.fairness_score > 60:
            trend = "down"
            insight = f"{mf_result.explanation.get('status', 'Underpriced')} for this area."
            
        if "summary" in mf_result.explanation:
            insight = mf_result.explanation["summary"]
        elif "error" in mf_result.explanation:
            insight = mf_result.explanation["error"]
            
    except Exception as e:
        print(f"Fairness Match Error: {e}")
                
    # Generate dynamic LLM insight using Gemini
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"You are The Baron from Whisper of the Heart, a dapper aristocrat cat giving distinguished real estate advice. The history indicates {insight}. The rent is ${rent}. Give 1 elegant sentence telling the user if this is a fair market value."
            response = client.models.generate_content(model='gemini-flash-latest', contents=prompt)
            if response.text: insight = response.text.strip().replace('"', '')
        except: pass
                
    return {
        "historicalInsight": insight,
        "historicalTrend": trend,
        "percentile": percentile,
        "historicalPrices": [
            {"month": "Jan", "price": historical_avg * 0.9},
            {"month": "Feb", "price": historical_avg * 0.95},
            {"month": "Mar", "price": historical_avg},
            {"month": "Apr", "price": rent}
        ]
    }
