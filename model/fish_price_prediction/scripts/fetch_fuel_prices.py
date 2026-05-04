import pandas as pd
import requests
from bs4 import BeautifulSoup
import io

def fetch_latest_fuel_prices():
    print("\n" + "="*60)
    print("⛽ SCRAPING HISTORICAL FUEL PRICES (CEYPETCO)")
    print("="*60)

    url = "https://ceypetco.gov.lk/historical-prices/"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }

    try:
        print(f"📡 Connecting to {url}...")
        response = requests.get(url, headers=headers, verify=False, timeout=30)
        
        # Read HTML tables with pandas
        tables = pd.read_html(io.StringIO(response.text))
        
        if not tables:
            print("❌ No tables found on the page.")
            return
            
        df = tables[0]
        
        # The first row or the head might be our header
        print(f"✅ Extracted data: {len(df)} records found.")
        
        # We need to save it as 'Fuel Price.xlsx' in Backend/dataset/raw/fuel_price/
        import os
        from pathlib import Path
        base_dir = Path(__file__).resolve().parent.parent.parent.parent
        out_dir = base_dir / "Backend" / "dataset" / "raw" / "fuel_price"
        out_dir.mkdir(parents=True, exist_ok=True)
        
        out_file = out_dir / "Fuel Price.xlsx"
        
        # We also need to map the first column name nicely, e.g. "Effective Date"
        if df.columns[0] == "Date":
            df.rename(columns={"Date": "Effective Date"}, inplace=True)
            
        df.to_excel(out_file, index=False)
        print(f"✅ Saved fuel prices successfully to: {out_file}")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ ERROR: Failed to access the website or download fuel prices.")
        print(f"Details: {str(e)}")
        print("="*60)

if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    fetch_latest_fuel_prices()
