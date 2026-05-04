#!/usr/bin/env python3
"""Quick script to download only chlorophyll data"""
import copernicusmarine
import os
from datetime import date, timedelta

# Config
MIN_LON, MAX_LON = 79.0, 82.0
MIN_LAT, MAX_LAT = 5.0, 10.0
dataset_id = 'cmems_obs-oc_glo_bgc-plankton_nrt_l4-gapfree-multi-4km_P1D'

COPERNICUS_USER = os.getenv("COPERNICUS_USER")
COPERNICUS_PASS = os.getenv("COPERNICUS_PASS")

# Try recent dates
for days_back in range(0, 5):
    target_date = date.today() - timedelta(days=days_back)
    date_str = target_date.isoformat()
    print(f'\nTrying {date_str}...')
    
    try:
        base_dir = 'Fish zone daily data'
        os.makedirs(base_dir, exist_ok=True)
        copernicusmarine.subset(
            dataset_id=dataset_id,
            variables=['CHL'],
            minimum_longitude=MIN_LON,
            maximum_longitude=MAX_LON,
            minimum_latitude=MIN_LAT,
            maximum_latitude=MAX_LAT,
            start_datetime=f'{date_str}T00:00:00',
            end_datetime=f'{date_str}T23:59:59',
            output_filename=f'chlorophyll_{date_str}.nc',
            output_directory=base_dir,
            force_download=True,
            username=COPERNICUS_USER,
            password=COPERNICUS_PASS,
        )
        print(f'\n✓ Successfully downloaded chlorophyll for {date_str}')
        print(f'File: {base_dir}/chlorophyll_{date_str}.nc')
        break
    except Exception as e:
        print(f'✗ Failed: {str(e)[:200]}')

print('\nDone!')
