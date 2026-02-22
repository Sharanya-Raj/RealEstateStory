# backend/data_loader.py
import pandas as pd
import os

_LISTINGS_DF = None

def get_listings():
    global _LISTINGS_DF
    if _LISTINGS_DF is None:
        path = os.path.join(os.path.dirname(__file__), 'data', 'listings.csv')
        try:
            _LISTINGS_DF = pd.read_csv(path)
        except Exception as e:
            import sys; sys.stderr.write(f"Error loading listings: {e}\n")
            _LISTINGS_DF = pd.DataFrame()
    return _LISTINGS_DF
