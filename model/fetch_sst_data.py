"""
Fetch Sea Surface Temperature (SST) data for the Sri Lanka region
from Copernicus Marine Service using the copernicusmarine Python client.

Dataset : METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2
Variable : analysed_sst
Region   : Latitude 5–10 °N, Longitude 79–82 °E
"""

import os
import datetime
import copernicusmarine

# ---------------------------------------------------------------------------
# Credentials – set these via environment variables (recommended) or replace
# the default strings below with your actual username / password.
# ---------------------------------------------------------------------------
COPERNICUS_USER = os.getenv("COPERNICUS_USER", "your_username_here")
COPERNICUS_PASS = os.getenv("COPERNICUS_PASS", "your_password_here")

# ---------------------------------------------------------------------------
# Dataset parameters
# ---------------------------------------------------------------------------
DATASET_ID  = "METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2"
VARIABLE    = "analysed_sst"

# Sri Lanka bounding box
MIN_LON, MAX_LON = 79.0, 82.0
MIN_LAT, MAX_LAT =  5.0, 10.0

# Output file
OUTPUT_FILE = "sri_lanka_sst_latest.nc"


def get_latest_date() -> str:
    """
    Return yesterday's date as an ISO-8601 string (YYYY-MM-DD).
    The NRT dataset is typically available with a ~1-2 day lag, so we use
    yesterday as a safe 'latest' date. If yesterday fails, try 2 days ago.
    """
    yesterday = datetime.date.today() - datetime.timedelta(days=1)
    return yesterday.isoformat()


def try_fetch_sst(date_str: str) -> bool:
    """
    Try to fetch SST data for a specific date.
    Returns True if successful, False otherwise.
    """
    try:
        print(f"Attempting to fetch SST data for date: {date_str}")
        print(f"Region: lon [{MIN_LON}, {MAX_LON}]  lat [{MIN_LAT}, {MAX_LAT}]\n")
        
        copernicusmarine.subset(
            dataset_id=DATASET_ID,
            variables=[VARIABLE],
            minimum_longitude=MIN_LON,
            maximum_longitude=MAX_LON,
            minimum_latitude=MIN_LAT,
            maximum_latitude=MAX_LAT,
            start_datetime=f"{date_str}T00:00:00",
            end_datetime=f"{date_str}T23:59:59",
            output_filename=OUTPUT_FILE,
            output_directory=".",
            force_download=True,
            username=COPERNICUS_USER,
            password=COPERNICUS_PASS,
        )
        
        print(f"\n✓ Data saved to: {os.path.abspath(OUTPUT_FILE)}")
        return True
    except Exception as e:
        print(f"✗ Failed to fetch data for {date_str}: {str(e)}\n")
        return False


def main() -> None:
    # ------------------------------------------------------------------
    # 1. Login (skip if credentials exist - subset will use them)
    # ------------------------------------------------------------------
    # No need to explicitly login; subset will use stored credentials
    # or environment variables automatically

    # ------------------------------------------------------------------
    # 2. Try to fetch data for the most recent available date
    #    Try yesterday first, then 2 days ago, then 3 days ago
    # ------------------------------------------------------------------
    today = datetime.date.today()
    
    for days_back in range(1, 4):  # Try 1, 2, 3 days ago
        target_date = today - datetime.timedelta(days=days_back)
        date_str = target_date.isoformat()
        
        if try_fetch_sst(date_str):
            print(f"\n✓ Successfully fetched data for {date_str}")
            break
    else:
        print("\n✗ Failed to fetch data for any recent date.")


if __name__ == "__main__":
    main()
