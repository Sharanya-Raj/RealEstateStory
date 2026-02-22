# agents/hidden_cost_agent.py
import json
import logging
import os

logger = logging.getLogger("agents.hidden_cost")
import requests
from pydantic import BaseModel

class GeminiFeeExtraction(BaseModel):
    has_hidden_fee_warnings: bool
    estimated_unstructured_fees: float
    analysis_reasoning: str


# ---------------------------------------------------------------------------
# Helpers for the agentic true-cost analysis
# ---------------------------------------------------------------------------

def _compute_structured_costs(listing: dict) -> list[dict]:
    """
    Derive itemized monthly cost estimates from the listing's structured fields.
    Uses NJ-specific benchmarks. Returns a list of cost-item dicts, each with:
        category, amount, source ('listed' | 'estimated'), note
    """
    items = []

    sqft         = int(listing.get("sqft", 800) or 800)
    walk_score   = int(listing.get("walk_score", 50) or 50)
    transit_mins = int(listing.get("transit_time_to_hub", 20) or 20)
    has_gym      = listing.get("has_gym", False) in [True, "True", 1, "1"]
    has_grocery  = listing.get("has_grocery_nearby", False) in [True, "True", 1, "1"]
    utilities    = float(listing.get("avg_utilities", 0) or 0)
    parking      = float(listing.get("parking_fee", 0) or 0)
    amenities    = float(listing.get("amenity_fee", 0) or 0)

    # Utilities — listed or estimated from sqft (NJ electric+gas+water avg)
    if utilities > 0:
        items.append({
            "category": "Utilities",
            "amount": utilities,
            "source": "listed",
            "note": "As stated by landlord",
        })
    else:
        # NJ: electric ~$0.18/kWh, gas variable, water ~$35 flat
        est_util = round(min(max(60 + sqft * 0.09, 85), 210), 0)
        items.append({
            "category": "Utilities",
            "amount": est_util,
            "source": "estimated",
            "note": f"Estimated for {sqft} sqft NJ unit (electric, gas, water)",
        })

    # Parking
    if parking > 0:
        items.append({"category": "Parking", "amount": parking, "source": "listed", "note": "Monthly fee"})
    elif walk_score < 55:
        items.append({
            "category": "Parking",
            "amount": 85.0,
            "source": "estimated",
            "note": "Low walkability — street or lot parking likely needed",
        })

    # Amenity fee
    if amenities > 0:
        items.append({"category": "Amenity Fee", "amount": amenities, "source": "listed", "note": ""})

    # NJ Transit / transport
    if walk_score < 50:
        items.append({
            "category": "Transport (NJ Transit)",
            "amount": 140.0,
            "source": "estimated",
            "note": f"Monthly pass for low-walkability area ({transit_mins} min commute)",
        })
    elif walk_score < 70 and transit_mins > 10:
        items.append({
            "category": "Transport (occasional transit)",
            "amount": 60.0,
            "source": "estimated",
            "note": "Partial NJ Transit use estimated",
        })

    # Internet (NJ providers: Optimum, Verizon FiOS, Comcast)
    items.append({
        "category": "Internet",
        "amount": 60.0,
        "source": "estimated",
        "note": "Avg NJ broadband — Optimum/Verizon FiOS ($50–80/mo)",
    })

    # Renter's insurance (required by most NJ landlords)
    items.append({
        "category": "Renter's Insurance",
        "amount": 18.0,
        "source": "estimated",
        "note": "Standard NJ renter's insurance ($15–25/mo)",
    })

    # Grocery transport
    if not has_grocery:
        items.append({
            "category": "Grocery Transport",
            "amount": 22.0,
            "source": "estimated",
            "note": "No nearby grocery — extra transit/rideshare trips estimated",
        })

    # Gym membership
    if not has_gym:
        items.append({
            "category": "Gym Membership",
            "amount": 35.0,
            "source": "estimated",
            "note": "No on-site gym — local membership (Planet Fitness / YMCA avg)",
        })

    return items


