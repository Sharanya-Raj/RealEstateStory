def build_explanation(rent: float, p50: float, percentile_position: float) -> dict:
    if percentile_position < 40:
        pricing_status = "underpriced"
    elif percentile_position > 60:
        pricing_status = "overpriced"
    else:
        pricing_status = "fairly priced"
        
    diff_from_median = rent - p50
    if diff_from_median > 0:
        diff_text = f"${diff_from_median:.2f} above median"
    else:
        diff_text = f"${abs(diff_from_median):.2f} below median"

    return {
        "status": pricing_status,
        "summary": f"This property is {pricing_status}.",
        "details": f"The rent is ${rent:.2f}, which is {diff_text}.",
        "percentile_indicator": f"It sits around the {percentile_position:.0f}th percentile for this ZIP code."
    }
