import os
import requests
from typing import Optional

# Voice IDs from ElevenLabs (Default character-matching voices)
# Howl: "George" or similar sophisticated male voice
# Kamaji: "Marcus" or similar deep/raspy male voice
# Budget Agent: "Rachel" or similar clear/efficient female voice
# Fairness Agent: "Callum" or similar neutral/logical voice

VOICE_MAP = {
    "howl": "JBFqnCBvToIDGisDtj7p", # George
    "kamaji": "z68rM5VAsA0S3fK6T6k5", # Marcus? (Need a good deep one)
    "budget": "21m00Tcm4TlvDq8ikWAM", # Rachel
    "fairness": "ErXwbcICj0yD9i62y_C3", # Callum
    "neighborhood": "MF3mGyEYCl7XYW7LMaPr", # Alice
    "default": "21m00Tcm4TlvDq8ikWAM"
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
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key
    }

    data = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
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
