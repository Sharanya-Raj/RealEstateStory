"""
Quick test of the chat endpoint to verify it's using OpenRouter correctly.
"""
import requests
import json

# Test listing context
listing_context = {
    "id": "test-123",
    "address": "123 College Ave",
    "city": "New Brunswick",
    "state": "NJ",
    "zip": "08901",
    "price": 1500,
    "bedrooms": 2,
    "bathrooms": 1,
    "sqft": 850,
    "walkScore": 85,
    "crimeScore": 7,
    "commuteMinutes": 15,
    "parkingIncluded": True,
    "petFriendly": False,
    "utilitiesIncluded": False,
    "amenities": ["Laundry", "WiFi"],
    "description": "Cozy apartment near campus"
}

# Test request
payload = {
    "listing_id": "test-123",
    "question": "Is this a good deal for a student?",
    "listing_context": listing_context
}

print("Testing chat endpoint...")
print("-" * 50)

try:
    response = requests.post(
        "http://localhost:8000/api/chat",
        json=payload,
        timeout=30
    )
    
    if response.ok:
        data = response.json()
        print("✓ Chat endpoint responded successfully!")
        print(f"\nHowl's response:\n{data.get('response', 'No response')}")
        print("-" * 50)
    else:
        print(f"✗ Error: HTTP {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"✗ Error: {e}")
