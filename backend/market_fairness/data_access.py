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
        # Extract the latest date column for the median rent
        latest_date = zori_df.columns[-1]
        zori_df["median"] = pd.to_numeric(zori_df[latest_date], errors='coerce')
        zori_df["zip"] = zori_df["RegionName"].astype(str)
        zori_df = zori_df.drop_duplicates(subset=["zip"], keep="first")
        ZORI_DATA = zori_df.set_index("zip").to_dict("index")
    
    zordi_df = pd.read_csv(zordi_path)
    if "RegionName" in zordi_df.columns:
        zordi_df["zip"] = zordi_df["RegionName"].astype(str).apply(lambda x: x.split(',')[0].strip())
        # Assuming ZORDI dataset needs parsing into p25, p50, p75. 
        # For testing, mapping some dummy percentiles if they don't exist inherently
        if "p50" not in zordi_df.columns:
            latest_date = zordi_df.columns[-1]
            zordi_df["p50"] = pd.to_numeric(zordi_df[latest_date], errors='coerce')
            zordi_df["p25"] = zordi_df["p50"] * 0.8
            zordi_df["p75"] = zordi_df["p50"] * 1.2
        zordi_df = zordi_df.drop_duplicates(subset=["zip"], keep="first")
        ZORDI_DATA = zordi_df.set_index("zip").to_dict("index")

def get_zori_for_zip(zip_code: str):
    return ZORI_DATA.get(str(zip_code))

def get_zordi_for_zip(zip_code: str):
    return ZORDI_DATA.get(str(zip_code))