def _agentic_cost_analysis(
    listing: dict,
    structured_items: list[dict],
    description_insight: str,
) -> dict:
    """
    Chain-of-thought Gemini reasoning pass over all available cost signals.

    Reads the structured items already computed, the description insight from the
    base function, and the full listing context, then produces:
        items            – refined / additional cost items from the LLM
        llmTrueCost      – LLM-computed monthly total (rent + all costs)
        negotiationTips  – list of actionable negotiation tips
        riskFlags        – list of financial risk warnings
        reasoning        – the model's chain-of-thought
    Returns an empty dict on failure so the caller can degrade gracefully.
    """
    api_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPEN_ROUTER_API_KEY")
    if not api_key:
        logger.info("[HIDDEN_COST] No OPENROUTER_API_KEY; skipping agentic analysis")
        return {}

    listing_context = {
        "address":             listing.get("address"),
        "city":                listing.get("city"),
        "state":               listing.get("state"),
        "zip":                 listing.get("zip"),
        "base_rent":           listing.get("base_rent"),
        "bedrooms":            listing.get("bedrooms"),
        "bathrooms":           listing.get("bathrooms"),
        "sqft":                listing.get("sqft"),
        "walk_score":          listing.get("walk_score"),
        "transit_time_to_hub": listing.get("transit_time_to_hub"),
        "pet_friendly":        listing.get("pet_friendly"),
        "has_gym":             listing.get("has_gym"),
        "has_grocery_nearby":  listing.get("has_grocery_nearby"),
        "parking_fee":         listing.get("parking_fee"),
        "avg_utilities":       listing.get("avg_utilities"),
        "amenity_fee":         listing.get("amenity_fee"),
        "description":         listing.get("description", ""),
    }

    prompt = f"""You are Soot Sprite, a meticulous real estate cost AI specialising in New Jersey apartments.

LISTING:
{json.dumps(listing_context, indent=2)}

STRUCTURED COSTS ALREADY COMPUTED (deterministic):
{json.dumps(structured_items, indent=2)}

DESCRIPTION ANALYSIS (from prior pass):
{description_insight}

Your job — reason step by step about EVERY monthly cost a tenant will actually face:
1. Validate or correct the structured items above using your NJ knowledge.
2. Identify any ADDITIONAL costs not captured: pet rent, laundry, mandatory fees buried in the description, NJ property-tax pass-through, seasonal cost spikes, etc.
3. Do NOT double-count items already in the structured list.
4. Calculate llmTrueCost = base_rent + sum of ALL monthly cost items.
5. Write 2-3 negotiation tips tailored to this specific listing.
6. Write 1-3 risk flags (financial red flags the tenant should know).

Return ONLY valid JSON matching this schema exactly:
{{
  "reasoning": "Step-by-step chain-of-thought...",
  "additional_items": [
    {{"category": "Pet Rent", "amount": 50, "note": "Typical NJ pet rent fee"}}
  ],
  "llmTrueCost": 2150,
  "negotiationTips": ["Tip 1", "Tip 2"],
  "riskFlags": ["Flag 1", "Flag 2"]
}}"""

    try:
        logger.info("API CALL: Gemini agentic hidden-cost analysis for %s", listing.get("address"))
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "google/gemini-2.5-flash",
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
            },
            timeout=20,
        )
        if not response.ok:
            logger.warning("[HIDDEN_COST] Agentic API non-OK: %s", response.status_code)
            return {}

        data = response.json()
        content = data["choices"][0]["message"]["content"]
        result = json.loads(content)
        logger.info("[HIDDEN_COST] Agentic analysis complete. llmTrueCost=%s", result.get("llmTrueCost"))
        return result
    except Exception as e:
        logger.warning("[HIDDEN_COST] Agentic analysis failed: %s", e)
        return {}


# ---------------------------------------------------------------------------
# Original function — preserved exactly; extended with agenticBreakdown field
# ---------------------------------------------------------------------------

