#!/usr/bin/env python3
"""Quick test of budget_agent to diagnose LLM issues"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
from log_config import setup_logging
setup_logging()

from agents.budget_agent import analyze_budget

# Test listing
test_listing = {
    "base_rent": 1800,
    "avg_utilities": 150,
    "parking_fee": 100,
}

print("=" * 60)
print("BUDGET AGENT TEST")
print("=" * 60)
print(f"\nTest Listing: Rent=${test_listing['base_rent']}, Utilities=${test_listing['avg_utilities']}")
print(f"Target Budget: $2500/mo")
print("\nChecking API key configuration...")
print(f"  GEMINI_API_KEY: {'✓ Set' if os.getenv('GEMINI_API_KEY') else '✗ Not set'}")
print(f"  USE_OPENROUTER: {os.getenv('USE_OPENROUTER', '0')}")
print(f"  OPENROUTER_API_KEY: {'✓ Set' if os.getenv('OPENROUTER_API_KEY') else '✗ Not set'}")

print("\n" + "-" * 60)
print("Running budget analysis...")
print("-" * 60 + "\n")

result = analyze_budget(test_listing, target_budget=2500)

print("\nRESULT:")
print(f"  Match Score: {result['matchScore']}")
print(f"  LLM Insight: {result['llm_insight']}")
print(f"  Cost Breakdown: {result['costBreakdown']}")

if result['llm_insight']:
    print("\n✓ Budget agent returned insight successfully!")
else:
    print("\n✗ Budget agent returned empty insight (check logs above)")

print("\n" + "=" * 60)
