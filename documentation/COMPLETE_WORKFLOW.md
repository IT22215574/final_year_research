# FishAI Complete Training Workflow - Full Implementation ✅

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FISHERMAN MOBILE APP                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  1️⃣  CREATE TRIP WITH PREDICTION      │
        │  - Distance, speed, engine HP          │
        │  - Fishing hours, weather              │
        │  - SYSTEM PREDICTS: Fuel & Cost        │
        └─────────────┬───────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────────┐
        │  2️⃣  LOG ACTUAL VALUES (After Trip)   │
        │  - Actual fuel used (liters)            │
        │  - Actual cost (LKR)                    │
        │  - Actual catch (kg)                    │
        └─────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND (NestJS)                                   │
│  logActualData() function creates Training Candidate:                │
│  - featuresSnapshot: predicted values + trip details                 │
│  - labelSnapshot: actual values (fuel, cost)                         │
│  - status: PENDING (awaiting admin approval)                         │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ADMIN PANEL MOBILE APP                             │
│                    3️⃣  REVIEW DATA                                   │
│  - View all pending training candidates                              │
│  - Check predicted vs. actual values                                 │
│  - Approve or Reject each record                                     │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              ▼
        ┌─────────────────────────────────────────┐
        │  4️⃣  DOWNLOAD CSV FOR REVIEW          │
        │  GET /training-candidates/export/csv   │
        │  - Headers: boat_type, features, labels│
        │  - Can import into Excel/Sheets        │
        │  - Review data accuracy                │
        └─────────────┬───────────────────────────┘
              │
              ├─────────────────────────────────┐
              │                                 │
    ✅ APPROVED                          ❌ REJECTED
              │                                 │
              ▼                                 ▼
    [status: APPROVED]                  [status: REJECTED]
    (stored in DB)                       (not used for training)
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    5️⃣  ADMIN TRIGGERS TRAINING                       │
│  POST /training-jobs/trigger                                         │
│  - Collects ALL approved candidates                                  │
│  - Calls Python ML Service                                           │
│  - Trains multiple models (Global + Boat-Type specific)              │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              ▼
        ┌──────────────────────────────────────────┐
        │  PYTHON ML SERVICE (FastAPI, Port 5001)  │
        │  - Loads approved training data          │
        │  - Trains models using scikit-learn      │
        │  - RandomForest, GradientBoosting, etc.  │
        │  - Returns metrics & coefficients        │
        └──────────────┬───────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  6️⃣  MODEL VERSIONING & REGISTRY                    │
│  ModelRegistryService stores:                                        │
│  - Model version metadata                                            │
│  - Performance metrics (MAE, RMSE, R²)                               │
│  - Training date & admin who triggered                               │
│  - Scope: GLOBAL or BOAT_TYPE                                        │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              ▼
        ┌──────────────────────────────────────────┐
        │  7️⃣  AUTOMATIC MODEL PROMOTION          │
        │  - New model replaces old one            │
        │  - Used for next fisherman predictions   │
        │  - Fallback to previous version if issue │
        └──────────────┬───────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────────┐
        │  8️⃣  FISHERMAN GETS BETTER PREDICTIONS  │
        │  - Next trips use updated model          │
        │  - More accurate fuel/cost estimates     │
        │  - Better decision making                │
        └──────────────────────────────────────────┘
```

---

## Implementation Details

### Step 1: Fisherman Creates Trip

**Endpoint:** `POST /api/v1/trips`  
**What Happens:**

- System gets trip details (distance, speed, engine HP, etc.)
- Calls Python ML Service: `POST /predict/fuel`
- Gets predicted fuel consumption and cost
- Saves trip with predictions

### Step 2: Fisherman Logs Actual Values

**Endpoint:** `POST /api/v1/trips/:id/log-actual`  
**What Happens (in trips.service.ts):**

```typescript
// 1. Update trip with actual values
trip.actualFuelLiters = dto.actualFuelLiters;
trip.actualCost = dto.actualFuelCost;
trip.status = 'completed';

// 2. Create Training Candidate (if governance enabled)
if (ENABLE_GOVERNED_TRAINING_PIPELINE === 'true') {
  await candidateModel.create({
    sourceTripId: trip._id,
    boatId: trip.boatId,
    boatType: boat.boatType,
    featuresSnapshot: {
      distanceKm,
      speed,
      engineHP,
      fishingHours,
      weatherSeverityIndex,
      predictedFuelLiters,
    },
    labelSnapshot: {
      actualFuelLiters,
      actualCost,
    },
    status: 'PENDING', // ← Awaits admin approval
  });
}

