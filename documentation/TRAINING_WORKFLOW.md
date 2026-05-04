# Training Candidates CSV Export - Complete Workflow

## Current Status

✅ CSV export endpoint is working  
❌ But there are **no approved training candidates** in the database yet

---

## How to Populate Training Data

### Option 1: Using the Mobile/Web App

1. **Create Trips** - Fisherman logs trip details:
   - Distance, fuel used, catch amount
   - Engine HP, fishing hours, weather
   - Boat type, location, date

2. **Log Actual Values** - After trip, enter actual outcomes:
   - Actual fuel used (liters)
   - Actual cost (LKR)
   - Actual catch weight

3. **Data Gets Stored** - System creates a "Training Candidate":
   - featuresSnapshot: predicted values
   - labelSnapshot: actual values
   - Status: PENDING

4. **Admin Approval** - Admin reviews and approves:

   ```
   POST /api/v1/training-candidates/:id/approve
   Headers: Authorization: Bearer TOKEN
   ```

5. **CSV Export** - Approved data is now available:
   ```
   GET /api/v1/training-candidates/export/csv
   Headers: Authorization: Bearer TOKEN
   ```

---

### Option 2: Using Python Script

If you have pending candidates waiting, run this:

```bash
cd Backend
python test_full_workflow.py
```

This script will:

- Login with your credentials
- List all pending candidates
- Approve the first few
- Export CSV with approved data
- Show you the results

---

### Option 3: Manually Insert Test Data (Direct Database)

If you want to quickly test without creating real trips:

```javascript
// Insert via MongoDB directly
db.trainingcandidates.insertOne({
  sourceTripId: 'trip_123',
  boatId: 'boat_456',
  boatType: 'Fiber Boat (small)',
  featuresSnapshot: {
    distanceKm: 25.5,
    engineHP: 35,
    fishingHours: 8,
    speed: 12,
    weatherSeverityIndex: 0.3,
  },
  labelSnapshot: {
    fuelUsedLiters: 12.5,
    estimatedCostLKR: 450.0,
  },
  status: 'APPROVED', // Set to APPROVED directly
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

---

## Workflow Diagram

```
┌─────────────────────┐
│  Create Trip        │
│  (Mobile App)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Log Actual Values  │
│  (Fuel, Cost)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│  PENDING Training Candidate      │
│  (stored in database)            │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Admin Approves                  │
│  (via mobile app)                │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  APPROVED Training Candidate     │
│  (ready for CSV export)          │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  CSV Export                      │
│  GET /export/csv                 │
│  → training_data_all.csv         │
└─────────────────────────────────┘
```

---

## Postman Workflow

### Step 1: Check Pending Candidates (Admin Only)

```
GET http://localhost:5000/api/v1/training-candidates/pending
Headers:
  Authorization: Bearer YOUR_TOKEN
```

Response: Array of pending candidates with their data

### Step 2: Approve a Candidate

```
POST http://localhost:5000/api/v1/training-candidates/{candidateId}/approve
Headers:
  Authorization: Bearer YOUR_TOKEN
```

### Step 3: Export CSV with Approved Data

```
GET http://localhost:5000/api/v1/training-candidates/export/csv
Headers:
  Authorization: Bearer YOUR_TOKEN
```

---

## Next Steps

1. **Check if you have pending candidates:**

   ```
   POST login → Get token
   GET /training-candidates/pending → See list
   ```

2. **If pending candidates exist:**

   ```
   POST /:id/approve → Approve them
   GET /export/csv → Download CSV
   ```

3. **If no candidates:**
   - Use mobile app to create test trips
   - Or insert test data directly to database
   - Then run approval workflow

---

## CSV Column Format

Once approved data exists, CSV will have:

```
boat_type,source_trip_id,boat_id,feature_distanceKm,feature_engineHP,feature_fishingHours,feature_speed,feature_weatherSeverityIndex,label_fuelUsedLiters,label_estimatedCostLKR

Fiber Boat (small),trip_001,boat_123,25.5,35,8,12,0.3,12.5,450.00
Fiber Boat (small),trip_002,boat_123,30.0,35,10,11,0.4,15.2,550.00
One Day Boat,trip_003,boat_456,40.0,50,12,14,0.5,18.0,650.00
```

The boat-type notebooks will automatically load and use this data for training!
