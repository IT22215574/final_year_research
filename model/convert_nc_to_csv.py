#!/usr/bin/env python3
"""
Convert NetCDF (.nc) files to CSV format.
Saves CSV files in the same directory as the .nc files.
"""

import sys
from pathlib import Path
import xarray as xr
import pandas as pd

# Directory containing .nc files
DATA_DIR = Path(__file__).parent / "Fish zone daily data"

def convert_nc_to_csv():
    """Convert all .nc files in DATA_DIR to CSV format."""
    
    if not DATA_DIR.exists():
        print(f"❌ Directory not found: {DATA_DIR}")
        return 1
    
    # Find all .nc files
    nc_files = sorted(DATA_DIR.glob("*.nc"))
    
    if not nc_files:
        print(f"⚠️  No .nc files found in {DATA_DIR}")
        return 0
    
    print(f"Found {len(nc_files)} .nc files to convert:")
    print("-" * 80)
    
    for nc_file in nc_files:
        try:
            print(f"\n📂 Processing: {nc_file.name}")
            
            # Open the NetCDF file
            ds = xr.open_dataset(nc_file)
            
            print(f"   Dataset dimensions: {dict(ds.dims)}")
            print(f"   Dataset variables: {list(ds.data_vars.keys())}")
            print(f"   Dataset coordinates: {list(ds.coords.keys())}")
            
            # Convert to stacked/flattened format
            # Stack all dimensions into a single dimension, then convert to DataFrame
            data_vars = {}
            
            # Convert each data variable to a flattened series
            for var_name in ds.data_vars:
                var = ds[var_name]
                # Stack all dimensions
                stacked = var.stack(flattened_index=var.dims)
                data_vars[var_name] = stacked.values
            
            # Convert coordinates to dataframe format
            for coord_name in ds.coords:
                coord = ds[coord_name]
                if len(coord.dims) <= 1:  # Only include 1D coordinates
                    data_vars[coord_name] = coord.values
            
            # Create DataFrame
            if data_vars:
                # Get the max length to pad arrays
                max_len = max(len(v) if hasattr(v, '__len__') else 1 for v in data_vars.values())
                
                # Pad arrays to same length
                padded_dict = {}
                for key, val in data_vars.items():
                    if hasattr(val, '__len__'):
                        if len(val) < max_len:
                            padded_val = list(val) + [None] * (max_len - len(val))
                        else:
                            padded_val = list(val)[:max_len]
                        padded_dict[key] = padded_val
                    else:
                        padded_dict[key] = [val] * max_len
                
                df = pd.DataFrame(padded_dict)
                
                # Save to CSV
                csv_file = nc_file.with_suffix(".csv")
                df.to_csv(csv_file, index=False)
                
                file_size = csv_file.stat().st_size / 1024  # KB
                rows = len(df)
                cols = len(df.columns)
                print(f"   ✓ Converted to CSV: {csv_file.name} ({file_size:.1f} KB, {rows} rows × {cols} cols)")
            
            ds.close()
            
        except Exception as e:
            print(f"   ⚠️  Warning with {nc_file.name}: {e}")
            print(f"   Trying alternative conversion method...")
            try:
                # Fallback: convert to xarray's array representation
                ds = xr.open_dataset(nc_file)
                df = ds.to_array().to_pandas().reset_index()
                csv_file = nc_file.with_suffix(".csv")
                df.to_csv(csv_file, index=False)
                file_size = csv_file.stat().st_size / 1024
                print(f"   ✓ Alternative conversion successful: {csv_file.name} ({file_size:.1f} KB)")
                ds.close()
            except Exception as e2:
                print(f"   ❌ Failed all conversion attempts: {e2}")
                return 1
    
    print("\n" + "=" * 80)
    print("✓ Conversion complete!")
    return 0


if __name__ == "__main__":
    sys.exit(convert_nc_to_csv())
