# FishAI Training Workflow - Setup Checklist ✅

## System Status

Your environment is **fully configured** for the governed training pipeline:

```env
ENABLE_GOVERNED_TRAINING_PIPELINE=true ✅
ENABLE_ADMIN_ONLY_MODEL_LIFECYCLE=true ✅
ENABLE_DATASET_APPROVAL_GATE=true ✅
ENABLE_MODEL_VERSION_ROUTING=true ✅
ML_SERVICE_BASE_URL=http://localhost:5001 ✅
```

---

## Quick Start - Test The Complete Workflow

### ✅ Prerequisites

- [ ] Backend running on `http://localhost:5000`
- [ ] Python ML Service running on `http://localhost:5001`
- [ ] MongoDB connected (`fishingapp2` database)
- [ ] Admin logged in with token

### ✅ Step 1: Create Test Trip (Fisherman)

**API Call:**

```bash
POST http://localhost:5000/api/v1/trips
Authorization: Bearer YOUR_TOKEN

{
  "boatId": "YOUR_BOAT_ID",
  "distanceKm": 25.5,
  "speed": 12,
  "engineHorsePower": 35,
  "fishingHours": 8,
  "weatherSeverityIndex": 0.3,
  "mode": "island",
  "status": "planned"
}
```

**Result:** Trip created with PREDICTED values

- Fuel: ~12 liters
- Cost: ~450 LKR

**Postman:**

- POST `/api/v1/trips`
- Body: Above JSON

---

### ✅ Step 2: Log Actual Values (After Trip Complete)

**API Call:**

```bash
POST http://localhost:5000/api/v1/trips/{tripId}/log-actual
Authorization: Bearer YOUR_TOKEN

{
  "actualFuelLiters": 12.5,
  "actualCatchKg": 15.0,
  "actualFuelCost": 475.00,
  "actualNotes": "Good catch, slightly more fuel than predicted"
}
```

**Result:**

- Trip marked as COMPLETED
- **Training Candidate CREATED** with status: PENDING
- Stored in `trainingcandidates` collection

**Postman:**

- POST `/api/v1/trips/{tripId}/log-actual`
- Body: Above JSON

---

### ✅ Step 3: Check Pending Candidates (Admin)

**API Call:**

```bash
GET http://localhost:5000/api/v1/training-candidates/pending
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Result:** Array showing:

```json
[
  {
    "_id": "...",
    "boatId": "...",
    "boatType": "Fiber Boat (small)",
    "featuresSnapshot": {
      "distanceKm": 25.5,
      "engineHP": 35,
      "fishingHours": 8,
      "predictedFuelLiters": 12.0
    },
    "labelSnapshot": {
      "actualFuelLiters": 12.5,
      "actualCost": 475.0
    },
    "status": "PENDING"
  }
]
```

**Postman:**

- GET `/api/v1/training-candidates/pending`
- Headers: `Authorization: Bearer YOUR_ADMIN_TOKEN`

---

### ✅ Step 4: Export as CSV (Admin Review)

**API Call:**

```bash
GET http://localhost:5000/api/v1/training-candidates/export/csv
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Result:** CSV file with header:

```csv
boat_type,source_trip_id,boat_id,feature_distanceKm,feature_engineHP,feature_fishingHours,feature_speed,feature_weatherSeverityIndex,label_actualFuelLiters,label_actualCost
```

**Postman:**

- GET `/api/v1/training-candidates/export/csv`
- Headers: `Authorization: Bearer YOUR_ADMIN_TOKEN`
- Click "Send and Download" to save as CSV
- Open in Excel/Sheets to review

---

### ✅ Step 5: Approve Candidate (Admin)

**API Call:**

```bash
POST http://localhost:5000/api/v1/training-candidates/{candidateId}/approve
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Result:**

- Status changed: PENDING → **APPROVED** ✅
- Ready for training

**Postman:**

- POST `/api/v1/training-candidates/{candidateId}/approve`
- Headers: `Authorization: Bearer YOUR_ADMIN_TOKEN`
- No body needed

---

### ✅ Step 6: Trigger Training Job (Admin)

**API Call:**

```bash
POST http://localhost:5000/api/v1/training-jobs/trigger
Authorization: Bearer YOUR_ADMIN_TOKEN

{
  "scope": "BOAT_TYPE",
  "boatType": "Fiber Boat (small)"
}
```

**Result:**

- Training job created in database
- Python ML Service called
- Models trained using approved candidates
- New model registered in model registry

**Postman:**

- POST `/api/v1/training-jobs/trigger`
- Headers: `Authorization: Bearer YOUR_ADMIN_TOKEN`
- Body: Above JSON (or use scope: "GLOBAL" for all boats)

---

### ✅ Step 7: Check Training History (Admin)

**API Call:**

```bash
GET http://localhost:5000/api/v1/training-jobs/history
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Result:** Shows all training jobs:

