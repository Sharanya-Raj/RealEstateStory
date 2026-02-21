# agents/fairness_agent.py
import json
import logging
import os
import requests
import sys

logger = logging.getLogger("agents.fairness")

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
    city_name = str(listing.get('city', ''))
    api_key = os.environ.get("OPEN_ROUTER_API_KEY")
    historical_avg = rent # fallback
    trend = "stable"
    percentile = 50
    insight = "In line with current market trends"
    
    # Run the Team's accurate Market Fairness Agent logic
    try:
        logger.info("AGENT: fairness calling run_market_fairness_agent (ZORI/ZORDI)")
        input_data = MarketFairnessInput(
            listing_id=l_id,
            listing_rent=rent,
            zip_code=city_name if city_name else zip_code  # ZORI uses city names, not zip codes
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
        logger.warning("Fairness Match Error: %s", e)
                
    historical_prices = [
        {"month": "Jan", "price": historical_avg * 0.9},
        {"month": "Feb", "price": historical_avg * 0.95},
        {"month": "Mar", "price": historical_avg},
        {"month": "Apr", "price": rent},
    ]

    api_key = os.environ.get("OPENROUTER_API_KEY")
    
    try:
        # 1. Hallucinate Historical Data if ZORI failed
        if percentile == 50 and "error" in insight.lower():
            logger.info("AGENT: fairness calling LLM for historical data (ZORI fallback)")
            prompt_data = f"""
You are a real estate AI. For zip code {zip_code} with current rent ${rent}:
Return strict JSON predicting realistic rent for the last 4 months and market percentile:
{{"p": (integer 0-100), "h": [{{"month": "Jan", "price": (int)}}, {{"month": "Feb", "price": (int)}}, {{"month": "Mar", "price": (int)}}, {{"month": "Apr", "price": (int)}}]}}
"""
            try:
                if api_key:
                    response = requests.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={"Authorization": f"Bearer {api_key}"},
                        json={
                            "model": "google/gemini-2.5-flash",
                            "messages": [{"role": "user", "content": prompt_data}],
                            "response_format": {"type": "json_object"}
                        },
                        timeout=15
                    )
                    if response.ok:
                        res_text = response.json()["choices"][0]["message"]["content"]
                        ai_json = json.loads(res_text.replace("```json", "").replace("```", "").strip())
                        percentile = ai_json.get("p", percentile)
                        historical_prices = ai_json.get("h", historical_prices)
            except Exception:
                pass

        # 2. Baron's Insight
        if api_key:
            prompt = f"You are The Baron from Whisper of the Heart, a dapper aristocrat cat giving distinguished real estate advice. The history indicates {insight}. The rent is ${rent}. Give 1 elegant sentence telling the user if this is a fair market value."
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "google/gemini-2.5-flash",
                    "messages": [{"role": "user", "content": prompt}]
                },
                timeout=10
            )
            if response.ok:
                data = response.json()
                insight = data["choices"][0]["message"]["content"].strip().replace('"', '')
    except Exception as e:
        logger.warning("Fairness Baron insight error: %s", e)
                
    return {
        "historicalInsight": insight,
        "historicalTrend": trend,
        "percentile": percentile,
        "historicalPrices": historical_prices
    }
