# Automated Fish Zone Prediction System

## 🌊 Overview

This system automatically fetches live ocean environmental data and predicts fish zones in Sri Lankan waters using machine learning. It runs daily to provide up-to-date fish location predictions based on real-time ocean conditions.

## 📊 How It Works

### Daily Automated Workflow

```
┌─────────────────────────────────────────────────────────┐
│  1. DATA FETCHING (Copernicus Marine Service)          │
├─────────────────────────────────────────────────────────┤
│  • Sea Surface Temperature (SST)                        │
│  • Chlorophyll Concentration                            │
│  • Ocean Currents (U & V components)                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  2. MACHINE LEARNING PREDICTION                         │
├─────────────────────────────────────────────────────────┤
│  • Load trained Random Forest model                     │
│  • Process environmental data for Sri Lankan waters     │
│  • Apply land masking                                   │
│  • Generate fish zone predictions (probability 0-1)     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  3. OUTPUT GENERATION                                   │
├─────────────────────────────────────────────────────────┤
│  • Fish zone heatmap (PNG visualization)                │
│  • Prediction data (CSV format)                         │
│  • Geographic data (GeoJSON for mapping)                │
│  • Summary statistics (TXT report)                      │
└─────────────────────────────────────────────────────────┘
```

## 🔧 System Components

### Core Scripts

1. **`run_daily_pipeline.sh`** - Main orchestration script
   - Runs the complete workflow: data fetch → prediction → outputs
   - Handles errors and logging
   - Designed for cron job execution

2. **`predict_daily_fish_zones.py`** - ML prediction engine
   - Loads latest environmental data from NetCDF files
   - Uses trained Random Forest model
   - Generates predictions across an ocean grid
   - Creates visualizations and exports

3. **`fetch_copernicus_daily.py`** - Data downloader
   - Fetches SST, chlorophyll, and current data
   - Filters to Sri Lankan waters (5-10°N, 79-82°E)
   - Handles authentication and retries

4. **`setup_fish_zone_automation.sh`** - Automation setup
   - Interactive setup wizard
   - Configures cron jobs
   - Tests pipeline before scheduling

### Data Flow

```
Environmental Data Sources (Copernicus)
         ↓
  sst_data/*.nc
  chlorophyll_data/*.nc
  ocean_currents/*.nc
         ↓
Trained ML Model (rf_fish_zone_model.pkl)
         ↓
fish_zone_predictions/
  ├── fish_zones_YYYY-MM-DD.csv
  ├── fish_zones_YYYY-MM-DD.geojson
  ├── fish_zones_heatmap_YYYY-MM-DD.png
  └── summary_YYYY-MM-DD.txt
```

## 🚀 Quick Start

### Prerequisites

1. **Python 3.8+** with required packages:
   ```bash
   pip install numpy pandas xarray joblib matplotlib copernicusmarine
   ```

2. **Copernicus Marine Service Account**
   - Sign up at: https://marine.copernicus.eu
   - Set credentials in `run_daily_pipeline.sh` or as environment variables

3. **Trained ML Model**
   - Ensure `finding fish location/train/models/rf_fish_zone_model.pkl` exists
   - If not, train the model first using `train_random_forest.py`

### Setup Automation

```bash
cd model
./setup_fish_zone_automation.sh
```

This interactive script will:
1. Validate system requirements
2. Test the pipeline
3. Configure daily automation (cron job)
4. Set up logging

### Manual Execution

Run the complete pipeline anytime:
```bash
cd model
./run_daily_pipeline.sh
```

Or run individual components:
```bash
# Just fetch data
python3 fetch_copernicus_daily.py

# Just predict (requires data)
python3 predict_daily_fish_zones.py
```

## 📁 Directory Structure

```
model/
├── run_daily_pipeline.sh              # Main orchestrator
├── predict_daily_fish_zones.py        # Prediction script
├── fetch_copernicus_daily.py          # Data fetcher
├── setup_fish_zone_automation.sh      # Setup wizard
├── daily_pipeline.log                 # Pipeline logs
│
├── sst_data/                          # SST NetCDF files
├── chlorophyll_data/                  # Chlorophyll NetCDF files
├── ocean_currents/                    # Current NetCDF files
│
├── fish_zone_predictions/             # Output directory
│   ├── fish_zones_*.csv               # Tabular data
│   ├── fish_zones_*.geojson           # Geographic data
│   ├── fish_zones_heatmap_*.png       # Visualizations
│   ├── summary_*.txt                  # Statistics
│   └── prediction_log.txt             # Prediction logs
│
└── finding fish location/
    └── train/
        ├── train_random_forest.py     # Model training
        ├── predict_fish_zone.py       # Single-point prediction
        ├── land_mask.py               # Sri Lanka land masking
        └── models/
            └── rf_fish_zone_model.pkl # Trained model
```

## 🎯 Features

### Environmental Data Processing
- **Real-time data**: Fetches latest available data from Copernicus
- **Automatic retry**: Falls back to recent dates if today's data unavailable
- **Spatial filtering**: Focuses on Sri Lankan waters (5-10°N, 79-82°E)
- **Data validation**: Checks for missing/invalid values

### Machine Learning Predictions
- **Grid-based**: Predicts fish zones across a 0.1° resolution grid (~11 km)
- **Multi-factor**: Uses SST, chlorophyll, currents, and location
- **Land masking**: Excludes land areas from predictions
- **Probability output**: Provides confidence scores (0-1)

### Outputs

