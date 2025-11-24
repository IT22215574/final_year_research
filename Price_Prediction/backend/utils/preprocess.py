import pandas as pd

def clean_price_series(s):
    """Return numeric price series from messy strings."""
    s = s.astype(str).str.replace(",", "")
    extracted = s.str.extract(r"([-0-9.]+)")[0]
    return pd.to_numeric(extracted, errors="coerce")
