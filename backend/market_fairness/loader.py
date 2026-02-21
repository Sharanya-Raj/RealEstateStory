import pandas as pd

def load_zori_csv():
    return pd.read_csv("backend/market_data/ZORI.csv").set_index("zip").to_dict("index")

def load_zordi_csv():
    return pd.read_csv("backend/market_data/ZORDI.csv").set_index("zip").to_dict("index")