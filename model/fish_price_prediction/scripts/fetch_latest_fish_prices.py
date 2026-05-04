import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from pathlib import Path
import urllib3

# Suppress insecure request warnings for government websites (sometimes they have SSL issues)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def fetch_latest_fish_prices():
    print("\n" + "="*60)
    print("🎣 SCRAPING LATEST WEEKLY FISH PRICES")
    print("="*60)

    url = "https://www.fisheries.gov.lk/web/index.php/en/statistics/weekly-fish-prices"
    
    # Path to where Excel files should be saved
    base_dir = Path(__file__).resolve().parent.parent.parent.parent
    save_dir = base_dir / "Backend" / "dataset" / "raw" / "xl"
    
    # Create the directory if it does not exist
    if not save_dir.exists():
        print(f"📁 Creating directory: {save_dir}")
        save_dir.mkdir(parents=True, exist_ok=True)
    else:
        print(f"📁 Directory exists: {save_dir}")

    try:
        print(f"📡 Connecting to {url}...")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, verify=False, timeout=30)
        response.raise_for_status()

        print("✅ Successfully connected to Fisheries Ministry website")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all link tags
        links = soup.find_all('a')
        
        download_count = 0
        skip_count = 0
        
        print("\n🔍 Scanning for Excel files...")
        
        for link in links:
            href = link.get('href')
            if href and (href.endswith('.xlsx') or href.endswith('.xls')):
                full_url = urljoin(url, href)
                # Keep original filename
                filename = href.split('/')[-1]
                
                # Replace %20 with space if needed or url decoding
                from urllib.parse import unquote
                filename = unquote(filename)
                
                save_path = save_dir / filename
                
                # Check if we already have it downloaded
                if not save_path.exists():
                    print(f"   ⬇️ Downloading new file: {filename}")
                    try:
                        file_response = requests.get(full_url, headers=headers, verify=False, timeout=30)
                        file_response.raise_for_status()
                        
                        with open(save_path, 'wb') as f:
                            f.write(file_response.content)
                        download_count += 1
                        print(f"      ✅ Saved successfully!")
                    except Exception as fe:
                        print(f"      ❌ Failed to download {filename}: {fe}")
                else:
                    skip_count += 1
                    
        print("\n" + "="*60)
        if download_count > 0:
            print(f"✅ SUCCESS: Downloaded {download_count} new file(s)!")
        else:
            print(f"✅ SUCCESS: All up-to-date. Skipped {skip_count} existing file(s). No new data found.")
        print("="*60)

    except Exception as e:
        print(f"\n❌ ERROR: Failed to access the website or download files.")
        print(f"Details: {str(e)}")
        print("="*60)

if __name__ == "__main__":
    fetch_latest_fish_prices()
