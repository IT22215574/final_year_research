#!/usr/bin/env python3
"""
Quick diagnostic to check data files
"""
import xarray as xr
from pathlib import Path

# Data directories
SST_DATA_DIR = Path(__file__).parent / "sst_data"
CHLOROPHYLL_DATA_DIR = Path(__file__).parent / "chlorophyll_data"
CURRENTS_DATA_DIR = Path(__file__).parent / "ocean_currents"

def get_latest_file(directory, pattern):
    files = sorted(directory.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0] if files else None

def check_dataset(ds_path, name):
    print(f"\n{'='*60}")
    print(f"Checking {name}: {ds_path.name}")
    print(f"{'='*60}")
    
    ds = xr.open_dataset(ds_path)
    
    print("\nDimensions:")
    for dim, size in ds.dims.items():
        print(f"  {dim}: {size}")
    
    print("\nCoordinates:")
    for coord in ds.coords:
        print(f"  {coord}: {ds.coords[coord].shape}")
        vals = ds.coords[coord].values
        if ds.coords[coord].size < 100 and hasattr(vals[0], '__float__'):
            print(f"    Range: {vals.min():.3f} to {vals.max():.3f}")
    
    print("\nVariables:")
    for var in ds.data_vars:
        print(f"  {var}: {ds[var].shape}")
        data = ds[var].values
        valid_data = data[~pd.isna(data)]
        if len(valid_data) > 0:
            print(f"    Valid values: {len(valid_data)}")
            print(f"    Range: {valid_data.min():.4f} to {valid_data.max():.4f}")
        else:
            print(f"    No valid data!")
    
    ds.close()

# Check all datasets
import pandas as pd

print("DIAGNOSTIC CHECK OF OCEAN DATA FILES")
print("="*60)

sst_file = get_latest_file(SST_DATA_DIR, "sst_*.nc")
chlor_file = get_latest_file(CHLOROPHYLL_DATA_DIR, "chlorophyll_*.nc")
currents_file = get_latest_file(CURRENTS_DATA_DIR, "currents_*.nc")

if sst_file:
    check_dataset(sst_file, "SST")
else:
    print("\nNo SST file found!")

if chlor_file:
    check_dataset(chlor_file, "Chlorophyll")
else:
    print("\nNo Chlorophyll file found!")

if currents_file:
    check_dataset(currents_file, "Ocean Currents")
else:
    print("\nNo Currents file found!")

print("\n" + "="*60)
print("DIAGNOSTIC COMPLETE")
print("="*60)
