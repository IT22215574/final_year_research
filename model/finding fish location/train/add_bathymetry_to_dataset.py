#!/usr/bin/env python3
"""
Add bathymetry data to the training dataset.
This script reads the existing dataset and populates the depth column with actual bathymetry values.
"""

import pandas as pd
import xarray as xr
from pathlib import Path
import numpy as np

# Paths
DATASET_PATH = Path(__file__).parent / "final_dataset_no_bathymetry.csv"
BATHYMETRY_PATH = Path(__file__).parent.parent.parent / "bathymetry_data" / "bathymetry.nc"
OUTPUT_PATH = Path(__file__).parent / "final_dataset_with_bathymetry.csv"

def extract_bathymetry(ds, lat, lon):
    """Extract bathymetry value at given coordinates."""
    try:
        # Find coordinate names
        lat_coord = [c for c in ds.coords if 'lat' in c.lower()][0]
        lon_coord = [c for c in ds.coords if 'lon' in c.lower()][0]
        
        # Find variable name
        var_name = None
        for var in ['deptho', 'elevation', 'bathymetry', 'depth']:
            if var in ds:
                var_name = var
                break
        
        if var_name is None:
            return None
        
        # Select nearest point
        point = ds.sel({lat_coord: lat, lon_coord: lon}, method='nearest')
        val = point[var_name].values
        
        if isinstance(val, np.ndarray):
            val = val.item()
        
        val = float(val)
        
        if np.isnan(val) or np.isinf(val):
            return None
        
        # Convert elevation to positive depth if needed
        if var_name == 'elevation' and val < 0:
            val = abs(val)
        
        # Ensure reasonable depth values (0-6000m)
        if val < 0 or val > 6000:
            return None
            
        return val
    except Exception as e:
        return None

def main():
    print("Loading training dataset...")
    df = pd.read_csv(DATASET_PATH)
    print(f"Dataset shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    
    if not BATHYMETRY_PATH.exists():
        print(f"Error: Bathymetry file not found at {BATHYMETRY_PATH}")
        return 1
    
    print(f"\nLoading bathymetry data from {BATHYMETRY_PATH.name}...")
    bathy_ds = xr.open_dataset(BATHYMETRY_PATH)
    print(f"Bathymetry variables: {list(bathy_ds.variables.keys())}")
    
    print("\nExtracting bathymetry values for each training point...")
    depths = []
    valid_count = 0
    
    for idx, row in df.iterrows():
        depth = extract_bathymetry(bathy_ds, row['lat'], row['lon'])
        if depth is not None:
            valid_count += 1
        else:
            depth = 0.0  # Default for points without bathymetry data
        depths.append(depth)
        
        if (idx + 1) % 1000 == 0:
            print(f"  Processed {idx + 1}/{len(df)} rows... ({valid_count} with valid depth)")
    
    # Update depth column
    df['depth'] = depths
    
    print(f"\n✓ Completed! {valid_count}/{len(df)} points have valid bathymetry data")
    print(f"\nDepth statistics:")
    print(df['depth'].describe())
    
    # Save new dataset
    print(f"\nSaving new dataset to {OUTPUT_PATH.name}...")
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"✓ Saved successfully!")
    
    # Show distribution
    print(f"\nDepth distribution:")
    print(f"  0m (no data): {(df['depth'] == 0).sum()}")
    print(f"  0-50m: {((df['depth'] > 0) & (df['depth'] <= 50)).sum()}")
    print(f"  50-200m: {((df['depth'] > 50) & (df['depth'] <= 200)).sum()}")
    print(f"  200-1000m: {((df['depth'] > 200) & (df['depth'] <= 1000)).sum()}")
    print(f"  >1000m: {(df['depth'] > 1000).sum()}")
    
    bathy_ds.close()
    return 0

if __name__ == "__main__":
    exit(main())