#### 1. CSV File (`fish_zones_YYYY-MM-DD.csv`)
```csv
lat,lon,sst,chlor_a,water_u,water_v,fish_zone,fish_probability
5.0,79.0,28.5,0.15,0.12,-0.08,1,0.85
5.0,79.1,28.3,0.18,0.10,-0.05,1,0.78
...
```

#### 2. GeoJSON File (`fish_zones_YYYY-MM-DD.geojson`)
- Compatible with web mapping tools (Leaflet, Mapbox, Google Maps)
- Contains point geometries with properties
- Ready for integration with web/mobile apps

#### 3. Heatmap Image (`fish_zones_heatmap_YYYY-MM-DD.png`)
- Visual representation of fish zone probabilities
- Color-coded: yellow (low) to red (high)
- Includes grid, labels, and colorbar

#### 4. Summary Report (`summary_YYYY-MM-DD.txt`)
- Statistics on predictions
- Environmental data ranges
- High-probability zone counts

## 🔄 Automation

### Cron Job Configuration

The system uses cron for daily automation. Recommended schedule:

```bash
# Daily at 6:00 AM
0 6 * * * /path/to/model/run_daily_pipeline.sh >> /path/to/model/daily_pipeline.log 2>&1
```

### View Active Cron Jobs
```bash
crontab -l
```

### Monitor Execution
```bash
# Watch live logs
tail -f model/daily_pipeline.log

# View prediction logs
tail -f model/fish_zone_predictions/prediction_log.txt
```

### Disable Automation
```bash
crontab -e
# Delete or comment out the line with run_daily_pipeline.sh
```

## 📈 Output Examples

### Summary Statistics
```
Fish Zone Prediction Summary
==================================================
Date: 2026-03-10 06:15:30

Total prediction points: 1,247
Predicted fish zones: 423 (33.9%)
High probability zones (>70%): 156 (12.5%)

Average fish probability: 0.387
Maximum fish probability: 0.952

Environmental Data Ranges:
- SST: 27.2°C to 29.8°C
- Chlorophyll: 0.08 to 0.45 mg/m³
- Ocean Current U: -0.25 to 0.18 m/s
- Ocean Current V: -0.31 to 0.22 m/s
==================================================
```

## 🛠️ Troubleshooting

### Common Issues

#### Pipeline Fails with "No data files found"
**Solution**: Run data fetch first
```bash
python3 fetch_copernicus_daily.py
```

#### "Model not found" error
**Solution**: Train the model
```bash
cd "finding fish location/train"
python3 train_random_forest.py
```

#### Copernicus authentication fails
**Solution**: Check credentials in `run_daily_pipeline.sh`
```bash
export COPERNICUS_USER='your_email@example.com'
export COPERNICUS_PASS='your_password'
```

#### Cron job not running
**Solution**: Check cron logs
```bash
# macOS
log show --predicate 'process == "cron"' --last 1d

# Linux
grep CRON /var/log/syslog
```

## 🔐 Security Notes

- **Credentials**: Store Copernicus credentials securely
- **Environment variables**: Preferred over hardcoding
- **Log files**: Don't commit logs with sensitive data to git
- **Output files**: Clean up old predictions periodically

## 📊 Integration Options

### Backend API
The CSV/GeoJSON outputs can be served via REST API:
```javascript
// Example Express.js endpoint
app.get('/api/fish-zones/latest', (req, res) => {
  const latestFile = getLatestPredictionFile();
  res.json(require(latestFile));
});
```

### Mobile App
Load GeoJSON in React Native:
```javascript
import fishZones from './fish_zones_2026-03-10.geojson';
// Render on map with react-native-maps
```

### Web Dashboard
Display heatmap in React:
```jsx
<img 
  src={`/predictions/fish_zones_heatmap_${today}.png`}
  alt="Fish Zone Heatmap"
/>
```

## 📝 Maintenance

### Regular Tasks

1. **Monitor storage**: NetCDF files can be large
   ```bash
   du -sh sst_data/ chlorophyll_data/ ocean_currents/
   ```

2. **Archive old predictions**:
   ```bash
   tar -czf predictions_2026-03.tar.gz fish_zone_predictions/*.csv
   ```

3. **Update model**: Retrain periodically with new data
   ```bash
   cd "finding fish location/train"
   python3 train_random_forest.py
   ```

4. **Check logs**: Review for errors/warnings
   ```bash
   grep ERROR daily_pipeline.log
   ```

## 🎓 Model Information

### Input Features
- **Latitude** (5-10°N)
- **Longitude** (79-82°E)
- **SST** (Sea Surface Temperature in °C)
- **Chlorophyll** (mg/m³)
- **Water_U** (Eastward current component in m/s)
- **Water_V** (Northward current component in m/s)

### Algorithm
- **Random Forest Classifier**
- Trained on historical catch data + environmental conditions
- Binary classification: Fish zone (1) or No fish (0)
- Plus probability scores for confidence

### Performance
Check model metrics in:
```bash
cat "finding fish location/train/models/model_evaluation.txt"
```

## 🌟 Future Enhancements

- [ ] Real-time API endpoints
- [ ] Email/SMS alerts for high-probability zones
- [ ] Historical trend analysis
- [ ] Integration with weather forecasts
- [ ] Mobile push notifications
- [ ] Multi-species predictions
- [ ] Seasonal pattern analysis

## 📞 Support

For issues or questions:
1. Check logs: `daily_pipeline.log` and `prediction_log.txt`
2. Verify data files exist and are recent
3. Ensure model is trained
4. Check Copernicus service status

## 📄 License

Part of the Final Year Research Project - Marine Fisheries Prediction System

---

**Last Updated**: March 2026  
**Author**: Ravindu Jayaweera
