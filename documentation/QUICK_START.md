# 🚀 Quick Start - Import 41 Sample Trips

Follow these steps to import all 41 sample fishing trips with one command.

## Prerequisites

- ✅ Backend running at http://localhost:5000
- ✅ ML service running at http://localhost:5001
- ✅ At least one boat in your database

---

## Step 1: Get Your Auth Token

**Login to your account:**

```powershell
curl -X POST http://localhost:5000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

**Copy the token from the response** and set it:

```powershell
$env:AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Step 2: Get Your Boat ID (Auto Setup)

**Run the setup script:**

```powershell
cd Backend
.\src\trips\utils\setup-import.ps1
```

This will:

- ✅ Verify your AUTH_TOKEN
- ✅ Fetch your boats from the database
- ✅ Show you the boat ID to use
- ✅ Copy it to clipboard
- ✅ Display the exact code to update

**Or manually get boat ID:**

```powershell
curl http://localhost:5000/api/v1/boat `
  -H "Authorization: Bearer $env:AUTH_TOKEN"
```

---

## Step 3: Update Configuration

**Open:** `Backend/src/trips/utils/bulk-import-trips.ts`

**Find line ~25** and update:

```typescript
const USE_SINGLE_BOAT = true;
const SINGLE_BOAT_ID = 'YOUR_BOAT_ID_HERE'; // ← Paste your boat ID here
```

**Example:**

```typescript
const USE_SINGLE_BOAT = true;
const SINGLE_BOAT_ID = '65f8a9b2c1d4e5f6a7b8c9d0'; // ← Like this
```

---

## Step 4: Run Import

**With actual data logging (for ML training - RECOMMENDED):**

```powershell
npx ts-node src\trips\utils\bulk-import-trips.ts --with-actuals
```

**Or without actuals (just test predictions):**

```powershell
npx ts-node src\trips\utils\bulk-import-trips.ts
```

**With rate limiting (if server struggles):**

```powershell
npx ts-node src\trips\utils\bulk-import-trips.ts --with-actuals --delay=2000
```

---

## Expected Output

```
🔍 Validating configuration...

✅ Mode: Single Boat (ID: 65f8a9b2c1d4e5f6a7b8c9d0)

🚀 Starting bulk import of 41 trips...
API Base URL: http://localhost:5000
With Actuals: true
Delay: 1000ms

[1/41] Processing Deep Sea Hunter...
✅ Created trip: 67891234abcd1234567890ab (Deep Sea Hunter)
📊 Logged actual data for trip 67891234abcd1234567890ab

[2/41] Processing Chilaw Queen...
✅ Created trip: 67891235abcd1234567890ac (Chilaw Queen)
📊 Logged actual data for trip 67891235abcd1234567890ac

...

============================================================
📊 IMPORT SUMMARY
============================================================
✅ Success: 41
❌ Failed: 0
📋 Total: 41

🆔 Trip IDs:
  1. 67891234abcd1234567890ab
  2. 67891235abcd1234567890ac
  ...
```

---

## Verify Import

**Check trips in database:**

```powershell
curl http://localhost:5000/api/v1/trips `
  -H "Authorization: Bearer $env:AUTH_TOKEN"
```

**Or open your mobile app:**

- Go to **Trips** tab
- You should see 41 new trips
- Each with predictions and actual data (if you used --with-actuals)

---

## Train ML Models

**After importing with --with-actuals, train the models:**

```powershell
curl -X POST http://localhost:5000/api/v1/trips/batch-train `
  -H "Authorization: Bearer $env:AUTH_TOKEN"
```

**Expected:** Positive or small negative prediction errors (not -262.06!)

---

## Troubleshooting

### ❌ "SINGLE_BOAT_ID not configured"

- You forgot to update the SINGLE_BOAT_ID in bulk-import-trips.ts
- Run setup-import.ps1 to get your boat ID

### ❌ "AUTH_TOKEN not set"

- Token not in environment variable
- Run: `$env:AUTH_TOKEN="your-token"`

### ❌ "Boat not found"

- The boat ID doesn't exist in your database
- Create a boat first or use correct boat ID

### ❌ "Failed: 41"

- Backend not running: Start with `pnpm run start:dev`
- Wrong API URL: Check http://localhost:5000 is accessible
- Expired token: Login again and get fresh token

---

## What's Imported?

### 41 Realistic Fishing Trips

- **4 Trawlers** - Large offshore vessels (120-128 km trips)
- **4 Longliners** - Medium range (62-72 km trips)
- **6 Multi-day Boats** - 2-3 day trips (88-105 km)
- **9 One-day Boats** - Coastal fishing (22-31 km)
- **8 Fiber Boats** - Small nearshore (14-22 km)

### Data Included

- ✅ Trip predictions (fuel, costs)
- ✅ Weather conditions (wind, waves, rain)
- ✅ Crew and equipment costs
- ✅ Expected catch vs predicted catch
- ✅ Actual data (±10% variation for training)

### Why This Helps

- 🎯 Test prediction accuracy across boat types
- 🧠 Train ML models with realistic data
- 📊 Demo the app with diverse scenarios
- 🐛 Debug issues with real-world patterns

---

## Next Steps

After successful import:

1. **View in Mobile App** - See all trips with predictions
2. **Run Batch Training** - Update boat coefficients
3. **Test Predictions** - Create new trip and compare
4. **Check Improvements** - Verify smaller prediction errors

---

## Need Help?

- **Setup issues:** Run `.\src\trips\utils\setup-import.ps1`
- **Documentation:** See `Backend/src/trips/utils/README.md`
- **Field mapping:** See `Backend/src/trips/utils/IMPORT_GUIDE.md`

---

**🎉 That's it! You're ready to import 41 sample trips!**
