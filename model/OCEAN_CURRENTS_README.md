# Ocean Current Data Automation System

This system automatically fetches daily ocean current data from Copernicus Marine Service for the Sri Lanka region and archives it for future use.

## Overview

**Dataset**: `GLOBAL_ANALYSISFORECAST_PHY_001_024`  
**Variables**: 
- `uo` - Eastward ocean current velocity (m/s)
- `vo` - Northward ocean current velocity (m/s)

**Region**: Sri Lanka Ocean Area
- Latitude: 5°N to 10°N
- Longitude: 79°E to 82°E

## Files

1. **fetch_ocean_currents.py** - Main Python script that downloads data
2. **fetch_ocean_currents_daily.sh** - Bash script for automated daily execution
3. **analyze_ocean_currents.py** - Analysis and visualization script

## Setup Instructions

### 1. Install Required Dependencies

```bash
pip install copernicusmarine xarray numpy matplotlib netCDF4
```

### 2. Configure Copernicus Credentials

The credentials are already set in the bash script, but you can also set them as environment variables:

```bash
export COPERNICUS_USER='your_email@example.com'
export COPERNICUS_PASS='your_password'
```

Or login once using:
```bash
copernicusmarine login
```

### 3. Test Manual Execution

```bash
# Test the fetch script
python3 model/fetch_ocean_currents.py

# Test the analysis script (after fetching data)
python3 model/analyze_ocean_currents.py
```

### 4. Setup Automated Daily Execution

#### Option A: Using Cron (Recommended for Daily Automation)

1. Open crontab editor:
```bash
crontab -e
```

2. Add this line to run daily at 2:00 AM:
```bash
0 2 * * * /Users/ravindujayaweera/Desktop/project/final_year_research/model/fetch_ocean_currents_daily.sh
```

Or run daily at a different time:
- `0 6 * * *` - Run at 6:00 AM daily
- `0 14 * * *` - Run at 2:00 PM daily
- `0 */6 * * *` - Run every 6 hours

3. Save and exit (in vi/vim: press ESC, type `:wq`, press ENTER)

4. Verify cron job is scheduled:
```bash
crontab -l
```

#### Option B: Manual Daily Execution

Run the bash script manually whenever needed:
```bash
./model/fetch_ocean_currents_daily.sh
```

## Data Storage

### Latest Data
- **File**: `ocean_currents_latest.nc`
- **Location**: Project root directory
- **Purpose**: Always contains the most recent data

### Historical Archive
- **Directory**: `ocean_currents_archive/`
- **File Format**: `ocean_currents_YYYY-MM-DD.nc`
- **Purpose**: Stores date-stamped historical data for future analysis

Example archived files:
```
ocean_currents_archive/
├── ocean_currents_2026-03-09.nc
├── ocean_currents_2026-03-08.nc
├── ocean_currents_2026-03-07.nc
└── ...
```

## Logs

All fetch operations are logged to:
- **File**: `model/ocean_currents_fetch.log`
- **Contents**: Timestamps, success/failure messages, error details

View recent logs:
```bash
tail -n 50 model/ocean_currents_fetch.log
```

## Data Usage

### Reading Ocean Current Data in Python

```python
import xarray as xr

# Open the latest data
ds = xr.open_dataset('ocean_currents_latest.nc')

# Access velocity components
uo = ds['uo']  # Eastward velocity (m/s)
vo = ds['vo']  # Northward velocity (m/s)

# Calculate current speed
import numpy as np
speed = np.sqrt(uo**2 + vo**2)

# Get data for a specific location
lat_target = 7.5
lon_target = 80.5
current_at_point = ds.sel(latitude=lat_target, longitude=lon_target, method='nearest')

print(f"Eastward velocity: {current_at_point['uo'].values} m/s")
print(f"Northward velocity: {current_at_point['vo'].values} m/s")
```

### Analyzing Historical Data

```python
import xarray as xr
import glob

# Load all archived data
archive_files = sorted(glob.glob('ocean_currents_archive/ocean_currents_*.nc'))

# Open multiple files as a single dataset
ds_historical = xr.open_mfdataset(archive_files, combine='by_coords')

# Calculate time-averaged currents
mean_uo = ds_historical['uo'].mean(dim='time')
mean_vo = ds_historical['vo'].mean(dim='time')
```

## Visualization

The `analyze_ocean_currents.py` script generates:

1. **Current Speed Map**: Magnitude of ocean currents
2. **Vector Field Map**: Direction and strength visualized with arrows

Output: `ocean_currents_visualization.png`

## Troubleshooting

### Issue: "Failed to fetch data"
**Solution**: 
- Check internet connection
- Verify Copernicus credentials
- Check if the dataset is available for the requested date

### Issue: "No data for recent dates"
**Solution**: The script automatically tries multiple recent dates (today, yesterday, 2-3 days ago)

### Issue: Cron job not running
**Solution**:
```bash
# Check if cron service is running
sudo launchctl list | grep cron

# View system logs for cron
grep CRON /var/log/system.log

# Make sure the script path is absolute in crontab
```

## Integration with Your Application

### Backend Integration (NestJS)

Add a service to read ocean current data:

```typescript
// ocean-current.service.ts
import * as netcdf4 from 'netcdf4';

export class OceanCurrentService {
  getLatestCurrents(lat: number, lon: number) {
    const file = netcdf4.open('ocean_currents_latest.nc');
    // Read and interpolate data for given coordinates
    return {
      uo: eastwardVelocity,
      vo: northwardVelocity,
      speed: Math.sqrt(uo**2 + vo**2),
      direction: Math.atan2(vo, uo) * 180 / Math.PI
    };
  }
}
```

### Mobile App Integration

Expose API endpoint to serve ocean current predictions:
```typescript
@Get('ocean-currents/:lat/:lon')
async getCurrents(
  @Param('lat') lat: number,
  @Param('lon') lon: number
) {
  return this.oceanCurrentService.getLatestCurrents(lat, lon);
}
```

## Maintenance

### Disk Space Management

The archive directory will grow over time. To manage disk space:

```bash
# Keep only last 30 days of data
find ocean_currents_archive/ -name "ocean_currents_*.nc" -mtime +30 -delete

# Or keep only last 100 files
ls -t ocean_currents_archive/ocean_currents_*.nc | tail -n +101 | xargs rm -f
```

Add to cron for automatic cleanup (runs monthly):
```bash
0 3 1 * * find /Users/ravindujayaweera/Desktop/project/final_year_research/ocean_currents_archive/ -name "ocean_currents_*.nc" -mtime +90 -delete
```

## Related Files

- SST Data Fetching: `fetch_sst_data.py`, `fetch_sst_daily.sh`
- SST Analysis: `analyze_sst_data.py`

## Support

For issues with Copernicus Marine Service:
- Documentation: https://help.marine.copernicus.eu/
- Python Client: https://pypi.org/project/copernicusmarine/
