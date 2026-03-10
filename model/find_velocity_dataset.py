#!/usr/bin/env python3
"""Search for dataset with uo and vo variables."""

import os
import copernicusmarine

COPERNICUS_USER = os.getenv("COPERNICUS_USER", "ravindujayaweera123@gmail.com")
COPERNICUS_PASS = os.getenv("COPERNICUS_PASS", "XarW6K6zRiF5!hk")

# Try different dataset IDs that might have ocean velocity data
dataset_ids = [
    "cmems_mod_glo_phy_anfc_0.083deg_P1D-m",  # daily mean
    "cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m",  # currents daily
    "cmems_mod_glo_phy-cur_anfc_0.083deg_PT6H-i",  # currents 6-hourly
    "cmems_mod_glo_phy_anfc_0.083deg_PT1H-m",  # hourly mean
]

for did in dataset_ids:
    print(f"\n{'='*70}")
    print(f"Checking dataset: {did}")
    print(f"{'='*70}")
    try:
        info = copernicusmarine.describe(dataset_id=did)
        if hasattr(info, 'products') and info.products:
            product = info.products[0]
            if hasattr(product, 'datasets') and product.datasets:
                dataset = product.datasets[0]
                if hasattr(dataset, 'versions') and dataset.versions:
                    version = dataset.versions[0]
                    if hasattr(version, 'parts') and version.parts:
                        part = version.parts[0]
                        if hasattr(part, 'services'):
                            for service in part.services:
                                if hasattr(service, 'variables') and service.variables:
                                    var_names = [v.short_name for v in service.variables]
                                    print(f"✓ Service: {service.service_name}")
                                    print(f"  Variables: {', '.join(var_names[:20])}")
                                    if 'uo' in var_names and 'vo' in var_names:
                                        print(f"\n  ✓✓ FOUND! This dataset has 'uo' and 'vo'")
                                        print(f"  Dataset ID: {did}")
                                        break
    except Exception as e:
        print(f"✗ Not available or error: {str(e)[:100]}")
