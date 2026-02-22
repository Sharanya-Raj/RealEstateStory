# agents/budget_agent.py
import logging
from llm_client import generate_text

logger = logging.getLogger("agents.budget")

# The classic 30% rule: spending more than 30% of gross income on housing is a stress signal.
# We use the user's monthly budget as a proxy for disposable income.
_SAFE_RATIO   = 0.30   # ≤30% of budget → healthy
_STRESS_RATIO = 0.45   # ≥45% of budget → financially stressed

def _estimate_transport(listing: dict) -> float:
    """
    Estimate monthly transportation cost from structured listing data.

    Priority:
    1. Listed parking_fee (known hard cost).
    2. Walk score → NJ Transit pass need.
       walk_score ≥ 70: minimal transit ($0 extra beyond parking)
       walk_score 50-70: occasional transit (~$60)
       walk_score < 50: full NJ Transit monthly pass (~$140)
    3. Falls back to a flat $50 stub when no data is available.
    """
    parking_fee = float(listing.get("parking_fee", 0) or 0)
    walk_score  = int(listing.get("walk_score", 50) or 50)
    transit_hub = int(listing.get("transit_time_to_hub", 20) or 20)

    if walk_score >= 70:
        transit_cost = 0.0
    elif walk_score >= 50 and transit_hub <= 20:
        transit_cost = 60.0
    else:
        transit_cost = 140.0   # full NJ Transit monthly pass

    return parking_fee + transit_cost


def _estimate_groceries(listing: dict) -> float:
    """
    Estimate monthly grocery spend.
    If no nearby grocery store, add ~$20 for extra transport on shopping trips.
    NJ solo-student grocery baseline: ~$280/mo.
    """
    base = 280.0
    if not listing.get("has_grocery_nearby", False):
        base += 20.0
    return base


def _budget_fit_score(rent_plus_utils: float, target_budget: float) -> int:
    """
    Percentage-based budget fit (0-100), anchored on the 30% rule.

    Unlike the old formula (−10 pts per $100 absolute overage, which ignores budget size),
    this uses the rent-to-budget ratio so a $200 overage on a $3000 budget is treated
    very differently from the same overage on a $800 budget.

    Thresholds (rent_plus_utils / target_budget):
      ≤ 25%  → 100  (exceptional value)
      ≤ 30%  → 90   (within the safe zone)
      ≤ 35%  → 75   (manageable, minor stretch)
      ≤ 40%  → 60   (noticeable strain)
      ≤ 45%  → 45   (stress territory)
      ≤ 55%  → 25   (serious concern)
      > 55%  → 10   (not recommended)
    """
    if target_budget <= 0:
        return 50

    ratio = rent_plus_utils / target_budget

    if ratio <= 0.25:
        return 100
    if ratio <= 0.30:
        # Linear 100→90 across [25%, 30%]
        return int(100 - (ratio - 0.25) / 0.05 * 10)
    if ratio <= 0.35:
        # Linear 90→75 across [30%, 35%]
        return int(90 - (ratio - 0.30) / 0.05 * 15)
    if ratio <= 0.40:
        return int(75 - (ratio - 0.35) / 0.05 * 15)
    if ratio <= 0.45:
        return int(60 - (ratio - 0.40) / 0.05 * 15)
    if ratio <= 0.55:
        return int(45 - (ratio - 0.45) / 0.10 * 20)
    return 10


def analyze_budget(listing: dict, target_budget: float) -> dict:
    """
    Lin (Star-Steward): Evaluates the rent against the student budget.

    Improvements over the old version:
    - Budget fit uses a rent-to-budget ratio (30% rule) instead of a flat
      $100-per-point formula that ignored budget size.
    - Transportation cost is derived from walk_score + transit_time_to_hub
      instead of a hardcoded +$50.
    - Grocery estimate adjusts for grocery store proximity.
    """
    rent       = float(listing.get("base_rent", 0) or 0)
    utilities  = float(listing.get("avg_utilities", 0) or 0)
    transport  = _estimate_transport(listing)
    groceries  = _estimate_groceries(listing)

    total_housing = rent + utilities   # the "must-pay" housing cost for scoring
    total_all     = total_housing + transport + groceries

    budget_fit = _budget_fit_score(total_housing, target_budget)

    # Build a human-readable ratio string for the LLM
    ratio_pct = int(total_housing / target_budget * 100) if target_budget > 0 else 0
    ratio_label = (
        "well within budget" if ratio_pct <= 30 else
        "a slight stretch" if ratio_pct <= 40 else
        "noticeably over the 30% rule"
    )

    logger.info(
        "AGENT: budget calling LLM (Lin insight) rent=$%.0f util=$%.0f transport=$%.0f ratio=%d%%",
        rent, utilities, transport, ratio_pct,
    )
    prompt = (
        f"You are Lin from Spirited Away, a pragmatic worker evaluating budget. "
        f"The student has ${target_budget:.0f}/mo. "
        f"Rent is ${rent:.0f} + utilities ${utilities:.0f} = ${total_housing:.0f}/mo "
        f"({ratio_pct}% of budget — {ratio_label}). "
        f"Total true monthly outlay including transport and groceries is ~${total_all:.0f}. "
        f"Give 1 punchy sentence telling them if it's a smart financial fit."
    )
    insight_text = generate_text(prompt, model="gemini-flash-latest")
    
    # Fallback insight if LLM fails
    if not insight_text or not insight_text.strip():
        logger.warning("AGENT: budget LLM returned empty, using fallback")
        overage = total_housing - target_budget
        if overage > 0:
            insight_text = f"This place costs ${int(overage)} more than your budget. You'd be working overtime just to make rent."
        elif total_housing < target_budget * 0.7:
            savings = target_budget - total_housing
            insight_text = f"Smart choice! This leaves you ${int(savings)}/month for savings or fun. That's the kind of financial cushion every student needs."
        else:
            insight_text = f"At {ratio_pct}% of your budget, this is {ratio_label}. Budget carefully for other expenses."

    return {
        "matchScore": budget_fit,
        "llm_insight": insight_text,
        "costBreakdown": {
            "rent":           rent,
            "utilities":      utilities,
            "transportation": transport,
            "groceries":      groceries,
        },
    }
