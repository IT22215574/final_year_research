#!/usr/bin/env python3
"""
Fetch Ocean Current data (eastward/northward velocities) for the Sri Lanka region
from Copernicus Marine Service using the copernicusmarine Python client.

Dataset  : GLOBAL_ANALYSISFORECAST_PHY_001_024
Variables: uo (eastward velocity), vo (northward velocity)
Region   : Latitude 5–10 °N, Longitude 79–82 °E
"""

import os
import datetime
import copernicusmarine
import shutil

# ---------------------------------------------------------------------------
# Credentials – set these via environment variables (recommended) or replace
# the default strings below with your actual username / password.
# ---------------------------------------------------------------------------
COPERNICUS_USER = os.getenv("COPERNICUS_USER", "your_username_here")
COPERNICUS_PASS = os.getenv("COPERNICUS_PASS", "your_password_here")

# ---------------------------------------------------------------------------
# Dataset parameters
# ---------------------------------------------------------------------------
DATASET_ID = "cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m"  # Daily mean ocean currents
VARIABLES = ["uo", "vo"]  # eastward and northward ocean current velocities

# Sri Lanka bounding box
MIN_LON, MAX_LON = 79.0, 82.0
MIN_LAT, MAX_LAT = 5.0, 10.0

# Base data folder for unified storage
BASE_DATA_FOLDER = "Fish zone daily data"

# Output files
OUTPUT_FILE_LATEST = os.path.join(BASE_DATA_FOLDER, "currents_latest.nc")
DATA_ARCHIVE_DIR = os.path.join(BASE_DATA_FOLDER, "ocean_currents_archive")


def ensure_archive_directory() -> None:
    """Create archive directory if it doesn't exist."""
    if not os.path.exists(DATA_ARCHIVE_DIR):
        os.makedirs(DATA_ARCHIVE_DIR)
        print(f"Created archive directory: {DATA_ARCHIVE_DIR}")


def try_fetch_ocean_currents(date_str: str) -> bool:
    """
    Try to fetch ocean current data for a specific date.
    Returns True if successful, False otherwise.
    """
    try:
        print(f"Attempting to fetch ocean current data for date: {date_str}")
        print(f"Region: lon [{MIN_LON}, {MAX_LON}]  lat [{MIN_LAT}, {MAX_LAT}]")
        print(f"Variables: {', '.join(VARIABLES)}\n")
        
        # ensure base folder exists
        if not os.path.exists(BASE_DATA_FOLDER):
            os.makedirs(BASE_DATA_FOLDER, exist_ok=True)

        copernicusmarine.subset(
            dataset_id=DATASET_ID,
            variables=VARIABLES,
            minimum_longitude=MIN_LON,
            maximum_longitude=MAX_LON,
            minimum_latitude=MIN_LAT,
            maximum_latitude=MAX_LAT,
            start_datetime=f"{date_str}T00:00:00",
            end_datetime=f"{date_str}T23:59:59",
            output_filename=os.path.basename(OUTPUT_FILE_LATEST),
            output_directory=BASE_DATA_FOLDER,
            force_download=True,
            username=COPERNICUS_USER,
            password=COPERNICUS_PASS,
        )
        
        print(f"\n✓ Data saved to: {os.path.abspath(OUTPUT_FILE_LATEST)}")
        
        # Archive the data with date stamp
        ensure_archive_directory()
        archive_filename = f"ocean_currents_{date_str}.nc"
        archive_path = os.path.join(DATA_ARCHIVE_DIR, archive_filename)
        shutil.copy2(OUTPUT_FILE_LATEST, archive_path)
        print(f"✓ Data archived to: {archive_path}")
        
        return True
    except Exception as e:
        print(f"✗ Failed to fetch data for {date_str}: {str(e)}\n")
        return False


def main() -> None:
    """
    Main function to fetch the latest available ocean current data.
    Tries multiple recent dates in case the most recent data is not yet available.
    """
    # ------------------------------------------------------------------
    # Try to fetch data for the most recent available date
    # Try today, yesterday, 2 days ago, and 3 days ago
    # ------------------------------------------------------------------
    today = datetime.date.today()
    
    for days_back in range(0, 4):  # Try 0, 1, 2, 3 days ago
        target_date = today - datetime.timedelta(days=days_back)
        date_str = target_date.isoformat()
        
        if try_fetch_ocean_currents(date_str):
            print(f"\n✓ Successfully fetched ocean current data for {date_str}")
            print(f"  - Eastward velocity (uo): m/s")
            print(f"  - Northward velocity (vo): m/s")
            break
    else:
        print("\n✗ Failed to fetch data for any recent date.")
        print("Please check your credentials and network connection.")


if __name__ == "__main__":
    main()
