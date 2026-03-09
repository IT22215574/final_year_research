# Trip Utilities - Sample Data Import

## 📦 What's Included

This directory contains utilities to import 41 real fishing trip samples into your system:

### Files

1. **`sample-trip-transformer.ts`**
   - Transforms external trip data format → API format
   - Auto-generates coordinates from Colombo (6.9271°N, 79.8612°E)
   - Auto-calculates days from fishing hours
   - Simulates actual values (±10% variation) for ML training

2. **`bulk-import-trips.ts`**
   - 41 pre-loaded fishing trips ready to import
   - Boat types: Trawlers, Longliners, One-day, Multi-day, Fiber boats
   - CLI arguments: `--with-actuals`, `--delay=ms`
   - Progress tracking and error handling

3. **`IMPORT_GUIDE.md`**
   - Step-by-step setup instructions
   - Field mapping reference
   - Troubleshooting tips

## 🚀 Quick Import (3 Steps)

### Step 1: Get Your Auth Token & Boat ID (Automated)

```bash
# Run the setup script - it will guide you
cd Backend
.\src\trips\utils\setup-import.ps1
```

The script will:

- ✅ Check your AUTH_TOKEN
- ✅ Fetch available boats
- ✅ Show you the boat ID to use
- ✅ Copy the boat ID to clipboard
- ✅ Display exact configuration code

**Manual alternative:**

```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"password"}'

# Set token
$env:AUTH_TOKEN="paste-token-here"

# Get boat ID
curl http://localhost:5000/api/v1/boat \
  -H "Authorization: Bearer $env:AUTH_TOKEN"
```

### Step 2: Configure Boat ID

Open [bulk-import-trips.ts](bulk-import-trips.ts) and update line ~25:

```typescript
const USE_SINGLE_BOAT = true;
const SINGLE_BOAT_ID = 'paste-your-boat-id-here'; // ← Update this
```

### Step 3: Run Import

```bash
# Import with ML training (recommended)
npx ts-node src/trips/utils/bulk-import-trips.ts --with-actuals

# Or just test predictions (without logging actuals)
npx ts-node src/trips/utils/bulk-import-trips.ts
```

## 📊 Sample Data Breakdown

### Boat Type Distribution

- **Trawlers**: 4 boats (large offshore vessels)
- **Longliners**: 4 boats (medium range)
- **Multi-day Boats**: 6 boats (2-3 day trips)
- **One-day Boats**: 9 boats (coastal fishing)
- **Fiber Boats**: 8 boats (small nearshore)

### Trip Characteristics

- Distance: 14.8 km - 128.5 km
- Fishing Hours: 4.8h - 25.0h
- Crew Size: 2 - 9 people
- Expected Catch: 30 kg - 430 kg
- Weather Conditions: Calm (0.3m waves) to Rough (2.1m waves)

## 🔧 Common Fixes

### Issue: "SINGLE_BOAT_ID not configured"

**Solution**: The script validates configuration before running. Update the boat ID:

```typescript
// In bulk-import-trips.ts (line ~25)
const SINGLE_BOAT_ID = 'your-actual-boat-id';
```

Run setup script to get your boat ID automatically: `.\src\trips\utils\setup-import.ps1`

### Issue: "AUTH_TOKEN not set"

**Solution**: Set environment variable with your login token:

```bash
# PowerShell
$env:AUTH_TOKEN="your-jwt-token"

# Check if set
echo $env:AUTH_TOKEN
```

### Issue: "Server overwhelmed"

**Solution**: Use the `--delay` flag to slow down imports.

```bash
npx ts-node src/trips/utils/bulk-import-trips.ts --with-actuals --delay=3000
```

## 📈 After Import

### View Trips

- Mobile App → Trips tab
- Check predictions and actual data

### Verify ML Training

```bash
# Run batch training
curl -X POST http://localhost:5000/api/v1/trips/batch-train \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should see positive prediction errors (actual > predicted) or small negative errors (not -262.06!).

### Check Boat Coefficients

```bash
# View updated coefficients
curl http://localhost:5000/api/v1/boat/YOUR_BOAT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Look for updated `fuelEfficiencyFactor`, `engineDegradationFactor` fields.

## 🎯 Use Cases

1. **Test Predictions**: Import without `--with-actuals` to test prediction accuracy
2. **ML Training**: Import with `--with-actuals` to train boat coefficients
3. **Load Testing**: Import with `--delay=100` to test system under load
4. **Demo Data**: Showcase app features with realistic trip data

## 🛠️ Advanced Usage

### Import Specific Boat Types Only

Edit `bulk-import-trips.ts`:

```typescript
const SAMPLE_TRIPS = [
  // Comment out or remove trips you don't want
  /* {
    "boatSpec": { "boatType": "Trawler", ... }
  }, */
];
```

### Custom Actual Values

Edit `sample-trip-transformer.ts` → `extractActualData()` function:

```typescript
// Change variation from ±10% to ±5%
const fuelVariation = (predictedTrip.predictedFuelLiters || 0) * 0.05;
```

### Modify Trip Parameters

Edit `bulk-import-trips.ts` directly:

```typescript
{
  "tripParameters": {
    "distanceKm": 150.0,  // Increase distance
    "crewSize": 12,       // More crew
    // ...
  }
}
```

## 📝 Notes

- The `boatId` field is critical - it must match an existing boat in your database
- Coordinates are auto-generated westward from Colombo
- `numberOfDays` is calculated: ≤10h=1, ≤20h=2, ≤36h=3, else hours/12
- Trip mode is auto-detected: >80km = international, else island
- Actual data uses ±10% variation from predicted values for realistic training

## 🎉 Success Indicator

After successful import with `--with-actuals`, you should see:

```
📊 Import Summary:
   Total: 41
   Success: 41
   Failed: 0

✅ Imported Trip IDs:
[
  "67891234abcd...",
  "67891235abcd...",
  ...
]
```

Now your system has 41 trips with logged actuals for ML training! 🚢🐟
