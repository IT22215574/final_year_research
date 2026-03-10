# DATCIE Stepwise Implementation and Testing Guide

## End-to-End Execution Manual (File-by-File, Function-by-Function, Test-by-Test)

**Project:** FishAI Final Year Research  
 **Module Scope:** Trip Cost Intelligence only (DATCIE)  
 **Date:** March 2, 2026  
 **Mode:** Implementation-safe order with verification at each step

---

## 0) What this guide gives you

This document is your **execution playbook** to implement DATCIE without missing steps:

- Exact implementation sequence (**what first, what next, what last**)
- File and folder structure to create/extend
- Function-level implementation checklist
- Commands for setup, run, and validation
- Postman testing plan with request/response expectations
- Fail-fast checkpoints (so you catch issues early)

This is written for your current monorepo:

```
final_year_research/
├── Backend/                  # NestJS API (already exists)
├── mobile/                   # Expo RN app (already exists)
├── model/cost_prediction/    # Python ML service (already exists)
├── web-app/                  # Next.js (not required for this module)
└── DATCIE_* docs
```

---

## 1) Current baseline (verified from your code)

### Backend

- Global prefix: `api/v1` (`Backend/src/main.ts`)
- Active ML routes under `Controller('ml')`:
  - `POST /api/v1/ml/predict-fuel`
  - `POST /api/v1/ml/predict-cost`
  - `POST /api/v1/ml/optimize`
- Trip CRUD routes under `Controller('trips')`:
  - `POST /api/v1/trips`
  - `GET /api/v1/trips/my-trips`
  - `GET /api/v1/trips/my-stats`
  - `GET /api/v1/trips/:id`
  - `PATCH /api/v1/trips/:id`
  - `DELETE /api/v1/trips/:id`

### Mobile

- Existing planner UI: `mobile/app/(root)/(tabs)/fishtripcost/components/TripPlanner.tsx`
- Existing service calls in `mobile/services/tripService.ts` already target `/api/v1/...`
- State store available: `mobile/stores/tripStore.ts`

### Python ML

- Current service is Flask in `model/cost_prediction/app.py`
- Existing models: fuel and cost prediction using RandomForest

---

## 2) Implementation strategy (safe order)

Use this strict order:

1. **Schema + DTO foundation** (no heavy logic yet)
2. **Backend module wiring + compile check**
3. **Core deterministic functions (distance, WSI, FESI, carbon)**
4. **ML microservice upgrade endpoints**
5. **Backend ↔ Python integration**
6. **Trip save + post-trip learning endpoint**
7. **Mobile wiring to new APIs**
8. **Postman tests (unit route, then full flow)**
9. **Stabilization + hardening**

Do **not** start with UI first. Start with data contracts and backend compile stability.

---

## 3) Final folder/file structure to implement

## 3.1 Backend (NestJS)

Create/extend to this shape:

```
Backend/src/
├── app.module.ts                                # extend imports
├── common/
│   └── utils/
│       ├── haversine.util.ts                    # new
│       ├── wsi.util.ts                          # new
│       └── fesi.util.ts                         # new
├── schemas/
│   ├── trip.schema.ts                           # extend
│   ├── boat.schema.ts                           # new
│   ├── trip-coefficient.schema.ts               # new
│   └── fuel-price.schema.ts                     # new
├── cost-engine/
│   ├── cost-engine.module.ts                    # new
│   ├── cost-engine.controller.ts                # new
│   ├── cost-engine.service.ts                   # new
│   └── dto/
│       ├── predict-cost.dto.ts                  # new
│       ├── optimize-trip.dto.ts                 # new
│       └── log-actual.dto.ts                    # new
├── boat/
│   ├── boat.module.ts                           # new
│   ├── boat.controller.ts                       # new
│   └── boat.service.ts                          # new
├── trips/
│   ├── trips.controller.ts                      # extend (log actual)
│   └── trips.service.ts                         # extend (save prediction + learning)
└── tripml/
    ├── tripml.controller.ts                     # keep backward compatibility
    └── tripml.service.ts                        # can proxy legacy endpoints
```

## 3.2 Python ML

```
model/cost_prediction/
├── main.py                                      # new FastAPI entry
├── requirements.txt                             # update
├── services/
│   ├── adaptive_fuel.py                         # new
│   ├── profitability.py                         # new
│   └── self_learning.py                         # new
├── train_adaptive.py                            # new
├── train_profitability.py                       # new
└── models/
    ├── fuel_model_adaptive.pkl                  # generated
    ├── profitability_model.pkl                  # generated
    └── coefficient_history.json                 # generated
```

