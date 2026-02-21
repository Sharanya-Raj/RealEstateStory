from pydantic import BaseModel
from typing import Dict

class MarketFairnessInput(BaseModel):
    listing_id: str
    listing_rent: float
    zip_code: str

class MarketFairnessOutput(BaseModel):
    listing_id: str
    fairness_score: float
    percentile_position: float
    explanation: Dict[str, str]
