# Copernicus Marine Service Daily Data Fetcher

## Overview

This script automatically downloads three types of ocean environmental data from the Copernicus Marine Service for the Sri Lanka region (Lat: 5-10°N, Lon: 79-82°E):

1. **Sea Surface Temperature (SST)**
2. **Ocean Currents** (eastward and northward velocities)
3. **Chlorophyll Concentration**

## Dataset Information

### 1. Sea Surface Temperature (SST)
- **Dataset ID**: `METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2`
- **Variable**: `analysed_sst`
- **Description**: Level 4 global sea surface temperature analysis
- **Output Folder**: `sst_data/`
- **Filename Format**: `sst_YYYY-MM-DD.nc`

### 2. Ocean Currents
- **Dataset ID**: `cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m`
- **Variables**: 
  - `uo` (eastward current velocity in m/s)
  - `vo` (northward current velocity in m/s)
- **Description**: Global ocean physics analysis and forecast, daily mean currents
- **Output Folder**: `ocean_currents/`
- **Filename Format**: `currents_YYYY-MM-DD.nc`

### 3. Chlorophyll Concentration
- **Dataset ID**: `OCEANCOLOUR_GLO_BGC_L4_NRT_009_033`
- **Variable**: `chl` (chlorophyll-a concentration)
- **Description**: Global ocean biogeochemistry Level 4 near real-time
- **Output Folder**: `chlorophyll_data/`
- **Filename Format**: `chlorophyll_YYYY-MM-DD.nc`

## Prerequisites

### 1. Python Dependencies
```bash
pip install copernicusmarine
```

### 2. Copernicus Marine Service Account
- Register at: https://data.marine.copernicus.eu/register
- Note your username and password

### 3. Set Environment Variables
```bash
export COPERNICUS_USER="your_username"
export COPERNICUS_PASS="your_password"
```

Or add to your `~/.bashrc` or `~/.zshrc`:
```bash
echo 'export COPERNICUS_USER="your_username"' >> ~/.bashrc
echo 'export COPERNICUS_PASS="your_password"' >> ~/.bashrc
source ~/.bashrc
```

## Usage

### Manual Execution

#### Python Script
```bash
cd /path/to/model/
python3 fetch_copernicus_daily.py
```

#### Shell Script
```bash
cd /path/to/model/
chmod +x fetch_copernicus_daily.sh
./fetch_copernicus_daily.sh
```

### Automated Daily Execution (Cron Job)

1. Make the shell script executable:
```bash
chmod +x /path/to/model/fetch_copernicus_daily.sh
```

2. Edit your crontab:
```bash
crontab -e
```

3. Add a cron entry (example: runs daily at 6:00 AM):
```cron
0 6 * * * /path/to/model/fetch_copernicus_daily.sh >> /path/to/model/cron.log 2>&1
```

4. Verify cron job is scheduled:
```bash
crontab -l
```

### Cron Schedule Examples

```cron
# Run daily at 6:00 AM
0 6 * * * /path/to/fetch_copernicus_daily.sh

# Run twice daily (6 AM and 6 PM)
0 6,18 * * * /path/to/fetch_copernicus_daily.sh

# Run every 6 hours
0 */6 * * * /path/to/fetch_copernicus_daily.sh
```

## Output Structure

```
model/
├── fetch_copernicus_daily.py
├── fetch_copernicus_daily.sh
├── copernicus_download_log.txt
├── sst_data/
│   ├── sst_2026-03-10.nc
│   ├── sst_2026-03-09.nc
│   └── ...
├── ocean_currents/
│   ├── currents_2026-03-10.nc
│   ├── currents_2026-03-09.nc
│   └── ...
└── chlorophyll_data/
    ├── chlorophyll_2026-03-10.nc
    ├── chlorophyll_2026-03-09.nc
    └── ...
```

## Logging

All download activities are logged to `copernicus_download_log.txt` with:
- Timestamp
- Dataset being downloaded
- Success/failure status
- File paths and sizes
- Error messages (if any)

Example log entry:
```
2026-03-10 06:00:15 | INFO | Downloading Sea Surface Temperature for 2026-03-10...
2026-03-10 06:00:45 | INFO | ✓ Successfully downloaded Sea Surface Temperature
2026-03-10 06:00:45 | INFO |   File: sst_data/sst_2026-03-10.nc
2026-03-10 06:00:45 | INFO |   Size: 1234.56 KB
```

## Error Handling

The script automatically:
1. **Retries with earlier dates**: If today's data is unavailable, it tries yesterday, 2 days ago, and 3 days ago
2. **Creates directories**: Automatically creates output folders if they don't exist
3. **Logs errors**: All errors are logged with timestamps
4. **Validates credentials**: Checks if credentials are configured before attempting downloads

## Troubleshooting

### Issue: "Copernicus credentials not configured"
**Solution**: Set environment variables `COPERNICUS_USER` and `COPERNICUS_PASS`

### Issue: "Failed to download for any recent date"
**Possible causes**:
1. Invalid credentials - verify at https://data.marine.copernicus.eu/
2. No internet connection
3. Copernicus service is down
4. Dataset IDs have changed (rare)

### Issue: Cron job not running
**Debug steps**:
1. Check cron service: `sudo systemctl status cron`
2. Check cron logs: `grep CRON /var/log/syslog`
3. Verify script permissions: `chmod +x fetch_copernicus_daily.sh`
4. Test manually first: `./fetch_copernicus_daily.sh`

### Issue: Permission denied
```bash
chmod +x fetch_copernicus_daily.py
chmod +x fetch_copernicus_daily.sh
```

## Dataset Verification

The dataset IDs have been verified against the Copernicus Marine Service catalog:

✓ **METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2** - Valid SST dataset  
✓ **cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m** - Valid ocean currents dataset  
✓ **OCEANCOLOUR_GLO_BGC_L4_NRT_009_033** - Valid chlorophyll dataset

These are the recommended near-real-time (NRT) datasets for operational use.

## Reading the Downloaded Data

To read and analyze the NetCDF files in Python:

```python
import xarray as xr

# Read SST data
sst_data = xr.open_dataset('sst_data/sst_2026-03-10.nc')
print(sst_data)

# Read ocean currents
currents = xr.open_dataset('ocean_currents/currents_2026-03-10.nc')
print(currents['uo'])  # eastward velocity
print(currents['vo'])  # northward velocity

# Read chlorophyll
chl_data = xr.open_dataset('chlorophyll_data/chlorophyll_2026-03-10.nc')
print(chl_data['chl'])
```

## Support

For Copernicus Marine Service issues:
- Documentation: https://help.marine.copernicus.eu/
- Support: servicedesk.cmems@mercator-ocean.eu

## License

This script is part of the Final Year Research project.

## Author

Ravindu Jayaweera  
March 2026
