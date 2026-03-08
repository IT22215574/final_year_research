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
    The NRT dataset is typically available with a ~1-day lag, so we use
    yesterday as a safe 'latest' date.  Adjust if needed.
    """
    yesterday = datetime.date.today() - datetime.timedelta(days=1)
    return yesterday.isoformat()


def main() -> None:
    # ------------------------------------------------------------------
    # 1. Login
    # ------------------------------------------------------------------
    print("Logging in to Copernicus Marine Service …")
    copernicusmarine.login(
        username=COPERNICUS_USER,
        password=COPERNICUS_PASS,
    )
    print("Login successful.\n")

    # ------------------------------------------------------------------
    # 2. Determine the latest available date
    # ------------------------------------------------------------------
    latest_date = get_latest_date()
    print(f"Fetching SST data for date : {latest_date}")
    print(f"Region  : lon [{MIN_LON}, {MAX_LON}]  lat [{MIN_LAT}, {MAX_LAT}]\n")

    # ------------------------------------------------------------------
    # 3. Subset & download
    # ------------------------------------------------------------------
    copernicusmarine.subset(
        dataset_id=DATASET_ID,
        variables=[VARIABLE],
        minimum_longitude=MIN_LON,
        maximum_longitude=MAX_LON,
        minimum_latitude=MIN_LAT,
        maximum_latitude=MAX_LAT,
        start_datetime=f"{latest_date}T00:00:00",
        end_datetime=f"{latest_date}T23:59:59",
        output_filename=OUTPUT_FILE,
        output_directory=".",  # save in the current working directory
        force_download=True,
    )

    print(f"\nData saved to: {os.path.abspath(OUTPUT_FILE)}")


if __name__ == "__main__":
    main()
