import logging

from .schema import MarketFairnessInput, MarketFairnessOutput
from .data_access import get_zori_for_zip, get_zordi_for_zip

logger = logging.getLogger("market_fairness")
from .calculations import compute_percentile_position, compute_fairness_score
from .formatter import build_explanation

def run_market_fairness_agent(input_data: MarketFairnessInput) -> MarketFairnessOutput:
    zip_code = str(input_data.zip_code)
    logger.info("API: Loading ZORI/ZORDI data for zip=%s", zip_code)
    zori_data = get_zori_for_zip(zip_code)
    zordi_data = get_zordi_for_zip(zip_code)

    if not zori_data or not zordi_data:
        logger.warning("Market fairness: No ZORI/ZORDI data for zip=%s", zip_code)
        return MarketFairnessOutput(
            listing_id=input_data.listing_id,
            fairness_score=50.0,
            percentile_position=50.0,
            explanation={"error": "Market data not available for this ZIP code/region."}
        )

    p25 = float(zordi_data.get("p25", 0.0))
    p50 = float(zordi_data.get("p50", 0.0))
    p75 = float(zordi_data.get("p75", 0.0))
    
    # Try using ZORI median if available and valid, fallback to ZORDI p50
    median_val = zori_data.get("median")
    import math
    if median_val is not None and not math.isnan(float(median_val)):
        p50 = float(median_val)
    elif math.isnan(p50):
        # Fallback if both are somehow nan
        p50 = p25 + ((p75 - p25) / 2) if p75 > p25 else 0.0

    rent = float(input_data.listing_rent)

    # 2. Compute percentile_position
    percentile_position = compute_percentile_position(rent, p25, p75)

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
