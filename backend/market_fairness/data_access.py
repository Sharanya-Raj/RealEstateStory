from ..market_data import load_zori_csv, load_zordi_csv

ZORI_DATA = load_zori_csv()
ZORDI_DATA = load_zordi_csv()

def get_zori_for_zip(zip_code: str):
    return ZORI_DATA.get(zip_code)

def get_zordi_for_zip(zip_code: str):
    return ZORDI_DATA.get(zip_code)