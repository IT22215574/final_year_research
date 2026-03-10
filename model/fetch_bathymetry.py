#!/usr/bin/env python3
"""
Download bathymetry (sea floor depth) data for Sri Lanka region
from Copernicus Marine Service.
"""

import copernicusmarine
import os

def download_bathymetry():
    """
    Download bathymetry data for Sri Lanka ocean region.
    
    Coordinates:
    - Latitude: 5°N to 10°N
    - Longitude: 79°E to 82°E
    """
    
    # Ensure output directory exists
    os.makedirs('bathymetry_data', exist_ok=True)
    
    output_file = 'bathymetry_data/bathymetry.nc'
    
    print("Downloading bathymetry data for Sri Lanka region...")
    print(f"Region: Lat [5°N, 10°N], Lon [79°E, 82°E]")
    
    try:
        # Download bathymetry data from Copernicus Marine Service
        copernicusmarine.subset(
            dataset_id='cmems_mod_glo_phy_anfc_0.083deg_static',
            variables=['deptho'],  # ocean depth variable
            minimum_longitude=79,
            maximum_longitude=82,
            minimum_latitude=5,
            maximum_latitude=10,
            output_filename=output_file
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
                minimum_longitude=79,
                maximum_longitude=82,
                minimum_latitude=5,
                maximum_latitude=10,
                output_filename=output_file
            )
            print(f"✓ Bathymetry data successfully downloaded to: {output_file}")
        except Exception as e2:
            print(f"✗ Alternative download also failed: {e2}")
            print("\nPlease check available datasets using:")
            print("  copernicusmarine describe --include-datasets | grep -i bath")

if __name__ == "__main__":
    download_bathymetry()
