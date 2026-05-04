# Ocean Environmental Data Setup Guide
## Copernicus Marine Service - Sri Lanka Region

This guide covers how to download and automatically update four types of ocean environmental data for the Sri Lanka region (Latitude: 5-10°N, Longitude: 79-82°E).

---

## 📊 Available Datasets

### 1. Sea Surface Temperature (SST) ☀️
- **Dataset ID**: `METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2`
- **Variable**: `analysed_sst`
- **Update Frequency**: **Daily** (near real-time satellite observations)
- **Output Folder**: `sst_data/`
- **Filename Format**: `sst_YYYY-MM-DD.nc`
- **Description**: Level 4 global sea surface temperature analysis from multiple satellite sensors

### 2. Chlorophyll Concentration 🌿
- **Dataset ID**: `cmems_obs-oc_glo_bgc-plankton_nrt_l4-gapfree-multi-4km_P1D`
- **Variable**: `CHL` (chlorophyll-a concentration in mg/m³)
- **Update Frequency**: **Daily** (near real-time satellite observations)
- **Output Folder**: `chlorophyll_data/`
- **Filename Format**: `chlorophyll_YYYY-MM-DD.nc`
- **Description**: Ocean color data indicating phytoplankton biomass and primary productivity

### 3. Ocean Currents 🌊
- **Dataset ID**: `cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m`
- **Variables**: 
  - `uo` (eastward velocity in m/s)
  - `vo` (northward velocity in m/s)
- **Update Frequency**: **Daily** (model analysis and forecast)
- **Output Folder**: `ocean_currents/`
- **Filename Format**: `currents_YYYY-MM-DD.nc`
- **Description**: Daily mean ocean current velocities from global ocean physics model