## 3.3 Mobile

```
mobile/
├── services/
│   └── tripService.ts                           # extend API methods
├── stores/
│   └── tripStore.ts                             # extend prediction state/actions
├── app/(root)/(tabs)/fishtripcost/
│   ├── plan-trip.tsx                            # new
│   ├── prediction-result.tsx                    # new
│   ├── optimization-suggestions.tsx             # new
│   └── log-actual.tsx                           # new
└── components/
    ├── CarbonGauge.tsx                          # new
    ├── ProfitabilityCircle.tsx                  # new
    ├── CostBreakdownChart.tsx                   # new
    └── WeatherSeverityBadge.tsx                 # new
```

---

## 4) Phase-by-phase implementation steps (with checkpoints)

## Phase 1 — Data contracts first

### Step 1.1 Extend trip schema

**File:** `Backend/src/schemas/trip.schema.ts`

Add fields for:

- prediction (`predictedFuelLiters`, `predictedTotalCost`)
- learning (`fuelPredictionError`, `actualFuelLiters`, `actualCatchKg`)
- advanced metrics (`weatherSeverityIndex`, `economicStressIndex`, `carbonEmissionKg`, `carbonPerKgCatch`, `profitabilityProbability`, `riskCategory`)
- optimization (`optimizationRecommendations`)
- mode (`mode: island | international`)

### Step 1.2 Add new schemas

Create:

- `boat.schema.ts`
- `trip-coefficient.schema.ts`
- `fuel-price.schema.ts`

### Step 1.3 Add DTOs for new endpoints

Create:

- `predict-cost.dto.ts`
- `optimize-trip.dto.ts`
- `log-actual.dto.ts`

### Checkpoint A

Run:

```bash
pnpm -C Backend build
```

Pass condition:

- no TypeScript errors

---

## Phase 2 — Module wiring

### Step 2.1 Create cost-engine module

Create:

- `cost-engine.module.ts`
- `cost-engine.controller.ts`
- `cost-engine.service.ts`

New routes:

- `POST /api/v1/cost-engine/predict`
- `POST /api/v1/cost-engine/optimize`

### Step 2.2 Create boat module

Create:

- `boat.module.ts`
- `boat.controller.ts`
- `boat.service.ts`

Suggested routes:

- `POST /api/v1/boats`
- `GET /api/v1/boats/my`
- `PATCH /api/v1/boats/:id`

### Step 2.3 Register modules in app

**File:** `Backend/src/app.module.ts`

- import and register `CostEngineModule`, `BoatModule`
- register mongoose models for all new schemas

### Checkpoint B

Run:

```bash
pnpm -C Backend start:dev
```

Pass condition:

- app starts
- MongoDB connected log appears

---

## Phase 3 — Deterministic utility functions

### Step 3.1 Distance function

**File:** `Backend/src/common/utils/haversine.util.ts`

- Implement great-circle distance
- Add effective distance using DRF

### Step 3.2 WSI function

**File:** `Backend/src/common/utils/wsi.util.ts`

- Normalize wind/wave/rain
- Weighted sum `WSI = w1*wind + w2*wave + w3*rain`

### Step 3.3 FESI function

**File:** `Backend/src/common/utils/fesi.util.ts`

- Fuel volatility + fish price volatility + weather uncertainty

### Step 3.4 Carbon function (service-level)

**In:** `cost-engine.service.ts`

- `CO2 = FuelUsed * EmissionFactor`
- `CarbonPerKg = CO2 / ExpectedCatch`

### Checkpoint C

- Call `POST /api/v1/cost-engine/predict` with temporary hardcoded values (no Python yet)
- Ensure deterministic response structure is correct

---

## Phase 4 — Python service upgrade

### Step 4.1 Install Python dependencies

From repo root:

```bash
python -m pip install -U pip
python -m pip install -r model/cost_prediction/requirements.txt
```

### Step 4.2 Run FastAPI service

```bash
python model/cost_prediction/main.py
```

(Or if using uvicorn CLI)

```bash
uvicorn model.cost_prediction.main:app --host 0.0.0.0 --port 5001 --reload
```

