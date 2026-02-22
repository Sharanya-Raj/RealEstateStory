import pandas as pd
import os

# Resolve paths to the CSV files relative to this file's directory
current_dir = os.path.dirname(os.path.abspath(__file__))
zori_path = os.path.join(current_dir, "..", "data", "ZORI.csv")
zordi_path = os.path.join(current_dir, "..", "data", "ZORDI.csv")

ZORI_DATA = {}
ZORDI_DATA = {}

if os.path.exists(zori_path) and os.path.exists(zordi_path):
    zori_df = pd.read_csv(zori_path)
    if "RegionName" in zori_df.columns:
        latest_date = zori_df.columns[-1]
        # Use pd.concat to avoid DataFrame fragmentation warning
        extra_cols = pd.DataFrame({
            "median": pd.to_numeric(zori_df[latest_date], errors='coerce'),
            "zip": zori_df["RegionName"].astype(str),
        }, index=zori_df.index)
        zori_df = pd.concat([zori_df, extra_cols], axis=1).copy()
        zori_df = zori_df.drop_duplicates(subset=["zip"], keep="first")
        ZORI_DATA = zori_df.set_index("zip").to_dict("index")
    
    zordi_df = pd.read_csv(zordi_path)
    if "RegionName" in zordi_df.columns:
        zip_col = zordi_df["RegionName"].astype(str).apply(lambda x: x.split(',')[0].strip())
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

def get_zori_for_zip(zip_code: str):
    return ZORI_DATA.get(str(zip_code))

def get_zordi_for_zip(zip_code: str):
    return ZORDI_DATA.get(str(zip_code))
