"""Quick smoke test for GEMINI_API_KEY and ELEVENLABS_API_KEY."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load from backend/.env regardless of where the script is run from
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)


gemini_ok = False
elevenlabs_ok = False

# --- Test Gemini ---
try:
    from google import genai
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        print("❌ GEMINI_API_KEY is missing from .env")
    else:
        client = genai.Client(api_key=key)
        resp = client.models.generate_content(model="gemini-flash-latest", contents="Say 'ok' in one word.")
        print(f"✅ Gemini works! Response: {resp.text.strip()}")
        gemini_ok = True
except Exception as e:
    print(f"❌ Gemini failed: {e}")

# --- Test ElevenLabs ---
try:
    from elevenlabs.client import ElevenLabs
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        print("❌ ELEVENLABS_API_KEY is missing from .env")
    else:
        client = ElevenLabs(api_key=key)
        gen = client.text_to_speech.convert(
            text="Hi.",
            voice_id="auq43ws1oslv0tO4BDa7",
            model_id="eleven_turbo_v2_5",
            output_format="mp3_44100_128",
        )
        audio = b"".join(gen)
        print(f"✅ ElevenLabs works! Audio size: {len(audio)} bytes")
        elevenlabs_ok = True
except Exception as e:
    import traceback
    print(f"❌ ElevenLabs failed: {type(e).__name__}: {e}")
    traceback.print_exc()

print()
if gemini_ok and elevenlabs_ok:
    print("🎉 Both APIs are working! You're good to go.")
elif not gemini_ok:
    print("⚠️  Fix your Gemini key and re-run.")
elif not elevenlabs_ok:
    print("⚠️  Fix your ElevenLabs key and re-run.")
