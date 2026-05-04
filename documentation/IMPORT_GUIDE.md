# Bulk Trip Import Tool

## Overview

This tool helps you import 41 sample fishing trips into your FishAI system for testing and ML training. The trips include various boat types (Trawlers, Longliners, One-day Boats, Fiber Boats, and Multi-day Boats) with realistic fishing scenarios.

## Quick Start

### 1. Prepare Your Data

Your sample trip data should be in this format:

```json
{
  "boatSpec": {
    "boatName": "Deep Sea Hunter",
    "engineHorsePower": 180,
    ...
  },
  "tripParameters": {
    "boatId": "boat_004",
    "distanceKm": 120.4,
    ...
  },
  "weather": {...},
  "externalCosts": {...}
}
```

### 2. Get Your Auth Token

```bash
# Login to get token
curl -X POST http://localhost:5000/api/v1/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}'

# Copy the "access_token" from response
```

### 3. Set Environment Variables

```bash
# Windows PowerShell
$env:API_BASE_URL = "http://localhost:5000"
$env:AUTH_TOKEN = "your-token-here"

# Linux/Mac
export API_BASE_URL="http://localhost:5000"
export AUTH_TOKEN="your-token-here"
```

### 4. Run Import

```bash
# Basic import (predictions only)
npm run import-trips

# Import with actual data (for ML training)
npm run import-trips -- --with-actuals

# Custom delay between requests (ms)
npm run import-trips -- --delay=2000
```

## Field Mapping

Your sample data → API format:

| Your Field               | API Field                                  | Transformation                            |
| ------------------------ | ------------------------------------------ | ----------------------------------------- |
| `boatId`                 | `boatId`                                   | Direct                                    |
| `distanceKm`             | `startLat`, `startLon`, `endLat`, `endLon` | **Auto-generated** Sri Lankan coordinates |
| `averageSpeedKmh`        | `speed`                                    | Direct                                    |
| `fishingHours`           | `fishingHours`, `numberOfDays`             | Direct + **Auto-calculated** days         |
| `crewSize`               | `crewCount`                                | Direct                                    |
| `fuelPricePerLiter`      | `fuelPrice`                                | Direct                                    |
| `expectedFishPricePerKg` | `marketPrice`                              | Direct                                    |
| `expectedCatchKg`        | `expectedCatch`                            | Direct                                    |
| `windSpeedKmh`           | `windSpeed`                                | Direct                                    |
| `waveHeightMeters`       | `waveHeight`                               | Direct                                    |

**Auto-generated fields:**

- **Coordinates**: Based on distance, starting from Colombo (6.9271°N, 79.8612°E)
- **Number of Days**: Calculated from fishing hours
  - ≤10 hours = 1 day
  - ≤20 hours = 2 days
  - ≤36 hours = 3 days
  - \>36 hours = fishingHours / 12 (rounded up)
- **Mode**: `international` if distance > 80km, otherwise `island`

## Example Output

```
🚀 Starting bulk import of 31 trips...
API Base URL: http://localhost:5000
With Actuals: true

[1/31] Processing Deep Sea Hunter...
✅ Created trip: 65f3a1b2c4d5e6f7g8h9i0j1 (Deep Sea Hunter)
✅ Logged actuals for trip: 65f3a1b2c4d5e6f7g8h9i0j1

[2/31] Processing Chilaw Queen...
✅ Created trip: 65f3a1b2c4d5e6f7g8h9i0j2 (Chilaw Queen)
✅ Logged actuals for trip: 65f3a1b2c4d5e6f7g8h9i0j2

...

==================================================
📊 IMPORT SUMMARY
==================================================
✅ Success: 31
❌ Failed: 0
📋 Total: 31

🆔 Trip IDs:
  1. 65f3a1b2c4d5e6f7g8h9i0j1
  2. 65f3a1b2c4d5e6f7g8h9i0j2
  ...
```

## Troubleshooting

### Error: "Invalid boat id"

- The `boatId` in your sample data doesn't exist in the database
- **Solution**: First create boats using the boat API, or update `boatId` to match existing boats

### Error: "Unauthorized"

- Your auth token is invalid or expired
- **Solution**: Re-login and get a fresh token

### Error: "Trip has no prediction data"

- Trying to log actuals before saving prediction
- **Solution**: Use `--with-actuals` flag to automatically log after each prediction

### ML Service Connection Error

- The Python ML service isn't running
- **Solution**:
  ```bash
  cd model/cost_prediction
  uvicorn app:app --host 0.0.0.0 --port 5001
  ```

## Missing Data Handling

If your sample data is missing required fields, the tool will:

1. **Generate coordinates** from distance
2. **Calculate number of days** from fishing hours
3. **Estimate mode** (island/international) from distance
4. **Default speed** to 10 km/h if missing

## Using Custom Data

1. Edit `bulk-import-trips.ts`
2. Replace `SAMPLE_TRIPS` array with your data
3. Run the import script

## API Endpoints Used

- `POST /api/v1/cost-engine/predict-and-save` - Create trips
- `POST /api/v1/trips/:id/log-actual` - Log actual data
- `POST /api/v1/trips/batch-train` - Batch ML training

## Next Steps After Import

1. **View trips**: Go to mobile app → Trips tab
2. **Check predictions**: Each trip has predicted fuel & costs
3. **Verify actuals**: If imported with `--with-actuals`, check actual vs predicted
4. **Train models**: Use batch training to improve predictions
5. **View learning**: Check ML coefficients in boat details

## Performance Tips

- **Batch size**: Import 10-20 trips at a time for best performance
- **Delay**: Use `--delay=1500` if server is slow
- **With actuals**: Takes 2x time but provides training data immediately
- **Network**: Ensure stable connection to avoid partial imports

## Advanced Usage

### Import Specific Boats Only

```typescript
const filteredTrips = SAMPLE_TRIPS.filter(
  (t) => t.boatSpec.boatType === 'Trawler',
);
```

### Custom Coordinate Generation

```typescript
// Edit generateFishingCoordinates() in sample-trip-transformer.ts
// to use specific fishing zones
```

### Export Trip IDs for Batch Training

```bash
npm run import-trips --with-actuals > trip-ids.txt
```
