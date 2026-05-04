# AI Prompt for Generating Fishing Trip Data

Use this prompt with ChatGPT, Claude, or any AI assistant to generate realistic fishing trip data for training your ML models.

---

## 🎯 PROMPT TO USE

```
You are a marine fisheries data simulation assistant for Sri Lankan coastal and offshore fishing operations.

Generate 60 realistic fishing boat specifications and trip records suitable for fuel consumption and trip cost prediction.

CONTEXT:
- Location: Sri Lankan waters (Southern, Western, Eastern, Northern coasts)
- Boat types: Multi-day Boat, One-day Boat, Fiber Boat, Trawler, Longliner
- Season: Mix of monsoon and calm weather conditions
- Fish species: Tuna, Skipjack, Yellowfin, Sardines, Mackerel, Anchovies, etc.

BOAT SPECIFICATIONS (realistic Sri Lankan vessels):
- boatName: Creative Sri Lankan fishing boat names
- boatType: Multi-day Boat, One-day Boat, Fiber Boat, Trawler, Longliner
- engineHorsePower: 25-200 HP (smaller for fiber boats, larger for trawlers)
- boatLength: 6.5-20 meters
- boatWidth: 2.0-4.5 meters
- boatValue: 700,000 - 7,000,000 LKR
- fuelEfficiencyFactor: 0.80 - 1.25 (higher = more efficient)
- engineDegradationFactor: 0.90 - 1.35 (higher = more degraded/older engine)
- averageFuelPredictionError: 0.03 - 0.15
- fuelTankCapacityLiters: 100-1300 liters
- maxCrewCapacity: 2-12 people

TRIP PARAMETERS (realistic fishing operations):
- boatId: "boat_XXX" (placeholder, will be replaced)
- distanceKm: 12-150 km offshore
- averageSpeedKmh: 8-14 km/h
- fishingHours: 4-30 hours (one-day: 4-10h, multi-day: 18-30h)
- crewSize: 2-10 people (must be <= maxCrewCapacity)
- fuelPricePerLiter: 270-310 LKR (current diesel prices in Sri Lanka)
- expectedFishPricePerKg: 350-650 LKR
- expectedCatchKg: 25-500 kg (varies by boat type and trip duration)
- predictedCatchKg: expectedCatchKg ± 5-15% variation

WEATHER CONDITIONS:
- windSpeedKmh: 5-30 km/h (calm to rough conditions)
- waveHeightMeters: 0.2-2.5 m (coastal to offshore)
- rainLevel: 0.0-1.0 (0=clear, 0.3=light rain, 0.7=heavy rain, 1.0=storm)

EXTERNAL COSTS (in LKR):
- iceCost: 1,200-14,000 (depends on trip duration and catch size)
- baitCost: 800-6,500
- crewFoodCost: 500-6,000
- portFee: 400-2,500
- gearMaintenanceCost: 500-4,000
- miscellaneousCost: 250-2,000

REALISM REQUIREMENTS:
1. Larger boats = longer trips, more crew, higher costs
2. Rough weather (high wind/waves) = reduce expected catch by 10-20%
3. Multi-day boats: 80+ km distance, 18-30 hours
4. One-day boats: 20-60 km distance, 5-10 hours
5. Fiber boats: 10-35 km distance, 4-8 hours
6. Trawlers: 100-150 km distance, 20-30 hours
7. Weather patterns: 60% calm (wind <15, waves <1.0), 30% moderate, 10% rough
8. Fuel tank capacity should support the trip distance + safety margin

OUTPUT FORMAT:
Return ONLY a valid JSON array with 60 records. Each record must have this exact structure:

{
  "boatSpec": {
    "boatName": "...",
    "boatType": "...",
    "engineHorsePower": 0,
    "boatLength": 0,
    "boatWidth": 0,
    "boatValue": 0,
    "fuelEfficiencyFactor": 0,
    "engineDegradationFactor": 0,
    "averageFuelPredictionError": 0,
    "fuelTankCapacityLiters": 0,
    "maxCrewCapacity": 0
  },
  "tripParameters": {
    "boatId": "boat_placeholder",
    "distanceKm": 0,
    "averageSpeedKmh": 0,
    "fishingHours": 0,
    "crewSize": 0,
    "fuelPricePerLiter": 0,
    "expectedFishPricePerKg": 0,
    "expectedCatchKg": 0,
    "predictedCatchKg": 0
  },
  "weather": {
    "windSpeedKmh": 0,
    "waveHeightMeters": 0,
    "rainLevel": 0
  },
  "externalCosts": {
    "iceCost": 0,
    "baitCost": 0,
    "crewFoodCost": 0,
    "portFee": 0,
    "gearMaintenanceCost": 0,
    "miscellaneousCost": 0
  }
}

Generate diverse boat types (distribute across: 30% One-day, 25% Multi-day, 20% Fiber, 15% Trawler, 10% Longliner).
Use creative Sri Lankan fishing boat names (examples: "Ocean Pride", "Salty Waves", "Fisherman's Hope", "Sea Dragon", etc.).
Ensure all numerical values are realistic and consistent with boat type and trip parameters.
```

