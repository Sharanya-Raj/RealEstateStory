import logging

from .schema import MarketFairnessInput, MarketFairnessOutput
from .data_access import get_zori_for_zip, get_zordi_for_zip

logger = logging.getLogger("market_fairness")
from .calculations import compute_percentile_position, compute_fairness_score
from .formatter import build_explanation

def run_market_fairness_agent(input_data: MarketFairnessInput) -> MarketFairnessOutput:
    import math

    location = str(input_data.zip_code)
    logger.info("API: Loading ZORI/ZORDI data for location=%r", location)
    zori_data = get_zori_for_zip(location)
    zordi_data = get_zordi_for_zip(location)

    if not zori_data and not zordi_data:
        logger.warning("Market fairness: No ZORI/ZORDI data for location=%r", location)
        return MarketFairnessOutput(
            listing_id=input_data.listing_id,
            fairness_score=50.0,
            percentile_position=50.0,
            explanation={"error": "Market data not available for this ZIP code/region."}
        )

    # --- Determine p50 (best available median rent) ---
    p50 = 0.0
    if zori_data:
        median_val = zori_data.get("median")
        if median_val is not None:
            try:
                v = float(median_val)
                if not math.isnan(v) and v > 0:
                    p50 = v
            except (TypeError, ValueError):
                pass

    # --- Determine p25 / p75 ---
    if zordi_data:
        p25 = float(zordi_data.get("p25", 0.0) or 0.0)
        p50_zordi = float(zordi_data.get("p50", 0.0) or 0.0)
        p75 = float(zordi_data.get("p75", 0.0) or 0.0)
        # Prefer ZORI median for p50 if valid; otherwise use ZORDI p50
        if p50 == 0.0 and not math.isnan(p50_zordi) and p50_zordi > 0:
            p50 = p50_zordi
        if math.isnan(p25) or p25 <= 0:
            p25 = p50 * 0.8
        if math.isnan(p75) or p75 <= 0:
            p75 = p50 * 1.2
    else:
        # ZORDI unavailable — derive distribution from ZORI median alone
        logger.info(
            "Market fairness: ZORDI not available for %r, estimating p25/p75 from ZORI median",
            location,
        )
        p25 = p50 * 0.8
        p75 = p50 * 1.2

    if p50 <= 0:
        logger.warning("Market fairness: p50 is zero for location=%r, returning default", location)
        return MarketFairnessOutput(
            listing_id=input_data.listing_id,
            fairness_score=50.0,
            percentile_position=50.0,
            explanation={"error": "Market data not available for this ZIP code/region."}
        )

    rent = float(input_data.listing_rent)

    # 2. Compute percentile_position (piecewise linear through all three anchors)
    percentile_position = compute_percentile_position(rent, p25, p50, p75)

    # 3. Compute fairness_score
    fairness_score = compute_fairness_score(rent, p50, p25, p75)

    # 4. Build explanation
    explanation = build_explanation(rent, p50, percentile_position)

    # 5. Return MarketFairnessOutput
    return MarketFairnessOutput(
        listing_id=input_data.listing_id,
        fairness_score=fairness_score,
        percentile_position=percentile_position,
        explanation=explanation
    )
