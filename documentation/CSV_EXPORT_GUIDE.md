# Automated CSV Export & Training Data Pipeline

## Overview

The system now automatically exports approved training candidates from the backend and makes them available to the boat-type notebooks for training.

## How It Works

### 1. Backend CSV Export (NestJS)

When approved training candidates exist in the database, the backend API provides two endpoints:

```bash
# Get all approved training data
GET /training-candidates/export/csv

# Get training data for a specific boat type
GET /training-candidates/export/csv/:boatType
```

**Response**: CSV file with columns:

- `boat_type`: Boat type (e.g., "Fiber Boat (small)")
- `source_trip_id`: Trip ID from the original database
- `boat_id`: Boat identifier
- `feature_*`: Expanded feature columns (distanceKm, engineHP, etc.)
- `label_*`: Expanded label columns (fuelUsedLiters, cost, etc.)

### 2. Fetch Script (Python)

Run the fetch script to download CSVs and save them locally:

```bash
# Windows
cd model\cost_prediction
python fetch_training_data.py

# Linux/Mac
cd model/cost_prediction
python fetch_training_data.py
```

**Requirements**:

- Set environment variables:
  ```bash
  export BACKEND_URL=http://localhost:3000
  export BACKEND_AUTH_TOKEN=your_jwt_token_here
  ```

**Output**: Creates `training_data/` folder with:

- `training_data_all.csv` - All approved candidates
- `training_data_fiber_boat_small.csv` - Fiber Boat (small) data
- `training_data_fiber_boat_medium.csv` - Fiber Boat (medium) data
- `training_data_one_day_boat.csv` - One Day Boat data
- `training_data_multi_day_boat.csv` - Multi Day Boat data
- `training_data_longliner.csv` - Longliner data
- `metadata_*.json` - Export metadata

### 3. Notebook Training

The boat-type notebooks look for CSVs in this priority order:

1. **Exported CSV** (from backend) - Highest priority
   - `training_data/training_data_fiber_boat_small.csv`
2. **All data CSV** (from backend with filtering)
   - `training_data/training_data_all.csv`
3. **Legacy CSVs** - Fallback options
   - `data/training_candidates_export.csv`
   - etc.

### 4. Complete Workflow

```
┌─────────────────────┐
│   Admin approves    │
│  training candidates│
│   (Mobile app)     │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────┐
│   Backend stores approved    │
│   data in MongoDB            │
│  (status = 'APPROVED')      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│   Run fetch_training_data.py │
│   (Automatic or manual)      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│   CSVs saved to              │
│   training_data/ folder      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│   Run boat-type notebooks    │
│   (Colab or VS Code)        │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│   Models trained & saved     │
│   to models/fishtripcost/    │
└──────────────────────────────┘
```

## CSV Format

The exported CSV includes both features and labels flattened:

```csv
boat_type,source_trip_id,boat_id,feature_distanceKm,feature_engineHP,feature_fishingHours,feature_speed,feature_weatherSeverityIndex,label_fuelUsedLiters,label_estimatedCostLKR
Fiber Boat (small),trip_123,boat_456,25.5,35,8,12,0.3,12.5,450.00
Fiber Boat (small),trip_124,boat_456,30.0,35,10,11,0.4,15.2,550.00
```

## API Integration

The backend service automatically:

1. ✅ Filters by approval status
2. ✅ Includes boatType in export
3. ✅ Flattens nested feature/label objects
4. ✅ Provides per-boat-type exports
5. ✅ Returns proper CSV headers

## For Automation (Cron/Scheduled)

To automatically refresh data daily:

1. **Windows Task Scheduler**:

   ```batch
   # Create scheduled task
   schtasks /create /tn "FishAI_Fetch_Training_Data" /tr "python C:\path\to\fetch_training_data.py" /sc daily /st 02:00
   ```

2. **Linux Cron** (add to crontab):
   ```bash
   0 2 * * * cd /path/to/model/cost_prediction && python fetch_training_data.py >> fetch.log 2>&1
   ```

## Environment Setup

1. **Backend running** on localhost:3000
2. **JWT token** available (get from admin login)
3. **Python environment** with pandas & requests:
   ```bash
   pip install pandas requests
   ```

## Troubleshooting

**No CSV files appear**:

- Check backend is running
- Verify JWT_TOKEN is valid
- Ensure data exists: `/training-candidates/pending` returns results

**Notebook can't find CSV**:

- Run `fetch_training_data.py` first
- Check `training_data/` folder exists with CSVs
- Verify CSV has boatType column

**Wrong boat type in CSV**:

- Check `BOAT_TYPES` mapping in fetch script
- Ensure boatType values in database match notebook's `BOAT_TYPE_TARGET`
