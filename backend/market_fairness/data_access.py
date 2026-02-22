import pandas as pd
import os

# Resolve paths to the CSV files relative to this file's directory
current_dir = os.path.dirname(os.path.abspath(__file__))
zori_path = os.path.join(current_dir, "..", "data", "ZORI.csv")
zordi_path = os.path.join(current_dir, "..", "data", "ZORDI.csv")

ZORI_DATA = {}   # keyed by lowercase city name
ZORDI_DATA = {}  # keyed by lowercase city name

if os.path.exists(zori_path) and os.path.exists(zordi_path):
    zori_df = pd.read_csv(zori_path).copy()
    if "RegionName" in zori_df.columns:
        latest_date = zori_df.columns[-1]
        extra_cols = pd.DataFrame({
            "median": pd.to_numeric(zori_df[latest_date], errors='coerce'),
            "zip": zori_df["RegionName"].astype(str).str.strip().str.lower(),
        }, index=zori_df.index)
        zori_df = pd.concat([zori_df, extra_cols], axis=1).copy()
        zori_df = zori_df.drop_duplicates(subset=["zip"], keep="first")
        ZORI_DATA = zori_df.set_index("zip").to_dict("index")

    zordi_df = pd.read_csv(zordi_path).copy()
    if "RegionName" in zordi_df.columns:
        # RegionName format: "City, ST" or just "City" — normalize to lowercase city name
        zip_col = zordi_df["RegionName"].astype(str).apply(
            lambda x: x.split(',')[0].strip().lower()
        )
        if "p50" not in zordi_df.columns:
            latest_date = zordi_df.columns[-1]
            p50_col = pd.to_numeric(zordi_df[latest_date], errors='coerce')
            extra_cols = pd.DataFrame({
                "zip": zip_col,
                "p50": p50_col,
                "p25": p50_col * 0.8,
                "p75": p50_col * 1.2,
            }, index=zordi_df.index)
        else:
            extra_cols = pd.DataFrame({"zip": zip_col}, index=zordi_df.index)
        zordi_df = pd.concat([zordi_df, extra_cols], axis=1).copy()
        zordi_df = zordi_df.drop_duplicates(subset=["zip"], keep="first")
        ZORDI_DATA = zordi_df.set_index("zip").to_dict("index")


def _normalize_key(city_or_zip: str) -> str:
    """Lowercase, strip whitespace, drop ', ST' state suffix if present."""
    return city_or_zip.split(',')[0].strip().lower()


def get_zori_for_zip(city_or_zip: str):
    return ZORI_DATA.get(_normalize_key(city_or_zip))


def get_zordi_for_zip(city_or_zip: str):
    return ZORDI_DATA.get(_normalize_key(city_or_zip))


def get_zori_history(zip_code: str, n_months: int = 12) -> list[dict]:
    """
    Return the last n_months of real monthly ZORI rent data for a ZIP code as
    a list of {"month": "YYYY-MM", "price": float}, sorted oldest → newest.

    Falls back to an empty list when the ZIP is not in the dataset.
    The ZORI CSV stores time-series values in date-labelled columns (e.g. "2024-01").
    """
    import re
    row = ZORI_DATA.get(str(zip_code))
    if not row:
        return []

    date_pattern = re.compile(r"^\d{4}-\d{2}$")
    dated = []
    for col, val in row.items():
        if date_pattern.match(str(col)):
            try:
                price = float(val)
                if price > 0 and price == price:   # positive and not NaN
                    dated.append((col, price))
            except (TypeError, ValueError):
                pass

    if not dated:
        return []

    dated.sort(key=lambda x: x[0])
    recent = dated[-n_months:]
    return [{"month": col, "price": round(price, 2)} for col, price in recent]
