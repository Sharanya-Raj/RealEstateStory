# agents/hidden_cost_agent.py
import os
import json
from google import genai
from pydantic import BaseModel

class GeminiFeeExtraction(BaseModel):
    has_hidden_fee_warnings: bool
    estimated_unstructured_fees: float
    analysis_reasoning: str

def analyze_hidden_costs(listing: dict) -> dict:
    """
    Soot Sprite: Explores parking, utilities, amenity fees.
    Uses Gemini 2.5 Flash to crawl the unstructured description text.
    Returns the final True Cost.
    """
    
    rent = float(listing.get('base_rent', 0))
    parking = float(listing.get('parking_fee', 0))
    amenities = float(listing.get('amenity_fee', 0))
    utilities = float(listing.get('avg_utilities', 0))
    
    description = listing.get('description', '')
    
    # Analyze description for unstructured fees using Gemini
    unstructured_fees = 0.0
    gemini_insight = "No unstructured text provided."
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key and description:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"Analyze this rental property description and identify any hidden monthly fees or strict penalties (e.g. pet rent, mandatory valet trash) that are not base rent. Estimate their monthly cost. Return JSON matching the schema. Description: {description}"
            
            response = client.models.generate_content(
                model='gemini-flash-latest',
                contents=prompt,
                config={
                    'response_mime_type': 'application/json',
                    'response_schema': GeminiFeeExtraction,
                },
            )
            
            # The SDK parses this automatically if structured correctly, or we load it
            result = json.loads(response.text)
            unstructured_fees = float(result.get('estimated_unstructured_fees', 0.0))
            if result.get('has_hidden_fee_warnings'):
                gemini_insight = result.get('analysis_reasoning', '')
                
        except Exception as e:
            gemini_insight = f"Gemini analysis failed: {str(e)}"
    
    true_cost = rent + parking + amenities + utilities + unstructured_fees
    
    # Transparency score is lower if fees are exceptionally high relative to rent
    hidden_fees = parking + amenities + unstructured_fees
    transparency_score = 100
    if hidden_fees > 0:
        ratio = hidden_fees / rent
        transparency_score = max(0, 100 - int(ratio * 200)) # 10% ratio drops score by 20
        
    return {
        "trueCost": true_cost,
        "transparencyScore": transparency_score,
        "fees": {
            "parking": parking,
            "amenities": amenities,
            "unstructured": unstructured_fees
        },
        "llm_insight": gemini_insight
    }
