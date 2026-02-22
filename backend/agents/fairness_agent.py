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
    The Baron: Uses the real market_fairness module (ZORI/ZORDI data) to compute
    percentile position and fairness score, then adds LLM character insight.
    """
    zip_code = str(listing.get('zip', '08817'))
    rent = float(listing.get('base_rent', 1500))
    l_id = str(listing.get('id', 'mock_1'))
    city_name = str(listing.get('city', ''))
    
    historical_avg = rent
    trend = "stable"
    percentile = 50
    fairness_score = 50.0
    insight = "In line with current market trends"
    explanation = {}
    
    # ── Run the real Market Fairness Agent (ZORI/ZORDI computation) ──
    try:
        logger.info("AGENT: fairness calling run_market_fairness_agent (ZORI/ZORDI)")
        input_data = MarketFairnessInput(
            listing_id=l_id,
            listing_rent=rent,
            zip_code=city_name if city_name else zip_code  # ZORI uses city names
        )
        mf_result = run_market_fairness_agent(input_data)
        
        # Extract all computed data from the market_fairness module
        percentile = mf_result.percentile_position
        fairness_score = mf_result.fairness_score
        explanation = mf_result.explanation
        
        # Determine trend from fairness score
        if fairness_score < 40:
            trend = "up"
        elif fairness_score > 60:
            trend = "down"
            
        # Use the real explanation summary as insight
        if "summary" in explanation:
            insight = explanation["summary"]
        elif "error" in explanation:
            insight = explanation["error"]
            
        logger.info("AGENT: fairness result — score=%.1f, percentile=%.1f", fairness_score, percentile)
            
    except Exception as e:
        logger.warning("Fairness Agent Error: %s", e)
                
    historical_prices = [
        {"month": "Jan", "price": historical_avg * 0.9},
        {"month": "Feb", "price": historical_avg * 0.95},
        {"month": "Mar", "price": historical_avg},
        {"month": "Apr", "price": rent},
    ]

    api_key = os.environ.get("OPENROUTER_API_KEY")
    
    try:
        # 1. LLM fallback: generate historical data if ZORI had no data
        if "error" in str(explanation).lower() and api_key:
            logger.info("AGENT: fairness calling LLM for historical data (ZORI fallback)")
            prompt_data = f"""
You are a real estate AI. For the area of {city_name or zip_code} with current rent ${rent}:
Return strict JSON predicting realistic rent for the last 4 months and market percentile:
{{"p": (integer 0-100), "h": [{{"month": "Jan", "price": (int)}}, {{"month": "Feb", "price": (int)}}, {{"month": "Mar", "price": (int)}}, {{"month": "Apr", "price": (int)}}]}}
"""
            try:
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

        # 2. Baron's Insight — LLM generates character-themed summary
        if api_key:
            prompt = f"""You are The Baron from Whisper of the Heart, a dapper aristocrat cat giving distinguished real estate advice. 
The market analysis shows: fairness score {fairness_score:.0f}/100, percentile {percentile:.0f}th. 
Details: {explanation.get('details', insight)}
The rent is ${rent}. Give 1 elegant sentence telling the user if this is a fair market value."""
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
        
        # Fallback insight if LLM fails
        if not insight or insight == "In line with current market trends":
            if fairness_score < 40:
                insight = f"This rental sits at the {percentile:.0f}th percentile — notably above typical market rates for the area. Consider negotiating."
            elif fairness_score > 70:
                insight = f"A splendid find! At the {percentile:.0f}th percentile, this represents excellent value compared to similar properties."
            else:
                insight = f"Fair market value. The rent aligns with the {percentile:.0f}th percentile for this neighborhood."
                
    except Exception as e:
        logger.warning("Fairness Baron insight error: %s", e)
                
    return {
        "historicalInsight": insight,
        "historicalTrend": trend,
        "percentile": percentile,
        "fairnessScore": fairness_score,
        "explanation": explanation,
        "historicalPrices": historical_prices
    }
