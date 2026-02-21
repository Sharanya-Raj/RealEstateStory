# agents/budget_agent.py
import os
from google import genai

def analyze_budget(listing: dict, target_budget: float) -> dict:
    """
    Lin (Star-Steward): Evaluates the rent against the student budget.
    Outputs a budget score (0-100) where >30% starts to hurt the score.
    """
    rent = float(listing.get('base_rent', 0))
    utilities = float(listing.get('avg_utilities', 0))
    
    total_estimated = rent + utilities
    
    # Very simple budget fit metric: 100 if well under budget, drops sharply if over
    budget_fit = 100
    if total_estimated > target_budget:
        overage = total_estimated - target_budget
        # lose 10 points for every $100 over budget
        budget_fit = max(0, 100 - (overage / 10))
    else:
        # Save points if under budget!
        budget_fit = min(100, 80 + ((target_budget - total_estimated) / 50))
        
    # Generate dynamic LLM insight using Gemini
    insight_text = ""
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"You are Lin from Spirited Away, a pragmatic worker evaluating budget. The user has ${target_budget}/mo. This property costs ${total_estimated}/mo (Rent: ${rent}, Util: ${utilities}). Give 1 punchy sentence telling them if it's a smart financial fit."
            response = client.models.generate_content(model='gemini-flash-latest', contents=prompt)
            if response.text: insight_text = response.text.strip().replace('"', '')
        except: pass
        
    return {
        "matchScore": int(budget_fit),
        "llm_insight": insight_text,
        "costBreakdown": {
            "rent": rent,
            "utilities": utilities,
            "transportation": 80, # static mock 
            "groceries": 200 # static mock
        }
    }