---

## 📋 HOW TO USE THIS PROMPT

### Step 1: Generate Data

1. Copy the prompt above
2. Paste it into ChatGPT, Claude, or your preferred AI
3. Wait for the JSON response (60 trip records)
4. Copy the entire JSON array

### Step 2: Save the Data

Create a new file: `Backend/src/trips/utils/new-batch-trips.json`

Paste the JSON array into it.

### Step 3: Import the Data

I'll create a script that automatically imports from the JSON file.

---

## 🎯 WHAT TO ASK THE AI FOR

### For Better Coastal Boats (One-day & Fiber):

```
Focus on 40 coastal fishing trips:
- 20 One-day boats (20-50 km, 6-10 hours)
- 20 Fiber boats (12-30 km, 4-7 hours)
- Calm to moderate weather (60% calm, 30% moderate, 10% rough)
- Sri Lankan coastal fish species (Sardines, Mackerel, Anchovies)
- Expected catch: 30-120 kg
```

### For Better Offshore Boats (Multi-day & Trawlers):

```
Focus on 40 offshore fishing trips:
- 20 Multi-day boats (80-120 km, 18-28 hours)
- 20 Trawlers (100-150 km, 22-30 hours)
- Mixed weather (40% calm, 40% moderate, 20% rough)
- Deep sea species (Tuna, Skipjack, Yellowfin)
- Expected catch: 200-500 kg
```

### For Diverse Weather Scenarios:

```
Focus on 30 trips with varied weather:
- 10 trips in rough weather (wind 20-30 km/h, waves 1.5-2.5m, rain 0.5-1.0)
- 10 trips in moderate weather (wind 12-20 km/h, waves 0.8-1.5m, rain 0.2-0.5)
- 10 trips in calm weather (wind 5-12 km/h, waves 0.2-0.8m, rain 0-0.2)
- Mix of all boat types
```

### For Seasonal Variations:

```
Generate 30 trips for Southwest Monsoon season (May-September):
- Higher wind speeds (15-30 km/h)
- Larger waves (1.0-2.5m)
- More rain (0.4-1.0)
- Reduced catch (-15% from normal)
- Shorter trips due to weather
```

---

## 💡 CUSTOMIZATION TIPS

**Want more specific data?** Modify the prompt:

1. **Change boat distribution:**

   ```
   Generate 40 Trawler trips and 20 Longliner trips only
   ```

2. **Focus on fuel efficiency:**

   ```
   Generate trips with varying fuel efficiency factors:
   - 20 trips with efficient boats (0.95-1.15)
   - 20 trips with inefficient boats (0.75-0.90)
   ```

3. **Test extreme conditions:**
   ```
   Generate 20 trips in extreme weather:
   - Wind: 25-35 km/h
   - Waves: 2.0-3.0m
   - Rain: 0.7-1.0
   ```

---

## ✅ VALIDATION CHECKLIST

Before importing, verify the generated data:

- [ ] 60 trip records in valid JSON array format
- [ ] All boat names are unique
- [ ] crewSize <= maxCrewCapacity for each boat
- [ ] fuelTankCapacity sufficient for trip distance
- [ ] fishingHours realistic for boat type
- [ ] All costs in LKR currency
- [ ] Weather values within specified ranges
- [ ] No negative values
- [ ] No missing required fields

---

## 🚀 READY TO IMPORT?

Once you have the generated JSON data, tell me and I'll:

1. Create the import script
2. Validate the data
3. Import into your system
4. Run batch training
5. Show you the results

**Just say: "I have the data ready" and paste the JSON!**
