#!/usr/bin/env python3
"""
Daily Ocean Environmental Data Fetcher from Copernicus Marine Service

This script downloads three datasets from Copernicus Marine Service:
1. Sea Surface Temperature (SST)
2. Ocean Currents (eastward and northward velocities)
3. Chlorophyll Concentration

The script is designed to run daily via cron job or scheduler.
It automatically detects today's date and downloads the latest available data
for the Sri Lanka ocean region (Lat: 5-10°N, Lon: 79-82°E).

Author: Ravindu Jayaweera
Date: March 2026
"""

import os
import sys
import datetime
import logging
from pathlib import Path
from typing import Optional, Tuple
import copernicusmarine

# ==============================================================================
# CONFIGURATION
# ==============================================================================

# Credentials (set via environment variables - recommended for security)
COPERNICUS_USER = os.getenv("COPERNICUS_USER", "your_username_here")
COPERNICUS_PASS = os.getenv("COPERNICUS_PASS", "your_password_here")

# Sri Lanka bounding box coordinates
MIN_LON, MAX_LON = 79.0, 82.0
MIN_LAT, MAX_LAT = 5.0, 10.0

# Dataset configurations (verified dataset IDs from Copernicus Marine Service)
DATASETS = {
    "sst": {
        "id": "METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2",
        "variables": ["analysed_sst"],
        "folder": "sst_data",
        "filename_prefix": "sst",
        "description": "Sea Surface Temperature"
    },
    "currents": {
        "id": "cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m",
        "variables": ["uo", "vo"],  # eastward and northward velocities
        "folder": "ocean_currents",
        "filename_prefix": "currents",
        "description": "Ocean Currents"
    },
    "chlorophyll": {
        "id": "cmems_obs-oc_glo_bgc-plankton_nrt_l4-gapfree-multi-4km_P1D",
        "variables": ["CHL"],
        "folder": "chlorophyll_data",
        "filename_prefix": "chlorophyll",
        "description": "Chlorophyll Concentration"
    }
}

# Logging configuration
LOG_FILE = "copernicus_download_log.txt"
MAX_RETRY_DAYS = 5  # Try today and up to 4 days back
KEEP_ONLY_LATEST = True  # Auto-delete old files, keep only the latest

# ==============================================================================
# LOGGING SETUP
# ==============================================================================

