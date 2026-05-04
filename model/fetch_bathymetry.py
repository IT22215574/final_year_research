#!/usr/bin/env python3
"""
Download bathymetry (sea floor depth) data for Sri Lanka region
from Copernicus Marine Service.
"""

import copernicusmarine
import os

def download_bathymetry():
    """
    Download bathymetry data for Sri Lanka's full Exclusive Economic Zone (EEZ).

    Coordinates:
    - Latitude: 2°N to 14°N
    - Longitude: 74°E to 86°E
    """

    # Ensure unified output directory exists
    base_dir = 'Fish zone daily data'
    os.makedirs(base_dir, exist_ok=True)

    output_file = os.path.join(base_dir, 'bathymetry.nc')

    print("Downloading bathymetry data for Sri Lanka EEZ...")
    print(f"Region: Lat [2°N, 14°N], Lon [74°E, 86°E]")

    try:
        # Download bathymetry data from Copernicus Marine Service
        copernicusmarine.subset(
                dataset_id='cmems_mod_glo_phy_anfc_0.083deg_static',
                variables=['deptho'],  # ocean depth variable
                minimum_longitude=74,
                maximum_longitude=86,
                minimum_latitude=2,
                maximum_latitude=14,
                output_filename=os.path.basename(output_file),
                output_directory=base_dir,
                force_download=True,
                username=os.getenv("COPERNICUS_USER", "your_username_here"),
                password=os.getenv("COPERNICUS_PASS", "your_password_here"),
            )

        print(f"✓ Bathymetry data successfully downloaded to: {output_file}")
        print(f"  Variable: deptho (ocean depth in meters)")

    except Exception as e:
        print(f"✗ Error downloading bathymetry data: {e}")
        print("\nTrying alternative dataset...")

        # Alternative: try the global ocean physics analysis and forecast product
        try:
            copernicusmarine.subset(
                dataset_id='cmems_mod_glo_phy-thetao_anfc_0.083deg_PT6H-i',
                variables=['depth'],
                minimum_longitude=74,
                maximum_longitude=86,
                minimum_latitude=2,
                maximum_latitude=14,
                output_filename=os.path.basename(output_file),
                output_directory=base_dir,
                force_download=True,
                username=os.getenv("COPERNICUS_USER", "your_username_here"),
                password=os.getenv("COPERNICUS_PASS", "your_password_here"),
            )
            print(f"✓ Bathymetry data successfully downloaded to: {output_file}")
        except Exception as e2:
            print(f"✗ Alternative download also failed: {e2}")
            print("\nPlease check available datasets using:")
            print("  copernicusmarine describe --include-datasets | grep -i bath")

if __name__ == "__main__":
    download_bathymetry()