def analyze_hidden_costs(listing: dict) -> dict:
    """
    Soot Sprite: Explores parking, utilities, amenity fees.
    Uses Gemini 2.5 Flash to crawl the unstructured description text.
    Returns the final True Cost.
    """
    
    rent = float(listing.get('base_rent', 0))
    parking = float(listing.get('parking_fee', 0))
    amenities = float(listing.get('amenity_fee', 0))
    utilities = float(listing.get('avg_utilities', 0))
    
    description = listing.get('description', '')
    
    # Analyze description for unstructured fees (Gemini or OpenRouter)
    unstructured_fees = 0.0
    gemini_insight = "No unstructured text provided."
    
    api_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPEN_ROUTER_API_KEY")
    if api_key and description:
        try:
            prompt = f"Analyze this rental property description and identify any hidden monthly fees or strict penalties (e.g. pet rent, mandatory valet trash) that are not base rent. Estimate their monthly cost. Return JSON matching the schema. Description: {description}"
            
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "google/gemini-2.5-flash",
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"}
                },
                timeout=10
            )
            
            if response.ok:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                result = json.loads(content)
                
                # Handle case where LLM returns a list instead of dict
                if isinstance(result, list):
                    logger.warning("[HIDDEN_COST] LLM returned list instead of dict, using fallback")
                    result = {}
                
                unstructured_fees = float(result.get('estimated_unstructured_fees', 0.0))
                if result.get('has_hidden_fee_warnings'):
                    gemini_insight = result.get('analysis_reasoning', '')
                
        except Exception as e:
            logger.warning("[HIDDEN_COST] OpenRouter analysis failed: %s", e)
            gemini_insight = f"Description analysis unavailable (check logs for details)"
    
    true_cost = rent + parking + amenities + utilities + unstructured_fees

    # Transparency score is lower if fees are exceptionally high relative to rent
    hidden_fees = parking + amenities + unstructured_fees
    transparency_score = 100
    if hidden_fees > 0:
        ratio = hidden_fees / rent
        transparency_score = max(0, 100 - int(ratio * 200)) # 10% ratio drops score by 20

    # ------------------------------------------------------------------
    # Agentic true-cost breakdown (additive — does not alter the fields
    # above that kamaji.py depends on)
    # ------------------------------------------------------------------
    structured_items = _compute_structured_costs(listing)

    # Include base rent as the first line item so the LLM sees the full picture
    all_items_for_llm = [{"category": "Base Rent", "amount": rent, "source": "listed", "note": ""}] + structured_items

    llm_result = _agentic_cost_analysis(listing, all_items_for_llm, gemini_insight)

    # Merge LLM additional_items into structured list (avoid duplicates by category)
    existing_categories = {item["category"].lower() for item in structured_items}
    for extra in llm_result.get("additional_items", []):
        if extra.get("category", "").lower() not in existing_categories:
            structured_items.append({
                "category": extra["category"],
                "amount": float(extra.get("amount", 0)),
                "source": "llm",
                "note": extra.get("note", ""),
            })

    # Compute the structured total (rent + every itemised cost)
    structured_total = rent + sum(item["amount"] for item in structured_items)

    agentic_breakdown = {
        # Itemised costs (deterministic items + LLM-discovered extras)
        "items": structured_items,
        # Deterministic total derived from structured_items
        "structuredTrueCost": round(structured_total, 2),
        # LLM-reasoned total (may reflect seasonal / context-aware adjustments)
        "llmTrueCost": llm_result.get("llmTrueCost", round(structured_total, 2)),
        # Chain-of-thought from Gemini
        "reasoning": llm_result.get("reasoning", "Structured analysis only — LLM unavailable."),
        # Negotiation leverage points
        "negotiationTips": llm_result.get("negotiationTips", []),
        # Financial risk warnings
        "riskFlags": llm_result.get("riskFlags", []),
    }

    return {
        "trueCost": true_cost,
        "transparencyScore": transparency_score,
        "fees": {
            "parking": parking,
            "amenities": amenities,
            "unstructured": unstructured_fees
        },
        "llm_insight": gemini_insight,
        "agenticBreakdown": agentic_breakdown,
    }
