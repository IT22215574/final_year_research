#!/usr/bin/env python3
"""Find available ocean current datasets from Copernicus."""

import os
import copernicusmarine

# Set credentials
COPERNICUS_USER = os.getenv("COPERNICUS_USER", "ravindujayaweera123@gmail.com")
COPERNICUS_PASS = os.getenv("COPERNICUS_PASS", "XarW6K6zRiF5!hk")

print("Searching for ocean current datasets...")
print("Keywords: current, velocity, uo, vo, global, analysis, forecast\n")

try:
    # Try to describe available datasets
    result = copernicusmarine.describe(
        contains=["current"],
        include_datasets=True
    )
    print(result)
except Exception as e:
    print(f"Error searching datasets: {e}")
    print("\nTrying alternative search method...")
    
    # Alternative: try specific known dataset patterns
    possible_ids = [
        "cmems_mod_glo_phy_anfc_0.083deg_P1D-m",
        "cmems_mod_glo_phy_my_0.083deg_P1D-m",
        "GLOBAL_MULTIYEAR_PHY_001_030",
        "GLOBAL_ANALYSIS_FORECAST_PHY_001_024",
    ]
    
    for dataset_id in possible_ids:
        try:
            print(f"\nTrying dataset: {dataset_id}")
            info = copernicusmarine.describe(dataset_id=dataset_id)
            print(f"✓ Found: {dataset_id}")
            print(info)
            break
        except:
            print(f"✗ Not available: {dataset_id}")