Use **different port from NestJS** to avoid conflict. Recommended: Python at `5001`.

### Step 4.3 Implement 3 endpoints

- `POST /predict-fuel-adaptive`
- `POST /predict-profitability`
- `POST /update-coefficients`

### Checkpoint D

Health check:

```bash
curl http://localhost:5001/
```

Pass condition:

- returns service status JSON

---

## Phase 5 — Backend to Python integration

### Step 5.1 Add Python base URL to env

**Backend/.env**

```env
ML_SERVICE_BASE_URL=http://localhost:5001
```

### Step 5.2 Read env in Nest service

In `cost-engine.service.ts`:

- call Python endpoints using `HttpService`
- wrap failures with graceful fallback (deterministic formulas)

### Step 5.3 End-to-end predict pipeline

Function order in `predictTripCost()`:

1. distance
2. adaptive fuel
3. weather-adjust
4. operational cost
5. FESI risk adjust
6. carbon
7. profitability probability
8. optimization suggestions

### Checkpoint E

Call:

- `POST /api/v1/cost-engine/predict`
  Pass condition:
- response includes all sections: `distance`, `fuel`, `cost`, `carbon`, `profitability`, `recommendations`

---

## Phase 6 — Self-learning flow

### Step 6.1 Extend trip controller/service

Add endpoint:

- `POST /api/v1/trips/:id/log-actual`

Request body:

```json
{
  "actualFuelLiters": 95.5,
  "actualCatchKg": 120
}
```

### Step 6.2 Learning implementation

Backend logic:

1. load trip
2. compute error: `actual - predicted`
3. call Python `/update-coefficients`
4. update boat coefficients
5. save coefficient history
6. return update summary

### Checkpoint F

- call log endpoint
- verify `boats` collection coefficient update
- verify `trip_coefficients` insert

---

## Phase 7 — Mobile integration

### Step 7.1 Extend service methods

**File:** `mobile/services/tripService.ts`
Add:

- `predictDatcieTripCost()` → `/api/v1/cost-engine/predict`
- `logActualTripData(tripId)` → `/api/v1/trips/:id/log-actual`

### Step 7.2 Extend store

**File:** `mobile/stores/tripStore.ts`
Add state slices:

- prediction result
- optimization suggestions
- carbon score
- profitability

### Step 7.3 Add screens

- `plan-trip.tsx`
- `prediction-result.tsx`
- `optimization-suggestions.tsx`
- `log-actual.tsx`

### Checkpoint G

Run mobile:

```bash
pnpm -C mobile start
```

Pass condition:

- user can submit trip input and see full prediction cards

---

## 5) Function-by-function implementation checklist

Use this as a “done list” while coding.

## Backend functions

### `haversineDistance(lat1, lon1, lat2, lon2)`

- [ ] input validation range check
- [ ] convert degrees to radians
- [ ] return km

### `calculateEffectiveDistance(baseDistance, drf)`

- [ ] default DRF if missing = `0.05`
- [ ] return `baseDistance * (1 + drf)`

### `calculateWSI(wind, wave, rain)`

- [ ] normalize all inputs to `0..1`
- [ ] weighted sum with documented weights

### `calculateOperationalCost(params)`

- [ ] compute all subcomponents
- [ ] include depreciation formula
- [ ] return breakdown + total

### `calculateFESI(inputs)`

- [ ] compute volatility using stdev
- [ ] cap to `0..1`
- [ ] return weighted index

### `calculateCarbon(fuelUsed, expectedCatch)`

- [ ] use emission factor
- [ ] avoid divide-by-zero catch

### `predictTripCost(dto)`

- [ ] orchestrates all engines in order
- [ ] catches Python failure and returns fallback explanation flag

### `logActualData(tripId, dto)`

- [ ] compute prediction error
- [ ] call coefficient update endpoint
- [ ] update boat + save learning history

## Python functions

### `AdaptiveFuelEngine.predict()`

- [ ] apply engine degradation
- [ ] compute travel fuel + idle fuel + weather adjusted

### `ProfitabilityEngine.predict()`

- [ ] expected revenue
- [ ] net profit
- [ ] profitability probability + risk category

### `SelfLearningEngine.update()`

- [ ] error calculation
- [ ] coefficient update with bounded clamp
- [ ] append history log

---

## 6) Commands: setup, run, verify

## 6.1 One-time setup

