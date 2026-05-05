# 🎯 WORKFLOW: Generate & Import More Training Data

This guide shows you how to continuously improve your ML models with more realistic fishing trip data.

---

## 📋 QUICK WORKFLOW (3 Steps)

### ✅ Step 1: Generate Data with AI

**Copy and paste this prompt into ChatGPT/Claude:**

```
You are a marine fisheries data simulation assistant for Sri Lankan fishing operations.

Generate 60 realistic fishing trip records in JSON format.

REQUIREMENTS:
- Boat types: Multi-day Boat, One-day Boat, Fiber Boat, Trawler, Longliner
- Distance: 12-150 km (varies by boat type)
- Weather: 60% calm, 30% moderate, 10% rough
- Sri Lankan diesel prices: 270-310 LKR/liter
- Fish prices: 350-650 LKR/kg

EXACT JSON FORMAT (array of 60 records):
[
  {
    "boatSpec": {
      "boatName": "Ocean Pride",
      "boatType": "Multi-day Boat",
      "engineHorsePower": 140,
      "boatLength": 15.2,
      "boatWidth": 4.0,
      "boatValue": 5200000,
      "fuelEfficiencyFactor": 0.92,
      "engineDegradationFactor": 1.18,
      "averageFuelPredictionError": 0.11,
      "fuelTankCapacityLiters": 950,
      "maxCrewCapacity": 8
    },
    "tripParameters": {
      "boatId": "boat_placeholder",
      "distanceKm": 95.5,
      "averageSpeedKmh": 10.2,
      "fishingHours": 20.5,
      "crewSize": 7,
      "fuelPricePerLiter": 295,
      "expectedFishPricePerKg": 540,
      "expectedCatchKg": 350,
      "predictedCatchKg": 365
    },
    "weather": {
      "windSpeedKmh": 18.5,
      "waveHeightMeters": 1.4,
      "rainLevel": 0.35
    },
    "externalCosts": {
      "iceCost": 9500,
      "baitCost": 4500,
      "crewFoodCost": 4000,
      "portFee": 1700,
      "gearMaintenanceCost": 2600,
      "miscellaneousCost": 1400
    }
  }
  // ... 59 more records
]

Generate diverse, realistic data for Sri Lankan fishing operations.
```

### ✅ Step 2: Save the JSON

1. Copy the JSON array from AI response
2. Create file: `Backend/src/trips/utils/new-batch-trips.json`
3. Paste the JSON into it
4. Save file

### ✅ Step 3: Import the Data

```powershell
# Make sure you're in Backend directory
cd Backend

# Your auth token is already set from before:
# $env:AUTH_TOKEN (already set)
# $env:BOAT_ID (already set)

# Import the new batch
npx ts-node src/trips/utils/import-from-json.ts --file=new-batch-trips.json --with-actuals

# This will:
# ✅ Validate all 60 trips
# ✅ Import them one by one
# ✅ Log actual data for ML training
# ✅ Show progress and summary

# Then run batch training (it will show you the command)
```

---

## 🎨 SPECIALIZED DATA GENERATION PROMPTS

### 🌊 Focus on Coastal Fishing (One-day & Fiber Boats)

```
Generate 40 coastal fishing trips for Sri Lankan inshore operations:

BOAT DISTRIBUTION:
- 20 One-day boats (6-10 hour trips)
- 20 Fiber boats (4-7 hour trips)

TRIP CHARACTERISTICS:
- Distance: 15-50 km from shore
- Speed: 9-13 km/h
- Fishing hours: 4-10 hours
- Crew: 2-5 people
- Expected catch: 30-150 kg (coastal species: Sardines, Mackerel, Anchovies)

WEATHER (mostly calm):
- 70% calm: wind 5-12 km/h, waves 0.2-0.7m, rain 0-0.15
- 25% moderate: wind 12-18 km/h, waves 0.7-1.2m, rain 0.15-0.35
- 5% rough: wind 18-25 km/h, waves 1.2-1.8m, rain 0.35-0.6

COSTS:
- Ice: 1,500-5,000 LKR
- Bait: 800-2,500 LKR
- Food: 500-2,000 LKR
- Port: 400-900 LKR

Use creative Sri Lankan boat names. Return valid JSON array with 40 records.
```

### 🛳️ Focus on Offshore Fishing (Multi-day & Trawlers)

```
Generate 40 offshore fishing trips for Sri Lankan deep-sea operations:

BOAT DISTRIBUTION:
- 20 Multi-day boats (18-28 hour trips)
- 20 Trawlers (22-32 hour trips)

TRIP CHARACTERISTICS:
- Distance: 85-150 km offshore
- Speed: 8-11 km/h
- Fishing hours: 18-32 hours
- Crew: 6-10 people
- Expected catch: 250-550 kg (deep sea species: Tuna, Skipjack, Yellowfin)

WEATHER (mixed conditions):
- 40% calm: wind 8-15 km/h, waves 0.5-1.0m, rain 0-0.25
- 40% moderate: wind 15-22 km/h, waves 1.0-1.8m, rain 0.25-0.5
- 20% rough: wind 22-30 km/h, waves 1.8-2.5m, rain 0.5-0.9

COSTS:
- Ice: 9,000-14,000 LKR
- Bait: 4,500-7,000 LKR
- Food: 4,000-6,500 LKR
- Port: 1,500-2,500 LKR

Use creative names for professional fishing vessels. Return valid JSON array with 40 records.
```

### ⛈️ Focus on Weather Variations

