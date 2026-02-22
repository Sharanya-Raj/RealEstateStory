"""
Test llm_client directly to see what's going wrong.
"""
import os
from dotenv import load_dotenv
load_dotenv('.env')

import logging
logging.basicConfig(level=logging.DEBUG)

from llm_client import generate_text, _use_openrouter

print("=" * 60)
print("LLM Client Configuration Test")
print("=" * 60)

print(f"\nEnvironment check:")
print(f"  OPENROUTER_API_KEY: {'SET' if os.environ.get('OPENROUTER_API_KEY') else 'NOT SET'}")
print(f"  GEMINI_API_KEY: {'SET' if os.environ.get('GEMINI_API_KEY') else 'NOT SET'}")
print(f"  USE_OPENROUTER: {os.environ.get('USE_OPENROUTER', 'not set')}")

print(f"\nllm_client decision:")
print(f"  Will use OpenRouter: {_use_openrouter()}")

print(f"\n" + "=" * 60)
print("Testing generate_text()...")
print("=" * 60)

result = generate_text(
    prompt="Say 'Hello from Howl!' in one sentence.",
    model="gemini-2.5-flash"
)

print(f"\nResult:")
if result:
    print(f"  ✓ Success! Response: {result[:100]}...")
else:
    print(f"  ✗ Failed - returned None")

print("=" * 60)