def setup_logging():
    """Configure logging to both file and console."""
    # Create logger
    logger = logging.getLogger("CopernicusFetcher")
    logger.setLevel(logging.INFO)
    
    # File handler
    file_handler = logging.FileHandler(LOG_FILE, mode='a')
    file_handler.setLevel(logging.INFO)
    file_formatter = logging.Formatter(
        '%(asctime)s | %(levelname)s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(file_formatter)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter('%(levelname)s: %(message)s')
    console_handler.setFormatter(console_formatter)
    
    # Add handlers
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

logger = setup_logging()

# ==============================================================================
# UTILITY FUNCTIONS
# ==============================================================================

def ensure_directory(directory: str) -> None:
    """Create directory if it doesn't exist."""
    Path(directory).mkdir(parents=True, exist_ok=True)


def cleanup_old_files(folder: str, filename_prefix: str) -> None:
    """Keep only the latest file in a folder, delete older ones."""
    if not KEEP_ONLY_LATEST:
        return
    
    try:
        files = sorted(Path(folder).glob(f"{filename_prefix}_*.nc"), reverse=True)
        if len(files) > 1:
            for old_file in files[1:]:
                old_file.unlink()
                logger.info(f"Deleted old file: {old_file.name}")
    except Exception as e:
        logger.warning(f"Could not cleanup old files in {folder}: {e}")
    logger.debug(f"Ensured directory exists: {directory}")


def get_date_range(days_back: int = 0) -> Tuple[str, str]:
    """
    Get start and end datetime strings for a specific date.
    
    Args:
        days_back: Number of days to go back from today (0 = today)
    
    Returns:
        Tuple of (start_datetime, end_datetime) in ISO format
    """
    target_date = datetime.date.today() - datetime.timedelta(days=days_back)
    start_dt = f"{target_date.isoformat()}T00:00:00"
    end_dt = f"{target_date.isoformat()}T23:59:59"
    return start_dt, end_dt


def validate_credentials() -> bool:
    """Check if Copernicus credentials are configured."""
    if COPERNICUS_USER == "your_username_here" or COPERNICUS_PASS == "your_password_here":
        logger.error("Copernicus credentials not configured!")
        logger.error("Set COPERNICUS_USER and COPERNICUS_PASS environment variables")
        return False
    return True

# ==============================================================================
# DATA DOWNLOAD FUNCTIONS
# ==============================================================================

def download_dataset(
    dataset_key: str,
    date_str: str,
    start_datetime: str,
    end_datetime: str
) -> bool:
    """
    Download a specific dataset from Copernicus Marine Service.
    
    Args:
        dataset_key: Key from DATASETS dict ('sst', 'currents', or 'chlorophyll')
        date_str: Date string in YYYY-MM-DD format
        start_datetime: Start datetime in ISO format
        end_datetime: End datetime in ISO format
    
    Returns:
        True if download successful, False otherwise
    """
    config = DATASETS[dataset_key]
    
    # Ensure output directory exists
    ensure_directory(config["folder"])
    
    # Generate output filename
    filename = f"{config['filename_prefix']}_{date_str}.nc"
    output_path = os.path.join(config["folder"], filename)
    
    try:
        logger.info(f"Downloading {config['description']} for {date_str}...")
        logger.info(f"  Dataset ID: {config['id']}")
        logger.info(f"  Variables: {', '.join(config['variables'])}")
        logger.info(f"  Region: Lat[{MIN_LAT}, {MAX_LAT}] Lon[{MIN_LON}, {MAX_LON}]")
        
        # Download data using copernicusmarine
        copernicusmarine.subset(
            dataset_id=config["id"],
            variables=config["variables"],
            minimum_longitude=MIN_LON,
            maximum_longitude=MAX_LON,
            minimum_latitude=MIN_LAT,
            maximum_latitude=MAX_LAT,
            start_datetime=start_datetime,
            end_datetime=end_datetime,
            output_filename=filename,
            output_directory=config["folder"],
            force_download=True,
            username=COPERNICUS_USER,
            password=COPERNICUS_PASS,
        )
        
        # Verify file was created
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            logger.info(f"✓ Successfully downloaded {config['description']}")
            logger.info(f"  File: {output_path}")
            logger.info(f"  Size: {file_size / 1024:.2f} KB")
            
            # Cleanup old files, keep only the latest
            cleanup_old_files(config["folder"], config["filename_prefix"])
            
            return True
        else:
            logger.error(f"✗ File not created: {output_path}")
            return False
            
    except Exception as e:
        logger.error(f"✗ Failed to download {config['description']}: {str(e)}")
        return False


def download_sst(date_str: str, start_dt: str, end_dt: str) -> bool:
    """Download Sea Surface Temperature data."""
    return download_dataset("sst", date_str, start_dt, end_dt)


def download_ocean_currents(date_str: str, start_dt: str, end_dt: str) -> bool:
    """Download Ocean Currents data (eastward and northward velocities)."""
    return download_dataset("currents", date_str, start_dt, end_dt)


def download_chlorophyll(date_str: str, start_dt: str, end_dt: str) -> bool:
    """Download Chlorophyll Concentration data."""
    return download_dataset("chlorophyll", date_str, start_dt, end_dt)

# ==============================================================================
# MAIN EXECUTION - DOWNLOAD LATEST AVAILABLE DATA
# ==============================================================================

def download_latest_for_dataset(dataset_key: str) -> bool:
    """
    Download the latest available data for a specific dataset.
    Tries multiple recent dates until successful.
    
    Args:
        dataset_key: Key from DATASETS dict ('sst', 'currents', or 'chlorophyll')
    
    Returns:
        True if download successful, False otherwise
    """
    config = DATASETS[dataset_key]
    
    for days_back in range(MAX_RETRY_DAYS):
        target_date = datetime.date.today() - datetime.timedelta(days=days_back)
        date_str = target_date.isoformat()
        start_dt, end_dt = get_date_range(days_back)
        
        logger.info(f"Trying {config['description']} for {date_str}...")
        
        if download_dataset(dataset_key, date_str, start_dt, end_dt):
            logger.info(f"✓ Got latest {config['description']}: {date_str}")
            return True
    
    logger.error(f"✗ Failed to download {config['description']} for any recent date")
    return False


def main() -> int:
    """
    Main function to orchestrate daily data downloads.
    Downloads the latest available data for each dataset independently.
    
    Returns:
        Exit code (0 for success, 1 for failure)
    """
    logger.info("=" * 80)
    logger.info("Copernicus Marine Service Daily Data Fetcher")
    logger.info("=" * 80)
    logger.info(f"Run started at: {datetime.datetime.now()}")
    logger.info(f"Mode: Download LATEST available data only")
    
    # Validate credentials
    if not validate_credentials():
        return 1
    
    # Download latest available data for each dataset independently
    logger.info("=" * 80)
    logger.info("Downloading latest available data for each dataset...")
    logger.info("=" * 80)
    
    sst_success = download_latest_for_dataset("sst")
    currents_success = download_latest_for_dataset("currents")
    chlorophyll_success = download_latest_for_dataset("chlorophyll")
    
    # Summary
    logger.info("=" * 80)
    logger.info("DOWNLOAD SUMMARY")
    logger.info("=" * 80)
    logger.info(f"Sea Surface Temperature: {'✓ SUCCESS' if sst_success else '✗ FAILED'}")
    logger.info(f"Ocean Currents:          {'✓ SUCCESS' if currents_success else '✗ FAILED'}")
    logger.info(f"Chlorophyll:             {'✓ SUCCESS' if chlorophyll_success else '✗ FAILED'}")
    logger.info("=" * 80)
    
    if sst_success and currents_success and chlorophyll_success:
        logger.info("✓ ALL DATASETS DOWNLOADED SUCCESSFULLY")
        logger.info(f"Run completed at: {datetime.datetime.now()}")
        logger.info("")
        return 0
    else:
        logger.warning("⚠ Some datasets failed to download")
        logger.info("  Possible reasons:")
        logger.info("  - Data not yet available for recent dates")
        logger.info("  - Network connectivity issues")
        logger.info("  - Copernicus service temporarily unavailable")
        logger.info(f"Run completed at: {datetime.datetime.now()}")
        logger.info("")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