```bash
# Node dependencies
pnpm -C Backend install
pnpm -C mobile install

# Python deps
python -m pip install -U pip
python -m pip install -r model/cost_prediction/requirements.txt
```

## 6.2 Start services (3 terminals)

### Terminal A: Backend

```bash
pnpm -C Backend start:dev
```

### Terminal B: Python ML

```bash
python model/cost_prediction/main.py
```

### Terminal C: Mobile

```bash
pnpm -C mobile start
```

## 6.3 Compile checks

```bash
pnpm -C Backend build
pnpm -C mobile lint
```

---

## 7) Postman testing guide (full)

Create a Postman collection: **DATCIE - Trip Cost Engine**

## 7.1 Environment variables

Set in Postman environment:

- `baseUrl`: `http://localhost:5000/api/v1`
- `mlUrl`: `http://localhost:5001`
- `token`: `<JWT from login>`
- `tripId`: empty initially
- `boatId`: empty initially

Common headers:

- `Content-Type: application/json`
- `Authorization: Bearer {{token}}`

---

## 7.2 Request set and order

### Request 01 — Auth login (if available)

`POST {{baseUrl}}/auth/signin`

Body (example):

```json
{
  "email": "test@example.com",
  "password": "123456"
}
```

Tests tab script:

```javascript
pm.test("Status is 200", () => pm.response.to.have.status(200));
const json = pm.response.json();
if (json?.token) pm.environment.set("token", json.token);
```

---

### Request 02 — Create Boat

`POST {{baseUrl}}/boats`

Body:

```json
{
  "boatName": "Sea Queen",
  "boatType": "Multi-day",
  "engineHorsePower": 85,
  "engineType": "Inboard",
  "boatValue": 2500000,
  "mode": "island"
}
```

Tests:

```javascript
pm.test("Status is 201", () => pm.response.to.have.status(201));
const json = pm.response.json();
pm.environment.set("boatId", json._id || json.id);
```

---

### Request 03 — Predict cost

`POST {{baseUrl}}/cost-engine/predict`

Body:

```json
{
  "boatId": "{{boatId}}",
  "startLat": 6.9271,
  "startLon": 79.8612,
  "endLat": 6.0535,
  "endLon": 80.221,
  "speed": 10,
  "fishingHours": 8,
  "crewCount": 3,
  "windSpeed": 14,
  "waveHeight": 1.2,
  "fuelPrice": 350,
  "expectedCatch": 120,
  "marketPrice": 550,
  "mode": "island"
}
```

Tests:

```javascript
pm.test("Status is 201/200", () => {
  pm.expect([200, 201]).to.include(pm.response.code);
});
const json = pm.response.json();
pm.test("Has distance block", () =>
  pm.expect(json).to.have.property("distance"),
);
pm.test("Has fuel block", () => pm.expect(json).to.have.property("fuel"));
pm.test("Has cost block", () => pm.expect(json).to.have.property("cost"));
pm.test("Has profitability block", () =>
  pm.expect(json).to.have.property("profitability"),
);
```

---

### Request 04 — Save trip

`POST {{baseUrl}}/trips`

Body:

```json
{
  "departureTime": "2026-03-02T04:00:00.000Z",
  "returnTime": "2026-03-02T16:00:00.000Z",
  "distanceKm": 45.5,
  "engineHorsePower": 85,
  "boatType": "Multi-day",
  "windSpeed": 14,
  "waveHeight": 1.2,
  "fuelUsedLiters": 90,
  "fuelPricePerLiter": 350,
  "iceCost": 2500,
  "crewCost": 6000,
  "foodCost": 1500,
  "maintenanceCost": 1000,
  "otherCost": 800
}
```

Tests:

```javascript
pm.test("Created", () => pm.response.to.have.status(201));
const json = pm.response.json();
pm.environment.set("tripId", json._id || json.id);
```

---

### Request 05 — Log actual post-trip data

`POST {{baseUrl}}/trips/{{tripId}}/log-actual`

Body:

```json
{
  "actualFuelLiters": 96,
  "actualCatchKg": 118
}
```

Tests:

```javascript
pm.test("Status is 200", () => pm.response.to.have.status(200));
const json = pm.response.json();
pm.test("Has model update summary", () => {
  pm.expect(json).to.have.property("newCoefficients");
});
```

---

### Request 06 — Confirm trip updated

`GET {{baseUrl}}/trips/{{tripId}}`

