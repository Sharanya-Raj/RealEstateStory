def compute_percentile_position(rent: float, p25: float, p50: float, p75: float) -> float:
    """
    Piecewise linear percentile estimate using three IQR anchors.

    The original single-span formula mapped [p25, p75] → [25, 75] linearly,
    meaning a rent exactly at the median still appeared biased when p50 ≠ (p25+p75)/2.
    This version uses p50 as a guaranteed anchor point so the midpoint always
    lands at exactly the 50th percentile, and the tails are extrapolated
    symmetrically beyond p25 and p75.

    Anchor mapping:
        rent ≤ p25   → extrapolate below 25th  (minimum 0)
        p25 < rent ≤ p50 → linear [25, 50]
        p50 < rent ≤ p75 → linear [50, 75]
        rent > p75   → extrapolate above 75th  (maximum 100)
    """
    # Degenerate guard
    if p75 <= p25:
        return 50.0

    # Clamp p50 to the valid interior to avoid division-by-zero on malformed data
    if p50 <= p25:
        p50 = p25 + (p75 - p25) * 0.5
    if p50 >= p75:
        p50 = p25 + (p75 - p25) * 0.5

    if rent <= p25:
        # Extrapolate below p25 using the lower half-IQR as the step size
        half_iqr_low = p50 - p25
        if half_iqr_low <= 0:
            return 0.0
        # Each half-IQR below p25 loses 25 percentile points
        steps_below = (p25 - rent) / half_iqr_low
        return max(0.0, 25.0 - steps_below * 25.0)

    elif rent <= p50:
        # Linear [p25 → 25, p50 → 50]
        return 25.0 + 25.0 * (rent - p25) / (p50 - p25)

    elif rent <= p75:
        # Linear [p50 → 50, p75 → 75]
        return 50.0 + 25.0 * (rent - p50) / (p75 - p50)

    else:
        # Extrapolate above p75 using the upper half-IQR as the step size
        half_iqr_high = p75 - p50
        if half_iqr_high <= 0:
            return 100.0
        steps_above = (rent - p75) / half_iqr_high
        return min(100.0, 75.0 + steps_above * 25.0)


def compute_fairness_score(rent: float, p50: float, p25: float, p75: float) -> float:
    """
    Fairness score (0–100, higher = better value for money).

    Maps rent relative to p50 (median), normalised by the IQR:
      At p25 (25th pct) → score ≈ 100  (well below market)
      At p50 (median)   → score  = 75  (fair market)
      At p75 (75th pct) → score  = 50  (slightly overpriced)
      Above p75         → score < 50, decreasing toward 0
    """
    iqr = p75 - p25
    if iqr <= 0:
        return 100.0 if rent <= p50 else 0.0

    # Deviation from median normalised by IQR; positive = overpriced
    deviation = (rent - p50) / iqr

    # Centre at 75 (slightly generous for at-market rent) and scale
    score = 75.0 - deviation * 100.0
    return max(0.0, min(100.0, score))