```json
[
  {
    "_id": "...",
    "scope": "BOAT_TYPE",
    "boatType": "Fiber Boat (small)",
    "status": "COMPLETE",
    "recordsProcessed": 5,
    "metrics": {
      "MAE": 0.85,
      "RMSE": 1.2,
      "R2": 0.92
    },
    "startedBy": "admin_id",
    "completedAt": "2026-04-11T12:35:00Z"
  }
]
```

**Postman:**

- GET `/api/v1/training-jobs/history`
- Headers: `Authorization: Bearer YOUR_ADMIN_TOKEN`

---

### ✅ Step 8: Next Trip Uses Updated Model

Create another trip - it will use the **newly trained model** for better predictions!

```bash
POST http://localhost:5000/api/v1/trips
Authorization: Bearer YOUR_TOKEN

{
  "boatId": "SAME_BOAT_ID",
  "distanceKm": 25.5,
  ...
}
```

**Result:** Predictions use updated model coefficients → More accurate! 🚀

---

## Workflow Data Flow

```
Fisherman Trip + Actuals
    ↓
Training Candidate (PENDING)
    ↓
Admin Reviews CSV
    ↓
Admin Approves (APPROVED)
    ↓
Admin Triggers Training
    ↓
Python Trains Model
    ↓
Backend Registers Model
    ↓
Next Trip Uses New Model ✨
```

---

## What's Happening Behind The Scenes

### When Actual Is Logged:

```typescript
// 1. Trip marked complete
trip.status = 'completed'
trip.actualFuelLiters = 12.5
trip.actualCost = 475

// 2. Training Candidate Created
TrainingCandidate.create({
  boatType: 'Fiber Boat (small)',
  featuresSnapshot: { distanceKm, speed, engineHP, ... },
  labelSnapshot: { actualFuelLiters, actualCost },
  status: 'PENDING' ← Awaits admin approval
})

// 3. Boat Coefficients Updated (Immediate Learning)
// This is fast but not governance-approved
boat.fuelEfficiencyFactor = 0.95
boat.engineDegradationFactor = 0.98
```

### When Training Is Triggered:

```typescript
// 1. Collect approved candidates
candidates = TrainingCandidate.find({ status: 'APPROVED' })

// 2. Send to Python ML Service
POST http://localhost:5001/learning/batch-update {
  trips: [...],
  scope: 'BOAT_TYPE',
  boatType: 'Fiber Boat (small)'
}

// 3. Python trains models:
// - RandomForest
// - ExtraTrees
// - GradientBoosting
// - HistGradientBoosting
// → Returns best model with metrics

// 4. Backend registers model
ModelRegistry.create({
  model_id: 'v2_fiber_boat_small',
  metrics: { MAE, RMSE, R2 },
  status: 'ACTIVE'
})

// 5. Next predictions use this model
```

---

## Troubleshooting

### No Training Candidates Appear

- [ ] Check: Did fisherman log actual values?
- [ ] Check: Is `ENABLE_GOVERNED_TRAINING_PIPELINE=true`?
- [ ] Check: Is Python ML service running?

### Training Job Fails

- [ ] Check backend logs: `tail -f logs/app.log`
- [ ] Check Python logs: `tail -f model/cost_prediction/logs/`
- [ ] Verify Python service is running on port 5001

### CSV Export Shows Empty

- [ ] No APPROVED candidates yet
- [ ] Run approve endpoint first
- [ ] Check database: `db.trainingcandidates.find()`

---

## Complete Workflow Summary

| Phase        | Actor     | Action          | Data Change                  |
| ------------ | --------- | --------------- | ---------------------------- | ----------------------------- |
| **Creation** | Fisherman | Creates trip    | Trip with predictions        |
| **Logging**  | Fisherman | Logs actuals    | Training Candidate (PENDING) |
| **Review**   | Admin     | Views CSV       | CSV with all pending data    |
| **Approval** | Admin     | Approves        |                              | Training Candidate (APPROVED) |
| **Training** | Admin     | Triggers job    | Training Job (PROCESSING)    |
| **ML**       | Python    | Trains models   | Model version created        |
| **Registry** | Backend   | Registers model | Model (ACTIVE)               |
| **Usage**    | Fisherman | Next trip       | Better predictions! ✨       |

---

## Key Takeaway

✅ **The complete workflow IS implemented and ready!**

Your system automatically:

1. Creates training candidates when fishermen log actual values
2. Lets admins approve/reject via CSV
3. Trains models on approved data
4. Registers and promotes new models
5. Uses new models for better predictions

**No manual intervention needed - just follow the 8 steps above!** 🎯