### 4. Bathymetry (Sea Floor Depth) 🏔️
- **Dataset ID**: `cmems_mod_glo_phy_anfc_0.083deg_static`
- **Variable**: `deptho` (ocean depth in meters)
- **Update Frequency**: **Static** (one-time download - sea floor topography doesn't change)
- **Output Folder**: `bathymetry_data/`
- **Filename**: `bathymetry.nc`
- **Description**: Sea floor depth/topography data for the region

---

## 🚀 Initial Setup

### Step 1: Create Copernicus Marine Service Account

1. Go to: https://data.marine.copernicus.eu/register
2. Fill out the registration form
3. Verify your email address
4. Note your **username** (email) and **password**

### Step 2: Install Python Dependencies

```bash
# Install the Copernicus Marine Service Python client
pip install copernicusmarine

# Or if using pip3
pip3 install copernicusmarine

# Optional: Install in a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install copernicusmarine
```

#### Other Dependencies (usually pre-installed)
The following packages are typically included with Python, but you may need to install them:
```bash
pip install netCDF4 xarray numpy matplotlib
```

### Step 3: Configure Credentials

**Option A: Environment Variables (Recommended for Security)**

Add to your `~/.bashrc` or `~/.zshrc` file:
```bash
export COPERNICUS_USER="your_email@example.com"
export COPERNICUS_PASS="your_password"
```

Then reload:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

**Option B: Temporary Session**
```bash
export COPERNICUS_USER="your_email@example.com"
export COPERNICUS_PASS="your_password"
```
(This only lasts for the current terminal session)

**Option C: Edit the Script Directly** (Not recommended - security risk)
Edit `fetch_copernicus_daily.sh` and replace the credentials (keep this file private!)

---

## 📥 Manual Download Commands

### Download Sea Surface Temperature (SST)
```bash
cd ~/Desktop/project/final_year_research/model

python3 -c "
import copernicusmarine
copernicusmarine.subset(
    dataset_id='METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2',
    variables=['analysed_sst'],
    minimum_longitude=79, maximum_longitude=82,
    minimum_latitude=5, maximum_latitude=10,
    start_datetime='2026-03-10T00:00:00',
    end_datetime='2026-03-10T23:59:59',
    output_filename='sst_data/sst_2026-03-10.nc'
)
print('✓ SST downloaded')
"
```

### Download Chlorophyll Concentration
```bash
python3 -c "
import copernicusmarine
copernicusmarine.subset(
    dataset_id='cmems_obs-oc_glo_bgc-plankton_nrt_l4-gapfree-multi-4km_P1D',
    variables=['CHL'],
    minimum_longitude=79, maximum_longitude=82,
    minimum_latitude=5, maximum_latitude=10,
    start_datetime='2026-03-10T00:00:00',
    end_datetime='2026-03-10T23:59:59',
    output_filename='chlorophyll_data/chlorophyll_2026-03-10.nc'
)
print('✓ Chlorophyll downloaded')
"
```

### Download Ocean Currents
```bash
python3 -c "
import copernicusmarine
copernicusmarine.subset(
    dataset_id='cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m',
    variables=['uo', 'vo'],
    minimum_longitude=79, maximum_longitude=82,
    minimum_latitude=5, maximum_latitude=10,
    start_datetime='2026-03-10T00:00:00',
    end_datetime='2026-03-10T23:59:59',
    output_filename='ocean_currents/currents_2026-03-10.nc'
)
print('✓ Ocean currents downloaded')
"
```

### Download Bathymetry (One-Time)
```bash
python3 fetch_bathymetry.py
```

Or manually:
```bash
python3 -c "
import copernicusmarine
copernicusmarine.subset(
    dataset_id='cmems_mod_glo_phy_anfc_0.083deg_static',
    variables=['deptho'],
    minimum_longitude=79, maximum_longitude=82,
    minimum_latitude=5, maximum_latitude=10,
    output_filename='bathymetry_data/bathymetry.nc'
)
print('✓ Bathymetry downloaded')
"
```

---

## ⚙️ Automated Daily Downloads (Cron Job)

### Using the Provided Scripts

The project includes scripts to automatically download daily updated datasets (SST, Chlorophyll, Ocean Currents).

#### Quick Setup

1. **Make scripts executable:**
   ```bash
   cd ~/Desktop/project/final_year_research/model
   chmod +x fetch_copernicus_daily.sh
   chmod +x setup_cron_job.sh
   ```

2. **Test manual execution:**
   ```bash
   ./fetch_copernicus_daily.sh
   ```
   This downloads all three daily datasets at once.

3. **Run the setup script:**
   ```bash
   ./setup_cron_job.sh
   ```
   This will guide you through setting up the cron job.

#### Manual Cron Setup

1. **Edit your crontab:**
   ```bash
   crontab -e
   ```

2. **Add this line** (downloads daily at 6:00 AM):
   ```cron
   0 6 * * * /Users/ravindujayaweera/Desktop/project/final_year_research/model/fetch_copernicus_daily.sh >> /Users/ravindujayaweera/Desktop/project/final_year_research/model/cron.log 2>&1
   ```

3. **Save and exit** (in vim: press `Esc`, type `:wq`, press Enter)

4. **Verify the cron job is scheduled:**
   ```bash
   crontab -l
   ```

#### Cron Schedule Examples

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Daily at 6:00 AM | `0 6 * * *` | Downloads every morning |
| Daily at midnight | `0 0 * * *` | Downloads at start of day |
| Every 12 hours | `0 */12 * * *` | Downloads twice daily |
| Daily at 9:00 PM | `0 21 * * *` | Downloads every evening |
| Every Monday at 6:00 AM | `0 6 * * 1` | Weekly download |

To change the schedule, edit your crontab and modify the time values.

---

## 📂 Data Storage Structure

After setup, your data will be organized as follows:

```
model/
├── sst_data/
│   └── sst_2026-03-10.nc           # Latest SST data
├── chlorophyll_data/
│   └── chlorophyll_2026-03-10.nc   # Latest chlorophyll data
├── ocean_currents/
│   └── currents_2026-03-10.nc      # Latest current data
├── bathymetry_data/
│   └── bathymetry.nc                # Static bathymetry data
└── copernicus_download_log.txt      # Download history log
```

**Note**: By default, the automated script keeps only the latest file for each dataset to save disk space. To keep historical data, edit `fetch_copernicus_daily.py` and set `KEEP_ONLY_LATEST = False`.

---

## 🔍 Verification & Troubleshooting

### Check if Cron Job is Running
```bash
# View scheduled cron jobs
crontab -l

# Check cron log for execution history
tail -f ~/Desktop/project/final_year_research/model/cron.log

# Check download log
tail -f ~/Desktop/project/final_year_research/model/copernicus_download_log.txt
```

### Test Credentials
```bash
cd ~/Desktop/project/final_year_research/model
python3 -c "
import copernicusmarine
print('Testing credentials...')
copernicusmarine.login()
print('✓ Credentials valid!')
"
```

### Common Issues

**Issue: "Authentication failed"**
- Solution: Check your credentials in environment variables or script
- Verify login at: https://data.marine.copernicus.eu/

**Issue: "Dataset not found"**
- Solution: Dataset IDs may have changed. Search for updated IDs:
  ```bash
  copernicusmarine describe --include-datasets | grep -i "SST\|chlorophyll\|current"
  ```

**Issue: "Cron job not running"**
- Solution: Check system cron logs:
  ```bash
  # On macOS
  log show --predicate 'process == "cron"' --last 1d
  
  # On Linux
  grep CRON /var/log/syslog
  ```

**Issue: "Permission denied" when running script**
- Solution: Make script executable:
  ```bash
  chmod +x fetch_copernicus_daily.sh
  ```

---

## 📊 Using the Downloaded Data

### Python Example - Load and Visualize SST
```python
import xarray as xr
import matplotlib.pyplot as plt

# Load the latest SST data
ds = xr.open_dataset('sst_data/sst_2026-03-10.nc')

# Plot
ds['analysed_sst'].plot(cmap='coolwarm')
plt.title('Sea Surface Temperature - Sri Lanka')
plt.show()
```

### Python Example - Load All Datasets
```python
import xarray as xr

# Load all datasets
sst = xr.open_dataset('sst_data/sst_2026-03-10.nc')
chlorophyll = xr.open_dataset('chlorophyll_data/chlorophyll_2026-03-10.nc')
currents = xr.open_dataset('ocean_currents/currents_2026-03-10.nc')
bathymetry = xr.open_dataset('bathymetry_data/bathymetry.nc')

print("SST variables:", list(sst.data_vars))
print("Chlorophyll variables:", list(chlorophyll.data_vars))
print("Current variables:", list(currents.data_vars))
print("Bathymetry variables:", list(bathymetry.data_vars))
```

---

## 🔗 Additional Resources

- **Copernicus Marine Service Portal**: https://data.marine.copernicus.eu/
- **API Documentation**: https://help.marine.copernicus.eu/
- **Python Client Docs**: https://pypi.org/project/copernicusmarine/
- **Dataset Catalog**: https://data.marine.copernicus.eu/products

---

## ✅ Quick Reference Commands

```bash
# Install dependencies
pip3 install copernicusmarine

# Set credentials (add to ~/.zshrc or ~/.bashrc)
export COPERNICUS_USER="your_email@example.com"
export COPERNICUS_PASS="your_password"

# Download one-time bathymetry
python3 fetch_bathymetry.py

# Test daily downloads manually
./fetch_copernicus_daily.sh

# Setup automated downloads
./setup_cron_job.sh

# Check cron jobs
crontab -l

# View logs
tail -f copernicus_download_log.txt
```

---

**Last Updated**: March 10, 2026  
**Region**: Sri Lanka (5-10°N, 79-82°E)  
**Datasets**: 4 (SST, Chlorophyll, Ocean Currents, Bathymetry)

## One-Time Setup (Do This Once)

cd model
./setup_cron_job.sh