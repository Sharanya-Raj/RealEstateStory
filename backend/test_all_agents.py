#!/usr/bin/env python3
"""Comprehensive test of all agents to verify they work correctly"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
from log_config import setup_logging
setup_logging()

from agents.commute_agent import analyze_commute
from agents.budget_agent import analyze_budget
from agents.fairness_agent import analyze_fairness
from agents.neighborhood_agent import analyze_neighborhood
from agents.hidden_cost_agent import analyze_hidden_costs

# Test listing - realistic NJ apartment near Rutgers
test_listing = {
    "id": "test-001",
    "address": "100 College Ave, New Brunswick, NJ 08901",
    "base_rent": 1800,
    "price": 1800,
    "avg_utilities": 150,
    "parking_fee": 100,
    "pet_deposit": 500,
    "zip": "08901",
    "latitude": 40.4863,
    "longitude": -74.4518,
    "bedrooms": 2,
    "bathrooms": 1,
    "description": "Cozy 2BR apartment near campus. Pet-friendly. Water included. Tenant pays electric and gas. First month, last month, and security deposit required. Parking available for $100/mo. Application fee $50.",
}

test_college = "Rutgers University"
test_budget = 2500

print("=" * 70)
print("MULTI-AGENT SYSTEM TEST")
print("=" * 70)
print(f"\nTest Configuration:")
print(f"  Listing: {test_listing['address']}")
print(f"  Rent: ${test_listing['base_rent']}/mo")
print(f"  College: {test_college}")
print(f"  Budget: ${test_budget}/mo")
print(f"\nAPI Keys:")
print(f"  GEMINI_API_KEY: {'✓ Set' if os.getenv('GEMINI_API_KEY') else '✗ Not set'}")
print(f"  ELEVENLABS_API_KEY: {'✓ Set' if os.getenv('ELEVENLABS_API_KEY') else '✗ Not set'}")
print(f"  SUPABASE_URL: {'✓ Set' if os.getenv('SUPABASE_URL') else '✗ Not set'}")
print()

results = {}
errors = []

# Test 1: Commute Agent
print("-" * 70)
print("TEST 1: COMMUTE AGENT (The Conductor)")
print("-" * 70)
try:
    result = analyze_commute(test_listing, test_college)
    results['commute'] = result
    print(f"✓ Status: SUCCESS")
    print(f"  Total Minutes: {result.get('totalMinutes', 'N/A')}")
    print(f"  Walk Minutes: {result.get('walkMinutes', 'N/A')}")
    print(f"  Transit Minutes: {result.get('transitMinutes', 'N/A')}")
    print(f"  Insight: {result.get('llm_insight', 'N/A')[:100]}...")
    if not result.get('llm_insight'):
        print(f"  ⚠️ Warning: No LLM insight returned")
except Exception as e:
    print(f"✗ Status: FAILED")
    print(f"  Error: {str(e)}")
    errors.append(f"Commute Agent: {str(e)}")
print()

# Test 2: Budget Agent
print("-" * 70)
print("TEST 2: BUDGET AGENT (Lin)")
print("-" * 70)
try:
    result = analyze_budget(test_listing, test_budget)
    results['budget'] = result
    print(f"✓ Status: SUCCESS")
    print(f"  Match Score: {result.get('matchScore', 'N/A')}")
    print(f"  LLM Insight: {result.get('llm_insight', 'N/A')[:100]}...")
    print(f"  Cost Breakdown: {result.get('costBreakdown', {})}")
    if not result.get('llm_insight'):
        print(f"  ⚠️ Warning: No LLM insight returned")
except Exception as e:
    print(f"✗ Status: FAILED")
    print(f"  Error: {str(e)}")
    errors.append(f"Budget Agent: {str(e)}")
print()

# Test 3: Fairness Agent (Market Analysis)
print("-" * 70)
print("TEST 3: FAIRNESS AGENT (The Baron)")
print("-" * 70)
try:
    result = analyze_fairness(test_listing)
    results['fairness'] = result
    print(f"✓ Status: SUCCESS")
    print(f"  Historical Percent: {result.get('percentile', 'N/A')}")
    print(f"  Fairness Score: {result.get('fairnessScore', 'N/A')}")
    print(f"  Trend: {result.get('historicalTrend', 'N/A')}")
    explanation = result.get('explanation', {})
    if isinstance(explanation, dict):
        print(f"  Explanation: {explanation.get('summary', 'N/A')[:100]}...")
    else:
        print(f"  Explanation: {str(explanation)[:100]}...")
    print(f"  LLM Insight: {result.get('historicalInsight', 'N/A')[:100]}...")
    if not result.get('historicalInsight'):
        print(f"  ⚠️ Warning: No LLM insight returned")
except Exception as e:
    print(f"✗ Status: FAILED")
    print(f"  Error: {str(e)}")
    errors.append(f"Fairness Agent: {str(e)}")
print()

# Test 4: Neighborhood Agent
print("-" * 70)
print("TEST 4: NEIGHBORHOOD AGENT (Kiki)")
print("-" * 70)
try:
    result = analyze_neighborhood(test_listing)
    results['neighborhood'] = result
    print(f"✓ Status: SUCCESS")
    print(f"  Walk Score: {result.get('walkScore', 'N/A')}")
    print(f"  Crime Score: {result.get('crimeScore', 'N/A')}")
    print(f"  Safety Rating: {result.get('safety', {}).get('rating', 'N/A')}")
    print(f"  Nearby Amenities: {len(result.get('nearbyAmenities', []))} found")
    print(f"  LLM Insight: {result.get('llm_insight', 'N/A')[:100]}...")
    if not result.get('llm_insight'):
        print(f"  ⚠️ Warning: No LLM insight returned")
except Exception as e:
    print(f"✗ Status: FAILED")
    print(f"  Error: {str(e)}")
    errors.append(f"Neighborhood Agent: {str(e)}")
print()

# Test 5: Hidden Cost Agent
print("-" * 70)
print("TEST 5: HIDDEN COST AGENT (Soot Sprites)")
print("-" * 70)
try:
    result = analyze_hidden_costs(test_listing)
    results['hidden_costs'] = result
    print(f"✓ Status: SUCCESS")
    print(f"  Base Rent: ${result.get('baseRent', 'N/A')}")
    print(f"  Utilities: ${result.get('utilities', 'N/A')}")
    print(f"  Parking: ${result.get('parking', 'N/A')}")
    print(f"  True Monthly Total: ${result.get('trueCost', 'N/A')}")
    print(f"  Move-in Cost: ${result.get('moveInCost', 'N/A')}")
    print(f"  LLM Insight: {result.get('llm_insight', 'N/A')[:100]}...")
    if not result.get('llm_insight'):
        print(f"  ⚠️ Warning: No LLM insight returned")
except Exception as e:
    print(f"✗ Status: FAILED")
    print(f"  Error: {str(e)}")
    errors.append(f"Hidden Cost Agent: {str(e)}")
print()

# Summary
print("=" * 70)
print("TEST SUMMARY")
print("=" * 70)
print(f"Agents Tested: 5")
print(f"Successful: {len(results)}")
print(f"Failed: {len(errors)}")

if errors:
    print("\n❌ FAILED TESTS:")
    for error in errors:
        print(f"  • {error}")
else:
    print("\n✅ ALL AGENTS PASSED!")
    
    # Check for LLM issues
    llm_warnings = []
    for agent_name, result in results.items():
        has_insight = False
        if agent_name == 'fairness':
            has_insight = bool(result.get('historicalInsight'))
        else:
            has_insight = bool(result.get('llm_insight'))
        
        if not has_insight:
            llm_warnings.append(agent_name)
    
    if llm_warnings:
        print(f"\n⚠️  WARNING: {len(llm_warnings)} agent(s) returned empty LLM insights:")
        for agent in llm_warnings:
            print(f"  • {agent}")
        print("\nThis may indicate LLM API issues. Check logs above for details.")
    else:
        print("\n🎉 All agents returned LLM insights successfully!")

print("\n" + "=" * 70)