// 3. Also update boat coefficients in real-time
// (Fast learning, but hasn't been governance-approved)
```

### Step 3: Admin Reviews in CSV

**Endpoint:** `GET /api/v1/training-candidates/export/csv`  
**Returns:**

```csv
boat_type,source_trip_id,boat_id,feature_distanceKm,feature_engineHP,...,label_actualFuelLiters,label_actualCost
Fiber Boat (small),trip_123,boat_456,25.5,35,...,12.5,450
Fiber Boat (small),trip_124,boat_456,30.0,35,...,15.2,550
One Day Boat,trip_125,boat_789,40.0,50,...,18.0,650
```

### Step 4: Admin Approves Candidates

**Endpoint:** `POST /api/v1/training-candidates/:id/approve`  
**What Happens:**

```typescript
// Update status from PENDING → APPROVED
await candidateModel.findByIdAndUpdate(id, {
  status: 'APPROVED',
  reviewedAt: new Date(),
  reviewerId: adminId,
});
```

### Step 5: Admin Triggers Training

**Endpoint:** `POST /api/v1/training-jobs/trigger`  
**Payload:**

```json
{
  "scope": "BOAT_TYPE",
  "boatType": "Fiber Boat (small)"
}
```

**What Backend Does (training-jobs.service.ts):**

1. Queries: `candidates where status='APPROVED' AND boatType='Fiber Boat (small)'`
2. Extracts features and labels from each candidate
3. Sends to Python ML API:
   ```json
   {
     "trips": [
       {
         "boatId": "boat_456",
         "boatType": "Fiber Boat (small)",
         "distanceKm": 25.5,
         "engineHP": 35,
         "predictedFuelLiters": 12.0,
         "actualFuelLiters": 12.5
       },
       ...
     ],
     "scope": "BOAT_TYPE",
     "boatType": "Fiber Boat (small)"
   }
   ```

### Step 6: Python Model Training

**Python Service Response:**

```json
{
  "modelId": "model_v2_fiber_boat_small",
  "metrics": {
    "MAE": 0.85,
    "RMSE": 1.2,
    "R2": 0.92,
    "MAPE": 6.5
  },
  "trainingSamples": 15,
  "boatType": "Fiber Boat (small)",
  "timestamp": "2026-04-11T12:30:00Z"
}
```

### Step 7: Model Registry & Promotion

**What Backend Does (ModelRegistryService):**

```typescript
// 1. Register new model
await modelRegistry.create({
  model_id: 'model_v2_fiber_boat_small',
  scope: 'BOAT_TYPE',
  boatType: 'Fiber Boat (small)',
  metrics: { MAE: 0.85, RMSE: 1.2, R2: 0.92 },
  status: 'ACTIVE',
  promoted_at: new Date(),
  previous_model: 'model_v1_fiber_boat_small',
});

// 2. Set as Active (replaces old model)
// Next predictions use this new model
```

### Step 8: Fisherman Gets Better Predictions

Next time a fisherman creates a trip:

1. System loads the newest ACTIVE model for their boat type
2. Makes predictions using trained coefficients
3. Shows improved estimates on mobile app

---

## Environment Configuration

To **ENABLE** the governed training pipeline:

**Backend .env file:**

```env
ENABLE_GOVERNED_TRAINING_PIPELINE=true
ML_SERVICE_BASE_URL=http://localhost:5001
```

---

## Data Flow Summary

| Step | Who       | Action            | Data Created            | Status          |
| ---- | --------- | ----------------- | ----------------------- | --------------- |
| 1    | Fisherman | Creates trip      | Trip (with predictions) | In Progress     |
| 2    | Fisherman | Logs actuals      | Training Candidate      | **PENDING**     |
| 3    | Admin     | Reviews CSV       | Same candidates         | PENDING         |
| 4    | Admin     | Approves          | Updates status          | **APPROVED** ✅ |
| 5    | Admin     | Triggers training | Training Job            | PROCESSING      |
| 6    | Python ML | Trains model      | Model weights           | COMPLETE        |
| 7    | Backend   | Registers model   | Model Version           | **ACTIVE** 🚀   |
| 8    | Fisherman | New trip          | Better predictions      | NEXT CYCLE      |

---

## Key Features

✅ **Governance Pipeline**

- Admin reviews before training (not automatic)
- CSV export for external verification
- Approval/Rejection workflow

✅ **Boat-Type Specific Models**

- Separate models per boat type
- More accurate predictions for each boat class
- Different engines, sizes, weight distributions

✅ **Model Versioning**

- Previous models kept as backup
- Can rollback if new model performs worse
- Track which admin triggered which training

✅ **Non-Breaking Pipeline**

- If training fails, system still works
- Fallback to real-time learning
- Old models stay active

✅ **Automatic Promotion**

- New model automatically used for predictions
- No manual switching needed
- Admin only controls when to train

---

## Next Actions

To activate this workflow:

1. **Check Environment Variable:**

   ```bash
   # In Backend .env
   ENABLE_GOVERNED_TRAINING_PIPELINE=true
   ```

2. **Create Test Data:**
   - Fisherman creates 5-10 trips
   - Logs actual values for each
   - Training candidates appear in pending queue

3. **Admin Workflow:**
   - View pending candidates
   - Export CSV to review accuracy
   - Approve good candidates
   - Trigger training job
   - Monitor training results

4. **Monitor Results:**
   - Check model metrics (MAE, RMSE, R²)
   - Compare to previous model
   - Rollback if needed

---

## Files Involved

**Backend (NestJS):**

- `src/trips/trips.service.ts` → Creates candidates
- `src/training-candidates/` → CSV export endpoints
- `src/training-jobs/` → Training trigger & monitoring
- `src/model-registry/` → Model versioning

**Python (FastAPI):**

- `/predict/fuel` → Makes predictions
- `/learning/batch-update` → Batch training
- `/learning/update` → Real-time learning

**Database (MongoDB):**

- `trainingcandidates` → Stores pending/approved data
- `trainingjobs` → Tracks training history
- `modelregistries` → Stores model versions
