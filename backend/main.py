from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from market_fairness.schema import MarketFairnessInput, MarketFairnessOutput
from market_fairness.handler import run_market_fairness_agent
import sys
import os

# Ensure the backend directory is in the python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

app = FastAPI(title="Market Fairness API")

# Configure CORS so the frontend can call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/fairness", response_model=MarketFairnessOutput)
def evaluate_market_fairness(input_data: MarketFairnessInput):
    try:
        # Run our deterministic agent
        result = run_market_fairness_agent(input_data)
        
        # If the explanation contains an error because the zip code wasn't found,
        # return a 404 with the explanation. (Returning 200 with the error is also an option
        # depending on how you'd like the frontend to handle it).
        if "error" in result.explanation:
             raise HTTPException(status_code=404, detail=result.explanation["error"])
             
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok"}
