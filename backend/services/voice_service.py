import os
import requests
from typing import Optional

# Voice IDs from ElevenLabs (Default character-matching voices)
# Howl: "George" or similar sophisticated male voice
# Kamaji: "Marcus" or similar deep/raspy male voice
# Budget Agent: "Rachel" or similar clear/efficient female voice
# Fairness Agent: "Callum" or similar neutral/logical voice

VOICE_MAP = {
    "commute": "M5E055lOUxMi0kJpGyE9",      # Spirits (Train Conductor)
    "budget": "4tRn1lSkEn13EVTuqb0g",       # Lin
    "market": "eadgjmk4R4uojdsheG9t",       # Baron
    "neighborhood": "BlgEcC0TfWpBak7FmvHW", # Kiki
    "hidden": "goT3UYdM9bhm0n2lmKQx",       # Kamaji Helper
    "kamaji": "goT3UYdM9bhm0n2lmKQx",       # Kamaji Summary
    "howl": "eadgjmk4R4uojdsheG9t",         # Howl (Baron as fit)
    "default": "M5E055lOUxMi0kJpGyE9"
}

def generate_voice(text: str, agent_type: str = "default") -> Optional[bytes]:
    """
    Calls ElevenLabs API to generate voice audio for the given text.
    Returns binary audio data or None if it fails.
    """
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        print("[VOICE] No ElevenLabs API key found.")
        return None

    voice_id = VOICE_MAP.get(agent_type.lower(), VOICE_MAP["default"])
    print(f"[VOICE] Generating audio for agent='{agent_type}' using voice_id='{voice_id}'")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key
    }

    data = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5
        }
    }

    try:
        response = requests.post(url, json=data, headers=headers)
        if response.ok:
            return response.content
        else:
            print(f"[VOICE] ElevenLabs error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"[VOICE] Exception during TTS generation: {e}")
        return None