```
Generate 30 fishing trips with diverse weather conditions for ML weather adaptation:

WEATHER SCENARIOS (evenly distributed):
1. CALM (10 trips):
   - Wind: 5-10 km/h, Waves: 0.2-0.6m, Rain: 0-0.1
   - Normal catch expectations
   - All boat types

2. MODERATE (10 trips):
   - Wind: 14-20 km/h, Waves: 0.9-1.5m, Rain: 0.3-0.5
   - Catch reduced by 10-15%
   - Avoid Fiber boats

3. ROUGH (10 trips):
   - Wind: 22-30 km/h, Waves: 1.6-2.5m, Rain: 0.6-1.0
   - Catch reduced by 20-30%
   - Only Multi-day boats and Trawlers
   - Shorter fishing hours

Mix all boat types appropriately for conditions. Return valid JSON array with 30 records.
```

### 🛠️ Focus on Fuel Efficiency Testing

```
Generate 30 fishing trips to test fuel efficiency variations:

EFFICIENCY GROUPS (10 trips each):
1. HIGH EFFICIENCY (new engines):
   - fuelEfficiencyFactor: 1.10-1.25
   - engineDegradationFactor: 0.90-1.00
   - Modern boats, well-maintained

2. MODERATE EFFICIENCY (average):
   - fuelEfficiencyFactor: 0.95-1.10
   - engineDegradationFactor: 1.00-1.15
   - Standard fleet boats

3. LOW EFFICIENCY (old engines):
   - fuelEfficiencyFactor: 0.75-0.90
   - engineDegradationFactor: 1.20-1.35
   - Older boats, higher maintenance needs

Keep other parameters realistic. Mix boat types. Return valid JSON array with 30 records.
```

### 🎣 Focus on Catch Optimization

```
Generate 30 fishing trips with varied catch outcomes:

CATCH SCENARIOS (10 trips each):
1. EXCELLENT CATCH (120-150% of expected):
   - Calm weather
   - Experienced boats (low prediction error: 0.03-0.07)
   - Optimal fishing hours
   - predictedCatchKg = expectedCatchKg * 1.2 to 1.5

2. NORMAL CATCH (85-115% of expected):
   - Moderate weather
   - Average boats (prediction error: 0.07-0.12)
   - Standard fishing hours
   - predictedCatchKg = expectedCatchKg * 0.85 to 1.15

3. POOR CATCH (50-85% of expected):
   - Rough weather
   - Less experienced boats (prediction error: 0.12-0.18)
   - Interrupted fishing
   - predictedCatchKg = expectedCatchKg * 0.5 to 0.85

Return valid JSON array with 30 records showing catch variations.
```

---

## 🔧 ADVANCED: Custom Scenarios

### Monsoon Season Data

```
Generate 25 trips during Southwest Monsoon (May-Sept):
- Higher wind/waves (15-30 km/h, 1.0-2.5m)
- More rain (0.4-1.0)
- Shorter trips
- Reduced catch
- Mainly Multi-day and Trawler boats
```

### Night Fishing Operations

```
Generate 20 night fishing trips:
- One-day and Fiber boats only
- Distance: 20-45 km
- Fishing hours: 8-14 hours (overnight)
- Lower crew size (2-4)
- Focus on squid, prawns
- Lower catch volume but higher price/kg (450-700 LKR)
```

### Experimental High-Efficiency Boats

```
Generate 15 trips with modern, efficient boats:
- fuelEfficiencyFactor: 1.15-1.30
- engineDegradationFactor: 0.85-0.95
- New engines (<2 years)
- Advanced navigation
- Higher initial cost but better performance
```

---

## 📊 TRACKING YOUR IMPROVEMENTS

After each import batch, check progress:

```powershell
# View boat learning progress
$headers = @{'Authorization' = "Bearer $env:AUTH_TOKEN"}
$boat = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/boats/$env:BOAT_ID" -Headers $headers

Write-Host "Total Training Trips: $(38 + (number you just imported))"
Write-Host "Fuel Efficiency Factor: $($boat.fuelEfficiencyFactor)"
Write-Host "Speed Optimization: $($boat.speedOptimizationFactor)"
Write-Host "Prediction Accuracy: Improving with each batch!"
```

---

## 🎯 RECOMMENDED IMPORT SCHEDULE

### Week 1: Diverse Boat Types (✅ DONE - 38 trips)

- ✅ You already imported mixed boat types

### Week 2: Coastal Focus (60 trips)

- Use coastal fishing prompt above
- Train on inshore operations

### Week 3: Offshore Focus (60 trips)

- Use offshore fishing prompt above
- Train on deep-sea operations

### Week 4: Weather Variations (30 trips)

- Use weather scenarios prompt
- Improve weather adaptation

### Week 5: Edge Cases (30 trips)

- Poor catches, rough weather
- Equipment failures, fuel issues
- Train model on exceptions

---

## ✅ VALIDATION BEFORE IMPORT

The script automatically validates, but you can check manually:

1. **File Format**: Must be valid JSON array
2. **Required Fields**: All trips have boatSpec, tripParameters, weather, externalCosts
3. **Realistic Values**:
   - crewSize <= maxCrewCapacity
   - fuelTankCapacity >= (distanceKm / averageSpeedKmh) \* 15 liters/hour
   - fishingHours < 36 hours
4. **No Duplicates**: Unique boat names
5. **Consistent Units**: LKR for costs, km for distance, kg for weight

---

## 🚀 READY TO IMPROVE YOUR MODEL?

**Just do this now:**

1. Copy one of the prompts above (choose your focus)
2. Paste into ChatGPT/Claude
3. Get the JSON response
4. Save as `new-batch-trips.json`
5. Tell me: **"I have new data ready"**
6. I'll help you import and train!

**Your model will get smarter with each batch! 📈**
