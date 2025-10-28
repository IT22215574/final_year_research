import requests
from bs4 import BeautifulSoup
import pandas as pd
import os
from datetime import datetime

BASE_DIR = os.path.dirname(__file__)
DATASET_PATH = os.path.join(BASE_DIR, "dataset", "fish_prices.csv")

URL = "https://www.fisheries.gov.lk/web/index.php/en/statistics/weekly-fish-prices"

def fetch_latest_prices():
    print("📡 Fetching latest weekly fish prices...")
    response = requests.get(URL)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch page: {response.status_code}")

    soup = BeautifulSoup(response.text, "html.parser")

    # Find the first table with fish prices
    table = soup.find("table")
    if not table:
        raise Exception("No table found on the page!")

    headers = [th.text.strip() for th in table.find_all("th")]
    rows = []
    for tr in table.find_all("tr")[1:]:
        cells = [td.text.strip() for td in tr.find_all("td")]
        if len(cells) == len(headers):
            rows.append(cells)

    df_new = pd.DataFrame(rows, columns=headers)

    # Try to standardize columns
    rename_map = {
        "Date": "Date",
        "Fish Type": "FishType",
        "Fish": "FishType",
        "Market": "Market",
        "Price (LKR/kg)": "Price_LKR_per_kg",
        "Price (Rs/kg)": "Price_LKR_per_kg",
    }
    df_new.rename(columns=rename_map, inplace=True)

    # Add dummy columns if missing
    for col in ["Temp_C", "Rainfall_mm", "FuelPrice_LKR", "DemandIndex", "Season"]:
        if col not in df_new.columns:
            df_new[col] = 0

    # Ensure Date column exists
    if "Date" not in df_new.columns:
        df_new["Date"] = datetime.now().strftime("%Y-%m-%d")

    # Append new data to old CSV (avoid duplicates)
    if os.path.exists(DATASET_PATH):
        df_old = pd.read_csv(DATASET_PATH)
        combined = pd.concat([df_old, df_new]).drop_duplicates(subset=["Date", "FishType", "Market"], keep="last")
    else:
        os.makedirs(os.path.dirname(DATASET_PATH), exist_ok=True)
        combined = df_new

    combined.to_csv(DATASET_PATH, index=False)
    print(f"✅ Dataset updated and saved to {DATASET_PATH}")
    print(f"📈 Total records: {len(combined)}")

if __name__ == "__main__":
    fetch_latest_prices()
