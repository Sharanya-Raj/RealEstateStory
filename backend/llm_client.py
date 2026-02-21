"""
Shared LLM client supporting Google Gemini and OpenRouter (Gemini via OpenRouter).
Set USE_OPENROUTER=1 and OPENROUTER_API_KEY to use OpenRouter instead of direct Gemini.
"""

import logging
import os

logger = logging.getLogger("llm_client")

# Model ID mapping: internal name -> OpenRouter model ID
_OPENROUTER_MODELS = {
    "gemini-flash-latest": "google/gemini-2.0-flash-001",
    "gemini-2.5-flash": "google/gemini-2.5-flash",
}


def _use_openrouter() -> bool:
    """True if we should use OpenRouter instead of direct Google Gemini."""
    use = os.environ.get("USE_OPENROUTER", "").lower() in ("1", "true", "yes")
    has_key = bool(os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPEN_ROUTER_API_KEY"))
    return use and has_key


def _get_openrouter_text(prompt: str, model: str, json_mode: bool = False) -> str | None:
    """Call OpenRouter (Gemini via OpenRouter). Returns text or None on failure."""
    try:
        from openai import OpenAI
    except ImportError:
        logger.warning("install 'openai' to use OpenRouter")
        return None
    api_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPEN_ROUTER_API_KEY")
    if not api_key:
        return None
    model_id = _OPENROUTER_MODELS.get(model, model)
    if not model_id.startswith("google/"):
        model_id = f"google/{model_id}"
    logger.info("API CALL: OpenRouter model=%s json_mode=%s", model_id, json_mode)
    client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)
    kwargs = {
        "model": model_id,
        "messages": [{"role": "user", "content": prompt}],
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    resp = client.chat.completions.create(**kwargs)
    if resp.choices and resp.choices[0].message.content:
        logger.info("API RETURN: OpenRouter completed successfully")
        return resp.choices[0].message.content
    logger.warning("API RETURN: OpenRouter returned empty response")
    return None


def _get_gemini_text(prompt: str, model: str, json_mode: bool = False, schema=None) -> str | None:
    """Call Google Gemini directly. Returns text or None on failure."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        from google import genai

        logger.info("API CALL: Google Gemini model=%s json_mode=%s", model, json_mode)
        client = genai.Client(api_key=api_key)
        config = None
        if json_mode and schema:
            config = {"response_mime_type": "application/json", "response_schema": schema}
        resp = client.models.generate_content(model=model, contents=prompt, config=config)
        if resp and resp.text:
            logger.info("API RETURN: Google Gemini completed successfully")
            return resp.text
    except Exception as e:
        logger.warning("API ERROR: Google Gemini failed: %s", e)
    return None


def generate_text(
    prompt: str,
    model: str = "gemini-flash-latest",
    json_mode: bool = False,
    schema=None,
) -> str | None:
    """
    Generate text using Gemini, via either Google or OpenRouter.
    Returns the generated text or None on failure.
    """
    provider = "OpenRouter" if _use_openrouter() else "Google Gemini"
    logger.debug("generate_text using provider=%s model=%s", provider, model)
    if _use_openrouter():
        return _get_openrouter_text(prompt, model, json_mode=json_mode)
    return _get_gemini_text(prompt, model, json_mode=json_mode, schema=schema)
