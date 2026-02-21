def compute_percentile_position(rent: float, p25: float, p75: float) -> float:
    if p75 == p25:
        return 50.0
    
    # Linear mapping where p25 maps to 25th percentile and p75 maps to 75th percentile
    percentile = 25.0 + 50.0 * ((rent - p25) / (p75 - p25))
    return max(0.0, min(100.0, percentile))

def compute_fairness_score(rent: float, p50: float, p25: float, p75: float) -> float:
    if p75 == p25:
        fairness = 1.0 if rent <= p50 else 0.0
    else:
        fairness = 1.0 - ((rent - p50) / (p75 - p25))
        
    score = 50.0 + 50.0 * fairness
    return max(0.0, min(100.0, score))