Tests:

```javascript
pm.test("Status is 200", () => pm.response.to.have.status(200));
const json = pm.response.json();
pm.test("Actual fuel exists", () =>
  pm.expect(json.actualFuelLiters).to.not.equal(undefined),
);
```

---

### Request 07 — Confirm trips list

`GET {{baseUrl}}/trips/my-trips`

Tests:

```javascript
pm.test("Status is 200", () => pm.response.to.have.status(200));
const json = pm.response.json();
pm.test("Array response", () => pm.expect(Array.isArray(json)).to.eql(true));
```

---

## 7.3 Negative tests (must pass)

1. Missing token → should return `401`
2. Missing required predict fields → `400`
3. Invalid coordinates (out of range) → `400`
4. `actualFuelLiters < 0` in log endpoint → `400`
5. Unknown `tripId` → `404`
6. Python service down:


    - Either fallback response with flag `mlFallback: true`
    - Or controlled `503` with clear message

---

## 7.4 Regression smoke set (run each release)

- `POST /cost-engine/predict` (base happy path)
- `POST /trips`
- `POST /trips/:id/log-actual`
- `GET /trips/my-trips`
- `GET /trips/my-stats`

If these pass, major flow is stable.

---

## 8) cURL quick test commands (CLI alternative)

```bash
curl -X POST "http://localhost:5000/api/v1/cost-engine/predict" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"boatId\":\"<BOAT_ID>\",\"startLat\":6.9271,\"startLon\":79.8612,\"endLat\":6.0535,\"endLon\":80.2210,\"speed\":10,\"fishingHours\":8,\"crewCount\":3,\"windSpeed\":14,\"waveHeight\":1.2,\"fuelPrice\":350,\"expectedCatch\":120,\"marketPrice\":550,\"mode\":\"island\"}"
```

```bash
curl -X POST "http://localhost:5000/api/v1/trips/<TRIP_ID>/log-actual" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"actualFuelLiters\":96,\"actualCatchKg\":118}"
```

---

## 9) Definition of Done (DoD)

Declare DATCIE implementation complete only if all are true:

- [ ] Backend builds and runs
- [ ] Python FastAPI runs independently
- [ ] `cost-engine/predict` returns full multi-engine response
- [ ] trip save works with prediction fields
- [ ] post-trip learning updates boat coefficients
- [ ] mobile shows prediction + optimization + carbon + profitability
- [ ] Postman happy path + negative tests pass
- [ ] one full manual end-to-end demo recorded

---

## 10) Common failure points and prevention

1. **Port conflict**


    - Keep NestJS on `5000`, Python on `5001`

2. **API base mismatch in mobile**


    - `EXPO_PUBLIC_API_KEY` must include `/api/v1`

3. **Auth guard failures in Postman**


    - Ensure token is set in `Authorization` header

4. **Schema drift (DTO vs Mongo fields)**


    - update DTO + schema together in same commit

5. **Python unavailable causing backend crash**


    - wrap Python calls in `try/catch`
    - return fallback or controlled error

6. **Learning instability (coefficients explode)**


    - clamp coefficient ranges in Python update logic

---

## 11) Recommended commit sequence

1. `feat(datcie): add schemas and DTO contracts`
2. `feat(datcie): add cost-engine module with deterministic pipeline`
3. `feat(datcie-ml): add FastAPI adaptive/profit/self-learning endpoints`
4. `feat(datcie): integrate backend with python service`
5. `feat(datcie): add post-trip learning endpoint`
6. `feat(mobile-datcie): wire prediction and logging screens`
7. `test(datcie): add postman collection and regression scripts`

---

## 12) Execution checklist (copy and use)

- [ ] Phase 1 complete + Checkpoint A pass
- [ ] Phase 2 complete + Checkpoint B pass
- [ ] Phase 3 complete + Checkpoint C pass
- [ ] Phase 4 complete + Checkpoint D pass
- [ ] Phase 5 complete + Checkpoint E pass
- [ ] Phase 6 complete + Checkpoint F pass
- [ ] Phase 7 complete + Checkpoint G pass
- [ ] Full Postman suite pass
- [ ] DoD complete

---

## Final note

Follow this order exactly and validate at each checkpoint. If a checkpoint fails, do not move forward to next phase until it is fixed. This approach prevents cascading errors and keeps your DATCIE implementation stable and research-ready.
