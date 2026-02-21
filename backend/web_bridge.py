# backend/web_bridge.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server import mcp, ListingQuery
import json
import asyncio

app = FastAPI(title="RealEstateStory Bridge")

# Allow the React frontend to hit this endpoint
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/evaluate")
async def evaluate_property(query: ListingQuery):
    """
    This endpoint acts as a bridge between the frontend and the FastMCP Agent.
    It calls the MCP tool directly. In a true decoupled environment, an MCP Client would connect to the MCP Server.
    For this hackathon, importing the tool function directly is a valid bridge.
    """
    from server import search_and_analyze_property
    
    # Run the MCP tool
    result_json_str = search_and_analyze_property(query)
    
    try:
        return json.loads(result_json_str)
    except json.JSONDecodeError:
        return {"error": "Failed to parse MCP tool output."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
