#!/usr/bin/env python3
"""Quick verification that budget and neighborhood agents return insights"""
import os
from dotenv import load_dotenv
load_dotenv()

from agents.budget_agent import analyze_budget
from agents.neighborhood_agent import analyze_neighborhood

test_listing = {
    "base_rent": 1800,
    "avg_utilities": 150,
    "parking_fee": 100,
    "latitude": 40.4863,
    "longitude": -74.4518,
    "walk_score": 75,
}

print("Testing Budget Agent...")
budget_result = analyze_budget(test_listing, target_budget=2500)
print(f"  Match Score: {budget_result['matchScore']}")
print(f"  Has insight: {'YES' if budget_result.get('llm_insight') else 'NO'}")
print(f"  Insight: {budget_result.get('llm_insight', '')[:80]}...")

print("\nTesting Neighborhood Agent...")
neighborhood_result = analyze_neighborhood(test_listing)
print(f"  Walk Score: {neighborhood_result['walkScore']}")
print(f"  Safety Score: {neighborhood_result['safety']['score']}")
print(f"  Has insight: {'YES' if neighborhood_result.get('llm_insight') else 'NO'}")
print(f"  Insight: {neighborhood_result.get('llm_insight', '')[:80]}...")

if budget_result.get('llm_insight') and neighborhood_result.get('llm_insight'):
    print("\n SUCCESS - Both agents returning insights!")
else:
    print("\n FAILED - Missing insights")
