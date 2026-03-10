#!/usr/bin/env python3
import xarray as xr
import numpy as np

# Test extraction
sst_ds = xr.open_dataset('sst_data/sst_2026-03-08_(2).nc')
chlor_ds = xr.open_dataset('chlorophyll_data/chlorophyll_2026-03-08.nc')
currents_ds = xr.open_dataset('ocean_currents/currents_2026-03-08.nc')

test_lat, test_lon = 7.5, 80.5

print(f'Testing extraction at {test_lat}N, {test_lon}E')
print()

# SST
try:
    point = sst_ds.sel(latitude=test_lat, longitude=test_lon, method='nearest')
    if 'analysed_sst' in point:
        val = float(point['analysed_sst'].values)
        print(f'SST: {val:.2f} K ({val-273.15:.2f}C)')
except Exception as e:
    print(f'SST error: {e}')

# Chlorophyll
try:
    point = chlor_ds.sel(latitude=test_lat, longitude=test_lon, method='nearest')
    if 'CHL' in point:
        val = float(point['CHL'].values)
        print(f'Chlorophyll: {val:.4f}')
except Exception as e:
    print(f'Chlorophyll error: {e}')

# Currents (need to handlele depth)
try:
    # Select first depth level if exists
    if 'depth' in currents_ds.dims:
        point = currents_ds.isel(depth=0).sel(latitude=test_lat, longitude=test_lon, method='nearest')
    else:
        point = currents_ds.sel(latitude=test_lat, longitude=test_lon, method='nearest')
    
    if 'uo' in point and 'vo' in point:
        u = float(point['uo'].values)
        v = float(point['vo'].values)
        print(f'Currents U: {u:.4f}, V: {v:.4f}')
except Exception as e:
    print(f'Currents error: {e}')
