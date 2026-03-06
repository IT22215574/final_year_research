# Dynamic Adaptive Trip Cost Intelligence Engine (DATCIE)

## Complete Implementation Guide Based on Your Project Structure

**Document Version:** 1.0  
**Date:** March 2, 2026  
**Project:** FishAI Final Year Research  
**Module:** Trip Cost Intelligence (Your Responsibility)

---

## 📋 TABLE OF CONTENTS

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [DATCIE System Overview](#2-datcie-system-overview)
3. [Database Schema Extensions](#3-database-schema-extensions)
4. [Backend Implementation Roadmap](#4-backend-implementation-roadmap)
5. [Python ML Microservice Enhancement](#5-python-ml-microservice-enhancement)
6. [Mobile Frontend Implementation](#6-mobile-frontend-implementation)
7. [Mathematical Functions Implementation](#7-mathematical-functions-implementation)
8. [Self-Learning Architecture](#8-self-learning-architecture)
9. [Island vs International Mode](#9-island-vs-international-mode)
10. [Navigation Flow Design](#10-navigation-flow-design)
11. [Integration Points](#11-integration-points)
12. [Research Positioning](#12-research-positioning)

---

## 1️⃣ CURRENT ARCHITECTURE ANALYSIS

### 1.1 Existing Tech Stack

#### ✅ Backend (NestJS)

**Location:** `Backend/src/`

**Current Structure:**

```
Backend/src/
├── schemas/
│   ├── trip.schema.ts       ✅ EXISTS - Basic trip model
│   └── user.schema.ts       ✅ EXISTS
├── trips/
│   ├── trips.controller.ts  ✅ EXISTS - CRUD endpoints
│   ├── trips.service.ts     ✅ EXISTS - Business logic
│   └── dto/                 ✅ EXISTS
├── tripml/                  ✅ EXISTS - ML integration point
├── trips_analytics/         ✅ EXISTS - Analytics module
└── grading/                 ✅ EXISTS - Quality module (Other member)
```

**Current Dependencies:**

- ✅ MongoDB + Mongoose
- ✅ JWT Authentication
- ✅ Class Validator
- ✅ NestJS Config

#### ✅ Mobile App (React Native + Expo)

**Location:** `mobile/`

**Current Structure:**

```
mobile/
├── app/(root)/(tabs)/fishtripcost/
│   └── components/
│       └── TripPlanner.tsx  ✅ EXISTS - Trip planning UI
├── stores/
│   ├── tripStore.ts         ✅ EXISTS - Zustand state
│   └── fishingZoneStore.ts  ✅ EXISTS - Zone selection
├── services/
│   └── tripService.ts       ✅ EXISTS - API calls
└── types/
    └── type.d.ts            ✅ EXISTS - TypeScript types
```

**Current State Management:**

- ✅ Zustand (tripStore, fishingZoneStore)
- ✅ Async Storage integration
- ✅ API connection via utils/api.ts

#### ✅ ML Service (Python)

**Location:** `model/cost_prediction/`

**Current Structure:**

```
model/cost_prediction/
├── app.py                   ✅ Flask API
├── train.py                 ✅ RandomForest training
├── requirements.txt         ✅ Dependencies
├── trips_export.csv         ✅ Training data
└── models/
    ├── fuel_model.pkl       ✅ Fuel prediction
    └── cost_model.pkl       ✅ Cost prediction
```

**Current ML Approach:**

- ✅ RandomForestRegressor
- ✅ Flask endpoints for prediction
- ✅ Joblib model persistence

---

### 1.2 Current Trip Schema Analysis

**File:** `Backend/src/schemas/trip.schema.ts`

**Existing Fields:**

```typescript
✅ userId: string
✅ departureTime: Date
✅ returnTime: Date
✅ distanceKm: number
✅ engineHorsePower: number
✅ boatType: string
✅ windSpeed: number
✅ waveHeight: number
✅ weatherCondition: string
✅ fuelUsedLiters: number
✅ fuelPricePerLiter: number
✅ iceCost: number
✅ crewCost: number
✅ foodCost: number
✅ maintenanceCost: number
✅ otherCost: number
```

**Virtual Fields (Computed):**

```typescript
✅ tripDurationHours
✅ fuelCost
✅ totalCost
```

**Gap Analysis:**
❌ Missing: Predictive fields (predicted fuel, predicted cost)  
❌ Missing: Learning fields (actual vs predicted error)  
❌ Missing: Advanced metrics (carbon, profitability, risk)  
❌ Missing: Boat-specific coefficients  
❌ Missing: Optimization recommendations

---

### 1.3 Current ML Pipeline Analysis

**File:** `model/cost_prediction/app.py`

**Existing Endpoints:**

```python
✅ GET  /              # Health check
✅ POST /predict-fuel  # Fuel prediction
✅ POST /predict-cost  # Cost prediction
```

**Current Features Used:**

```python
Fuel Model:
  - distanceKm
  - engineHorsePower
  - windSpeed
  - waveHeight
  - tripDurationHours

Cost Model:
  - All fuel features +
  - fuelPricePerLiter
```

**Gap Analysis:**
❌ Missing: Adaptive coefficients (a(t), b(t), c(t))  
❌ Missing: Route deviation factor  
❌ Missing: Engine degradation modeling  
❌ Missing: Idle fuel calculation  
❌ Missing: Weather severity index (WSI)  
❌ Missing: Economic stress index (FESI)  
❌ Missing: Carbon efficiency  
❌ Missing: Profitability probability  
❌ Missing: Self-learning update mechanism

---

## 2️⃣ DATCIE SYSTEM OVERVIEW

### 2.1 Complete Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT NATIVE MOBILE APP                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Trip Planning Screen                                    │  │
│  │  • User inputs (distance, boat, crew, fishing hours)   │  │
│  │  • Zone selection integration                          │  │
│  │  • Weather auto-fetch                                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Trip Store (Zustand)                                    │  │
│  │  • Current trip state                                   │  │
│  │  • Prediction results                                   │  │
│  │  • Optimization suggestions                             │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│                      NESTJS BACKEND API                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Trip Cost Controller                                    │  │
│  │  POST /trips/predict                                    │  │
│  │  POST /trips/optimize                                   │  │
│  │  POST /trips                                            │  │
│  │  POST /trips/:id/log-actual                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Cost Engine Service (NEW)                              │  │
│  │  • Distance calculation (Haversine + DRF)              │  │
│  │  • Weather severity index (WSI)                        │  │
│  │  • Economic stress index (FESI)                        │  │
│  │  • ML microservice integration                         │  │
│  │  • Carbon calculation                                  │  │
│  │  • Optimization engine                                 │  │
│  └────────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Boat Model Service (NEW)                               │  │
│  │  • Stores adaptive coefficients per boat               │  │
│  │  • Engine degradation tracking                         │  │
│  │  • Island/International mode config                    │  │
│  └────────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ MongoDB                                                 │  │
│  │  • trips (extended schema)                             │  │
│  │  • boats (NEW)                                          │  │
│  │  • trip_coefficients (NEW - learning history)          │  │
│  │  • fuel_price_history (NEW - FESI calculation)         │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│             PYTHON ML MICROSERVICE (FastAPI)                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Adaptive Fuel Engine                                    │  │
│  │  POST /predict-fuel-adaptive                            │  │
│  │    • Uses boat-specific a(t), b(t), c(t)               │  │
│  │    • Applies engine degradation                         │  │
│  │    • Idle + fishing fuel calculation                    │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Profitability ML Model                                  │  │
│  │  POST /predict-profitability                            │  │
│  │    • RandomForest probability P(Profit > 0)            │  │
│  │    • Risk categorization                                │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Self-Learning Service                                   │  │
│  │  POST /update-coefficients                              │  │
│  │    • Compute prediction error                           │  │
│  │    • Update a, b, c with learning rate η               │  │
│  │    • Return new coefficients to MongoDB                │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Model Storage                                           │  │
│  │  • fuel_model_adaptive.pkl                             │  │
│  │  • profitability_model.pkl                             │  │
│  │  • coefficient_updater.pkl (gradient descent logic)    │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.2 Core Processing Pipeline

**DATCIE processes every trip request through 10 engines:**

```
INPUT (Distance, Boat, Weather, Crew, Fishing Hours, Fuel Price)
    ↓
[1] DISTANCE ENGINE
    → Great Circle Distance (Haversine)
    → Route Deviation Factor (DRF) - learned over time
    → Effective Distance = d × (1 + DRF)
    ↓
[2] ADAPTIVE FUEL MODEL
    → Base: FuelRate(t) = a(t)v² + b(t)v + c(t)
    → Engine Degradation: a(t) = a₀(1 + EfficiencyLoss)
    → Travel Fuel = FuelRate × TravelTime
    ↓
[3] IDLE + FISHING FUEL
    → Idle consumption during fishing hours
    → TotalFuel = TravelFuel + (IdleRate × FishingHours)
    ↓
[4] WEATHER SEVERITY INDEX (WSI)
    → WSI = w₁(Wind) + w₂(WaveProxy) + w₃(Rain)
    → AdjustedFuel = TotalFuel × (1 + WSI)
    ↓
[5] OPERATIONAL COST LAYER
    → Fuel Cost + Crew + Ice + Gear + Maintenance + Port + Depreciation
    → Depreciation = (BoatValue × TripHours) / LifetimeHours
    ↓
[6] ECONOMIC STRESS INDEX (FESI)
    → α(FuelVolatility) + β(FishPriceFluctuation) + γ(WeatherUncertainty)
    → RiskAdjustedCost = BaseCost × (1 + FESI)
    ↓
[7] CARBON EFFICIENCY
    → CO2 = FuelUsed × EmissionFactor
    → CarbonPerKg = CO2 / ExpectedCatch
    ↓
[8] PROFITABILITY PROBABILITY
    → ExpectedRevenue = ExpectedCatch × MarketPrice
    → NetProfit = ExpectedRevenue - TotalCost
    → Probability = P(Profit > 0) via RandomForest
    ↓
[9] OPTIMIZATION ENGINE
    → Scenario testing: -10% speed, +2h delay, -1 crew
    → Return top 3 suggestions with expected savings
    ↓
[10] SELF-LEARNING UPDATE (Post-Trip Only)
    → Error = ActualFuel - PredictedFuel
    → a_new = a_old + η × Error
    → Update MongoDB boat coefficients
    ↓
OUTPUT (Prediction + Recommendations + Carbon + Risk Score)
```

---

## 3️⃣ DATABASE SCHEMA EXTENSIONS

### 3.1 Extended Trip Schema

**File to Modify:** `Backend/src/schemas/trip.schema.ts`

**New Fields to Add:**

```typescript
// ========== PREDICTION FIELDS ==========
@Prop()
predictedFuelLiters: number;

@Prop()
predictedTotalCost: number;

@Prop()
fuelPredictionError: number; // Actual - Predicted

@Prop()
costPredictionError: number;

// ========== ADVANCED METRICS ==========
@Prop()
carbonEmissionKg: number;

@Prop()
carbonPerKgCatch: number; // Sustainability metric

@Prop()
profitabilityProbability: number; // 0-1 scale

@Prop()
riskCategory: string; // "Low" | "Medium" | "High"

@Prop()
weatherSeverityIndex: number; // WSI value

@Prop()
economicStressIndex: number; // FESI value

// ========== BOAT-SPECIFIC ==========
@Prop()
boatId: string; // Reference to boats collection

@Prop()
routeDeviationFactor: number; // Learned DRF for this trip

@Prop()
effectiveDistanceKm: number; // d × (1 + DRF)

// ========== OPERATIONAL DETAILS ==========
@Prop()
fishingHours: number;

@Prop()
idleFuelUsed: number;

@Prop()
travelFuelUsed: number;

@Prop()
crewCount: number;

@Prop()
gearWearCost: number;

@Prop()
portFee: number;

@Prop()
depreciationCost: number;

// ========== CATCH & REVENUE ==========
@Prop()
expectedCatchKg: number; // From Fish Zone module (other member)

@Prop()
actualCatchKg: number; // User logs post-trip

@Prop()
marketPricePerKg: number; // From Market module (other member)

@Prop()
expectedRevenue: number;

@Prop()
actualRevenue: number;

@Prop()
netProfit: number;

// ========== OPTIMIZATION ==========
@Prop({ type: [String] })
optimizationRecommendations: string[];

@Prop()
optimizationSavingsPotential: number;

// ========== MODE ==========
@Prop({ default: 'island' })
mode: 'island' | 'international';
```

---

### 3.2 NEW: Boat Model Schema

**File to Create:** `Backend/src/schemas/boat.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type BoatDocument = HydratedDocument<Boat>;

@Schema({ timestamps: true })
export class Boat {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  boatName: string;

  @Prop({ required: true })
  boatType: string; // "Multi-day", "One-day", "Lagoon"

  @Prop({ required: true })
  engineHorsePower: number;

  @Prop({ required: true })
  engineType: string; // "Inboard", "Outboard"

  // ========== ADAPTIVE FUEL COEFFICIENTS ==========
  @Prop({ default: 0.001 })
  aCoefficient: number; // Quadratic term

  @Prop({ default: 0.05 })
  bCoefficient: number; // Linear term

  @Prop({ default: 2.0 })
  cCoefficient: number; // Constant term

  @Prop({ default: 1.5 })
  idleRate: number; // L/hour when fishing

  // ========== ENGINE TRACKING ==========
  @Prop({ default: 0 })
  totalUsageHours: number; // Accumulated engine hours

  @Prop({ default: 10000 })
  engineLifetimeHours: number; // Expected engine life

  @Prop()
  lastMaintenanceDate: Date;

  // ========== ROUTE LEARNING ==========
  @Prop({ default: 0.05 })
  averageRouteDeviationFactor: number; // Learned DRF

  @Prop({ default: 0 })
  tripCount: number; // Number of trips completed

  // ========== FINANCIAL ==========
  @Prop()
  boatValue: number; // For depreciation

  @Prop()
  purchaseDate: Date;

  // ========== MODE ==========
  @Prop({ default: "island" })
  mode: "island" | "international";

  // ========== ISLAND MODE PRESETS ==========
  @Prop({ type: Object })
  islandConfig: {
    monsoonMultipliers: { [month: string]: number };
    fuelSubsidyRate: number;
    defaultCrewWage: number;
    lagoonMode: boolean;
  };

  // ========== TIMESTAMPS ==========
  createdAt: Date;
  updatedAt: Date;
}

export const BoatSchema = SchemaFactory.createForClass(Boat);
```

---

### 3.3 NEW: Trip Coefficient History Schema

**File to Create:** `Backend/src/schemas/trip-coefficient.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type TripCoefficientDocument = HydratedDocument<TripCoefficient>;

@Schema({ timestamps: true })
export class TripCoefficient {
  @Prop({ required: true, index: true })
  boatId: string;

  @Prop({ required: true })
  tripId: string;

  // Coefficients BEFORE this trip
  @Prop({ required: true })
  aBefore: number;

  @Prop({ required: true })
  bBefore: number;

  @Prop({ required: true })
  cBefore: number;

  // Coefficients AFTER learning update
  @Prop({ required: true })
  aAfter: number;

  @Prop({ required: true })
  bAfter: number;

  @Prop({ required: true })
  cAfter: number;

  @Prop({ required: true })
  predictionError: number;

  @Prop({ required: true })
  learningRate: number; // η used

  @Prop({ required: true })
  updatedAt: Date;
}

export const TripCoefficientSchema =
  SchemaFactory.createForClass(TripCoefficient);
```

---

### 3.4 NEW: Fuel Price History Schema

**File to Create:** `Backend/src/schemas/fuel-price.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type FuelPriceDocument = HydratedDocument<FuelPrice>;

@Schema({ timestamps: true })
export class FuelPrice {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  pricePerLiter: number;

  @Prop({ default: "LKR" })
  currency: string;

  @Prop({ default: "island" })
  region: "island" | "international";

  @Prop()
  source: string; // "manual" | "government_api" | "user_input"
}

export const FuelPriceSchema = SchemaFactory.createForClass(FuelPrice);
```

---

## 4️⃣ BACKEND IMPLEMENTATION ROADMAP

### 4.1 Module Structure

**Recommended Structure:**

```
Backend/src/
├── cost-engine/                    # NEW MODULE
│   ├── cost-engine.module.ts
│   ├── cost-engine.controller.ts
│   ├── cost-engine.service.ts
│   └── dto/
│       ├── predict-cost.dto.ts
│       ├── optimize-trip.dto.ts
│       └── log-actual.dto.ts
│
├── boat/                           # NEW MODULE
│   ├── boat.module.ts
│   ├── boat.controller.ts
│   ├── boat.service.ts
│   └── dto/
│       └── create-boat.dto.ts
│
├── trips/                          # EXISTING - EXTEND
│   ├── trips.controller.ts         # Add learning endpoints
│   ├── trips.service.ts            # Extend with prediction storage
│   └── dto/
│
├── schemas/                        # EXTEND
│   ├── trip.schema.ts              # Add new fields
│   ├── boat.schema.ts              # NEW
│   ├── trip-coefficient.schema.ts  # NEW
│   └── fuel-price.schema.ts        # NEW
│
└── common/
    └── utils/
        ├── haversine.util.ts       # NEW
        ├── wsi.util.ts             # NEW (Weather Severity)
        └── fesi.util.ts            # NEW (Economic Stress)
```

---

### 4.2 Cost Engine Service Implementation

**File to Create:** `Backend/src/cost-engine/cost-engine.service.ts`

**Core Methods:**

```typescript
@Injectable()
export class CostEngineService {
  constructor(
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    @InjectModel(Boat.name) private boatModel: Model<BoatDocument>,
    @InjectModel(FuelPrice.name)
    private fuelPriceModel: Model<FuelPriceDocument>,
    private readonly httpService: HttpService, // For calling Python ML service
  ) {}

  // ========== ENGINE 1: DISTANCE ==========
  async calculateEffectiveDistance(
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
    boatId: string,
  ): Promise<{ baseDistance: number; effectiveDistance: number; drf: number }> {
    // Haversine formula
    const baseDistance = this.haversineDistance(
      startLat,
      startLon,
      endLat,
      endLon,
    );

    // Get learned DRF from boat
    const boat = await this.boatModel.findById(boatId);
    const drf = boat?.averageRouteDeviationFactor || 0.05;

    const effectiveDistance = baseDistance * (1 + drf);

    return { baseDistance, effectiveDistance, drf };
  }

  // ========== ENGINE 2-4: FUEL PREDICTION ==========
  async predictFuel(
    boatId: string,
    effectiveDistance: number,
    fishingHours: number,
    speed: number,
    windSpeed: number,
    waveHeight: number,
  ): Promise<{
    travelFuel: number;
    idleFuel: number;
    totalFuel: number;
    weatherAdjusted: number;
    wsi: number;
  }> {
    const boat = await this.boatModel.findById(boatId);

    // Calculate travel time
    const travelTime = effectiveDistance / speed;

    // Call Python ML service with adaptive coefficients
    const mlResponse = await this.httpService
      .post("http://localhost:5000/predict-fuel-adaptive", {
        boatId,
        aCoefficient: boat.aCoefficient,
        bCoefficient: boat.bCoefficient,
        cCoefficient: boat.cCoefficient,
        speed,
        travelTime,
        windSpeed,
        waveHeight,
        fishingHours,
        idleRate: boat.idleRate,
        usageHours: boat.totalUsageHours,
        lifetimeHours: boat.engineLifetimeHours,
      })
      .toPromise();

    return mlResponse.data;
  }

  // ========== ENGINE 5: OPERATIONAL COST ==========
  async calculateOperationalCost(
    fuelLiters: number,
    fuelPrice: number,
    crewCount: number,
    tripHours: number,
    boatId: string,
    mode: "island" | "international",
  ): Promise<{
    fuelCost: number;
    crewCost: number;
    iceCost: number;
    gearWear: number;
    maintenance: number;
    portFee: number;
    depreciation: number;
    totalCost: number;
  }> {
    const boat = await this.boatModel.findById(boatId);

    const fuelCost = fuelLiters * fuelPrice;

    // Island mode uses presets, International uses user input
    const crewWage =
      mode === "island" ? boat.islandConfig.defaultCrewWage : 2000; // User configurable

    const crewCost = crewCount * crewWage * (tripHours / 24);

    const iceCost = tripHours > 12 ? 5000 : 2000; // Example logic

    const gearWear = 0.02 * fuelCost; // 2% of fuel cost

    const maintenance = 0.05 * fuelCost; // 5% of fuel cost

    const portFee = mode === "island" ? 500 : 1000;

    // Depreciation = (BoatValue × TripHours) / LifetimeHours
    const depreciation =
      (boat.boatValue * tripHours) / boat.engineLifetimeHours;

    const totalCost =
      fuelCost +
      crewCost +
      iceCost +
      gearWear +
      maintenance +
      portFee +
      depreciation;

    return {
      fuelCost,
      crewCost,
      iceCost,
      gearWear,
      maintenance,
      portFee,
      depreciation,
      totalCost,
    };
  }

  // ========== ENGINE 6: FESI ==========
  async calculateFESI(): Promise<number> {
    // Get last 30 days fuel price volatility
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const prices = await this.fuelPriceModel
      .find({
        date: { $gte: thirtyDaysAgo },
      })
      .sort({ date: 1 });

    if (prices.length < 2) return 0;

    // Calculate standard deviation
    const mean =
      prices.reduce((sum, p) => sum + p.pricePerLiter, 0) / prices.length;
    const variance =
      prices.reduce((sum, p) => sum + Math.pow(p.pricePerLiter - mean, 2), 0) /
      prices.length;
    const stdDev = Math.sqrt(variance);

    // Normalize to 0-1 scale (assuming max volatility of 50 LKR)
    const fuelVolatility = Math.min(stdDev / 50, 1);

    // Weight: α = 0.4 (fuel), β = 0.3 (fish price - from Market module), γ = 0.3 (weather)
    // For now, only fuel is calculated here
    const alpha = 0.4;
    const fesi = alpha * fuelVolatility;

    return fesi;
  }

  // ========== ENGINE 7: CARBON ==========
  calculateCarbon(
    fuelUsed: number,
    expectedCatch: number,
  ): { carbonKg: number; carbonPerKg: number } {
    const emissionFactor = 2.68; // kg CO2 per liter diesel
    const carbonKg = fuelUsed * emissionFactor;
    const carbonPerKg = expectedCatch > 0 ? carbonKg / expectedCatch : 0;

    return { carbonKg, carbonPerKg };
  }

  // ========== ENGINE 8: PROFITABILITY ==========
  async predictProfitability(
    expectedCatch: number,
    marketPrice: number,
    totalCost: number,
  ): Promise<{ probability: number; riskCategory: string }> {
    const mlResponse = await this.httpService
      .post("http://localhost:5000/predict-profitability", {
        expectedCatch,
        marketPrice,
        totalCost,
      })
      .toPromise();

    return mlResponse.data;
  }

  // ========== ENGINE 9: OPTIMIZATION ==========
  async generateOptimizations(baseScenario: any): Promise<string[]> {
    const recommendations = [];

    // Scenario 1: Reduce speed by 10%
    const lowerSpeed = baseScenario.speed * 0.9;
    const lowerSpeedFuel = await this.predictFuel(
      baseScenario.boatId,
      baseScenario.effectiveDistance,
      baseScenario.fishingHours,
      lowerSpeed,
      baseScenario.windSpeed,
      baseScenario.waveHeight,
    );
    if (lowerSpeedFuel.totalFuel < baseScenario.totalFuel) {
      const saving =
        (baseScenario.totalFuel - lowerSpeedFuel.totalFuel) *
        baseScenario.fuelPrice;
      recommendations.push(
        `Reduce speed to ${lowerSpeed.toFixed(1)} knots → Save LKR ${saving.toFixed(0)}`,
      );
    }

    // Scenario 2: Reduce crew by 1
    if (baseScenario.crewCount > 2) {
      const saving = baseScenario.crewCost / baseScenario.crewCount;
      recommendations.push(
        `Reduce crew by 1 person → Save LKR ${saving.toFixed(0)}`,
      );
    }

    // Scenario 3: Wait for better weather (if WSI > 0.3)
    if (baseScenario.wsi > 0.3) {
      recommendations.push(
        `Weather severity high (WSI=${baseScenario.wsi.toFixed(2)}). Consider delaying 6-12 hours.`,
      );
    }

    return recommendations.slice(0, 3); // Top 3
  }

  // ========== COMPLETE PREDICTION PIPELINE ==========
  async predictTripCost(dto: PredictCostDto): Promise<any> {
    // ENGINE 1: Distance
    const distance = await this.calculateEffectiveDistance(
      dto.startLat,
      dto.startLon,
      dto.endLat,
      dto.endLon,
      dto.boatId,
    );

    // ENGINE 2-4: Fuel
    const fuel = await this.predictFuel(
      dto.boatId,
      distance.effectiveDistance,
      dto.fishingHours,
      dto.speed,
      dto.windSpeed,
      dto.waveHeight,
    );

    // ENGINE 5: Cost
    const cost = await this.calculateOperationalCost(
      fuel.weatherAdjusted,
      dto.fuelPrice,
      dto.crewCount,
      dto.fishingHours + distance.effectiveDistance / dto.speed,
      dto.boatId,
      dto.mode,
    );

    // ENGINE 6: FESI
    const fesi = await this.calculateFESI();
    const riskAdjustedCost = cost.totalCost * (1 + fesi);

    // ENGINE 7: Carbon
    const carbon = this.calculateCarbon(
      fuel.weatherAdjusted,
      dto.expectedCatch,
    );

    // ENGINE 8: Profitability
    const profit = await this.predictProfitability(
      dto.expectedCatch,
      dto.marketPrice,
      riskAdjustedCost,
    );

    // ENGINE 9: Optimization
    const recommendations = await this.generateOptimizations({
      boatId: dto.boatId,
      effectiveDistance: distance.effectiveDistance,
      fishingHours: dto.fishingHours,
      speed: dto.speed,
      windSpeed: dto.windSpeed,
      waveHeight: dto.waveHeight,
      totalFuel: fuel.weatherAdjusted,
      fuelPrice: dto.fuelPrice,
      crewCount: dto.crewCount,
      crewCost: cost.crewCost,
      wsi: fuel.wsi,
    });

    return {
      distance: {
        base: distance.baseDistance,
        effective: distance.effectiveDistance,
        drf: distance.drf,
      },
      fuel: {
        travel: fuel.travelFuel,
        idle: fuel.idleFuel,
        total: fuel.totalFuel,
        weatherAdjusted: fuel.weatherAdjusted,
        wsi: fuel.wsi,
      },
      cost: {
        ...cost,
        fesiAdjusted: riskAdjustedCost,
        fesi,
      },
      carbon: {
        total: carbon.carbonKg,
        perKg: carbon.carbonPerKg,
      },
      profitability: {
        probability: profit.probability,
        riskCategory: profit.riskCategory,
      },
      recommendations,
    };
  }
}
```

---

### 4.3 Controller Endpoints

**File to Create:** `Backend/src/cost-engine/cost-engine.controller.ts`

```typescript
@Controller("cost-engine")
@UseGuards(JwtAuthGuard)
export class CostEngineController {
  constructor(private readonly costEngineService: CostEngineService) {}

  @Post("predict")
  async predictCost(@Body() dto: PredictCostDto, @Request() req) {
    return await this.costEngineService.predictTripCost(dto);
  }

  @Post("optimize")
  async optimizeTrip(@Body() dto: OptimizeTripDto) {
    return await this.costEngineService.generateOptimizations(dto);
  }
}
```

---

## 5️⃣ PYTHON ML MICROSERVICE ENHANCEMENT

### 5.1 Migrate from Flask to FastAPI

**Why:** FastAPI provides better async support, automatic validation, and cleaner API docs.

**File to Replace:** `model/cost_prediction/app.py`

**New Structure:**

```
model/cost_prediction/
├── main.py                      # FastAPI app (replaces app.py)
├── services/
│   ├── adaptive_fuel.py         # NEW - Adaptive fuel engine
│   ├── profitability.py         # NEW - Profitability ML
│   └── self_learning.py         # NEW - Coefficient updater
├── models/
│   ├── fuel_model_adaptive.pkl
│   ├── profitability_model.pkl
│   └── coefficient_history.json # Store learning updates
├── utils/
│   ├── fuel_equations.py        # a(t)v² + b(t)v + c(t)
│   └── degradation.py           # Engine degradation logic
├── train_adaptive.py            # NEW - Train adaptive model
├── train_profitability.py       # NEW - Train profitability model
└── requirements.txt
```

---

### 5.2 FastAPI Main Application

**File to Create:** `model/cost_prediction/main.py`

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
from typing import Optional

from services.adaptive_fuel import AdaptiveFuelEngine
from services.profitability import ProfitabilityEngine
from services.self_learning import SelfLearningEngine

app = FastAPI(title="DATCIE ML Microservice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize engines
fuel_engine = AdaptiveFuelEngine()
profit_engine = ProfitabilityEngine()
learning_engine = SelfLearningEngine()

# ========== PYDANTIC MODELS ==========

class AdaptiveFuelRequest(BaseModel):
    boatId: str
    aCoefficient: float
    bCoefficient: float
    cCoefficient: float
    speed: float
    travelTime: float
    windSpeed: float
    waveHeight: float
    fishingHours: float
    idleRate: float
    usageHours: float
    lifetimeHours: float

class ProfitabilityRequest(BaseModel):
    expectedCatch: float
    marketPrice: float
    totalCost: float

class UpdateCoefficientsRequest(BaseModel):
    boatId: str
    predictedFuel: float
    actualFuel: float
    currentA: float
    currentB: float
    currentC: float
    learningRate: Optional[float] = 0.01

# ========== ENDPOINTS ==========

@app.get("/")
def health_check():
    return {"status": "DATCIE ML Service Running", "version": "2.0"}

@app.post("/predict-fuel-adaptive")
def predict_fuel_adaptive(req: AdaptiveFuelRequest):
    try:
        result = fuel_engine.predict(req)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-profitability")
def predict_profitability(req: ProfitabilityRequest):
    try:
        result = profit_engine.predict(req)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/update-coefficients")
def update_coefficients(req: UpdateCoefficientsRequest):
    try:
        result = learning_engine.update(req)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
```

---

### 5.3 Adaptive Fuel Engine

**File to Create:** `model/cost_prediction/services/adaptive_fuel.py`

```python
import numpy as np
from typing import Dict

class AdaptiveFuelEngine:
    """
    Implements time-evolving fuel model:
    FuelRate(t) = a(t)v² + b(t)v + c(t)
    With engine degradation and weather adjustments
    """

    def predict(self, req) -> Dict:
        # ENGINE DEGRADATION
        efficiency_loss = req.usageHours / req.lifetimeHours
        a_t = req.aCoefficient * (1 + efficiency_loss)
        b_t = req.bCoefficient * (1 + efficiency_loss * 0.5)
        c_t = req.cCoefficient * (1 + efficiency_loss * 0.3)

        # BASE FUEL RATE (L/hour)
        fuel_rate = a_t * (req.speed ** 2) + b_t * req.speed + c_t

        # TRAVEL FUEL
        travel_fuel = fuel_rate * req.travelTime

        # IDLE FUEL (during fishing)
        idle_fuel = req.idleRate * req.fishingHours

        # TOTAL BEFORE WEATHER
        total_fuel = travel_fuel + idle_fuel

        # WEATHER SEVERITY INDEX (WSI)
        wsi = self._calculate_wsi(req.windSpeed, req.waveHeight)

        # WEATHER-ADJUSTED FUEL
        weather_adjusted = total_fuel * (1 + wsi)

        return {
            "travelFuel": round(travel_fuel, 2),
            "idleFuel": round(idle_fuel, 2),
            "totalFuel": round(total_fuel, 2),
            "weatherAdjusted": round(weather_adjusted, 2),
            "wsi": round(wsi, 4),
            "coefficients": {
                "a": round(a_t, 6),
                "b": round(b_t, 6),
                "c": round(c_t, 6),
            }
        }

    def _calculate_wsi(self, wind_speed: float, wave_height: float) -> float:
        """
        Weather Severity Index
        WSI = w1(Wind) + w2(Wave) + w3(Rain)
        For now, only wind and wave (rain data not available)
        """
        # Normalize wind (0-50 km/h → 0-1)
        wind_norm = min(wind_speed / 50, 1)

        # Normalize wave (0-5m → 0-1)
        wave_norm = min(wave_height / 5, 1)

        # Weights
        w1 = 0.4  # Wind
        w2 = 0.6  # Wave (more important for fuel consumption)

        wsi = w1 * wind_norm + w2 * wave_norm

        return wsi
```

---

### 5.4 Profitability Engine

**File to Create:** `model/cost_prediction/services/profitability.py`

```python
import joblib
import numpy as np
from pathlib import Path

class ProfitabilityEngine:
    """
    Uses RandomForest to predict P(Profit > 0)
    """

    def __init__(self):
        model_path = Path(__file__).parent.parent / "models" / "profitability_model.pkl"
        try:
            self.model = joblib.load(model_path)
            self.trained = True
        except:
            self.trained = False
            print("⚠ Profitability model not trained yet")

    def predict(self, req) -> dict:
        expected_revenue = req.expectedCatch * req.marketPrice
        net_profit = expected_revenue - req.totalCost

        if not self.trained:
            # Fallback logic before training
            probability = 1.0 if net_profit > 0 else 0.3
            risk_category = self._categorize_risk(probability)

            return {
                "probability": round(probability, 2),
                "riskCategory": risk_category,
                "expectedRevenue": round(expected_revenue, 2),
                "netProfit": round(net_profit, 2),
                "trained": False,
            }

        # Use ML model
        features = np.array([[
            req.expectedCatch,
            req.marketPrice,
            req.totalCost,
            expected_revenue,
            net_profit,
        ]])

        # Get probability of class 1 (profitable)
        probability = self.model.predict_proba(features)[0][1]
        risk_category = self._categorize_risk(probability)

        return {
            "probability": round(probability, 2),
            "riskCategory": risk_category,
            "expectedRevenue": round(expected_revenue, 2),
            "netProfit": round(net_profit, 2),
            "trained": True,
        }

    def _categorize_risk(self, probability: float) -> str:
        if probability >= 0.7:
            return "Low"
        elif probability >= 0.4:
            return "Medium"
        else:
            return "High"
```

---

### 5.5 Self-Learning Engine

**File to Create:** `model/cost_prediction/services/self_learning.py`

```python
import json
from pathlib import Path
from datetime import datetime

class SelfLearningEngine:
    """
    Updates fuel coefficients based on prediction error
    a_new = a_old + η × Error
    """

    def __init__(self):
        self.history_file = Path(__file__).parent.parent / "models" / "coefficient_history.json"

    def update(self, req) -> dict:
        error = req.actualFuel - req.predictedFuel

        # Update rule: gradient descent style
        a_new = req.currentA + req.learningRate * error * 0.01  # Small fraction
        b_new = req.currentB + req.learningRate * error * 0.01
        c_new = req.currentC + req.learningRate * error * 0.001

        # Prevent coefficients from becoming negative or too large
        a_new = max(0.0001, min(a_new, 0.1))
        b_new = max(0.01, min(b_new, 1.0))
        c_new = max(0.5, min(c_new, 10.0))

        # Log update
        self._log_update(req.boatId, {
            "timestamp": datetime.utcnow().isoformat(),
            "predictedFuel": req.predictedFuel,
            "actualFuel": req.actualFuel,
            "error": error,
            "before": {
                "a": req.currentA,
                "b": req.currentB,
                "c": req.currentC,
            },
            "after": {
                "a": a_new,
                "b": b_new,
                "c": c_new,
            },
        })

        return {
            "aCoefficient": round(a_new, 6),
            "bCoefficient": round(b_new, 6),
            "cCoefficient": round(c_new, 6),
            "error": round(error, 2),
            "errorPercentage": round((error / req.actualFuel) * 100, 2) if req.actualFuel > 0 else 0,
        }

    def _log_update(self, boat_id: str, update_data: dict):
        if self.history_file.exists():
            with open(self.history_file, 'r') as f:
                history = json.load(f)
        else:
            history = {}

        if boat_id not in history:
            history[boat_id] = []

        history[boat_id].append(update_data)

        with open(self.history_file, 'w') as f:
            json.dump(history, f, indent=2)
```

---

### 5.6 Updated Requirements

**File to Update:** `model/cost_prediction/requirements.txt`

```txt
fastapi==0.115.0
uvicorn==0.32.1
pydantic==2.10.3
scikit-learn==1.5.2
joblib==1.4.2
numpy==2.2.1
pandas==2.2.3
python-multipart==0.0.18
```

---

## 6️⃣ MOBILE FRONTEND IMPLEMENTATION

### 6.1 Enhanced Trip Store

**File to Extend:** `mobile/stores/tripStore.ts`

**New State and Actions:**

```typescript
interface TripState {
  // ========== EXISTING ==========
  trips: Trip[];
  currentTrip: Trip | null;
  stats: TripStats | null;
  loading: boolean;
  error: string | null;

  // ========== NEW: PREDICTION STATE ==========
  prediction: TripPrediction | null;
  optimizations: string[] | null;
  carbonScore: CarbonScore | null;
  profitability: ProfitabilityScore | null;

  // ========== NEW: ACTIONS ==========
  setPrediction: (prediction: TripPrediction) => void;
  setOptimizations: (optimizations: string[]) => void;
  setCarbonScore: (carbon: CarbonScore) => void;
  setProfitability: (profit: ProfitabilityScore) => void;
  clearPrediction: () => void;

  // ========== NEW: API CALLS ==========
  predictTripCost: (data: PredictTripData) => Promise<void>;
  logActualTrip: (tripId: string, actual: ActualTripData) => Promise<void>;
}

interface TripPrediction {
  distance: {
    base: number;
    effective: number;
    drf: number;
  };
  fuel: {
    travel: number;
    idle: number;
    total: number;
    weatherAdjusted: number;
    wsi: number;
  };
  cost: {
    fuelCost: number;
    crewCost: number;
    iceCost: number;
    gearWear: number;
    maintenance: number;
    portFee: number;
    depreciation: number;
    totalCost: number;
    fesiAdjusted: number;
    fesi: number;
  };
}

interface CarbonScore {
  total: number;
  perKg: number;
  rating: "Excellent" | "Good" | "Fair" | "Poor";
}

interface ProfitabilityScore {
  probability: number;
  riskCategory: "Low" | "Medium" | "High";
  expectedRevenue: number;
  netProfit: number;
}

const useTripStore = create<TripState>((set, get) => ({
  // ... existing state ...

  prediction: null,
  optimizations: null,
  carbonScore: null,
  profitability: null,

  setPrediction: (prediction) => set({ prediction }),
  setOptimizations: (optimizations) => set({ optimizations }),
  setCarbonScore: (carbonScore) => set({ carbonScore }),
  setProfitability: (profitability) => set({ profitability }),
  clearPrediction: () =>
    set({
      prediction: null,
      optimizations: null,
      carbonScore: null,
      profitability: null,
    }),

  predictTripCost: async (data) => {
    try {
      set({ loading: true, error: null });

      const response = await apiFetch("/cost-engine/predict", {
        method: "POST",
        body: JSON.stringify(data),
      });

      set({
        prediction: {
          distance: response.distance,
          fuel: response.fuel,
          cost: response.cost,
        },
        carbonScore: {
          total: response.carbon.total,
          perKg: response.carbon.perKg,
          rating: getCarbonRating(response.carbon.perKg),
        },
        profitability: response.profitability,
        optimizations: response.recommendations,
        loading: false,
      });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  logActualTrip: async (tripId, actual) => {
    try {
      await apiFetch(`/trips/${tripId}/log-actual`, {
        method: "POST",
        body: JSON.stringify(actual),
      });

      // Refresh trip list
      // ... fetch updated trips ...
    } catch (error) {
      set({ error: error.message });
    }
  },
}));

function getCarbonRating(
  carbonPerKg: number,
): "Excellent" | "Good" | "Fair" | "Poor" {
  if (carbonPerKg < 0.5) return "Excellent";
  if (carbonPerKg < 1.0) return "Good";
  if (carbonPerKg < 2.0) return "Fair";
  return "Poor";
}

export default useTripStore;
```

---

### 6.2 Screen Flow Architecture

**Recommended Navigation Structure:**

```
mobile/app/(root)/(tabs)/fishtripcost/
├── index.tsx                           # Dashboard (Overview)
├── plan-trip.tsx                       # NEW - Trip Planning Form
├── prediction-result.tsx               # NEW - Prediction Display
├── optimization-suggestions.tsx        # NEW - Optimization View
├── trip-history.tsx                    # Trip List
├── trip-details.tsx                    # Single Trip View
└── log-actual.tsx                      # NEW - Post-Trip Logging
```

---

### 6.3 Trip Planning Screen

**File to Create:** `mobile/app/(root)/(tabs)/fishtripcost/plan-trip.tsx`

**Key Sections:**

```tsx
export default function PlanTripScreen() {
  const { selectedZones } = useFishingZoneStore();
  const { predictTripCost, prediction, loading } = useTripStore();
  const [boatId, setBoatId] = useState('');
  const [crewCount, setCrewCount] = useState('3');
  const [fishingHours, setFishingHours] = useState('8');
  const [speed, setSpeed] = useState('10'); // knots
  const [fuelPrice, setFuelPrice] = useState('350'); // LKR/L

  // Auto-calculate distance from zones
  const totalDistance = selectedZones.reduce(...);

  const handlePredict = async () => {
    await predictTripCost({
      boatId,
      startLat: selectedZones[0].lat,
      startLon: selectedZones[0].lon,
      endLat: selectedZones[selectedZones.length - 1].lat,
      endLon: selectedZones[selectedZones.length - 1].lon,
      crewCount: parseInt(crewCount),
      fishingHours: parseFloat(fishingHours),
      speed: parseFloat(speed),
      windSpeed: 15, // From weather API
      waveHeight: 1.2, // From weather API
      fuelPrice: parseFloat(fuelPrice),
      expectedCatch: 100, // From Fish Zone module
      marketPrice: 500, // From Market module
      mode: 'island',
    });

    router.push('/fishtripcost/prediction-result');
  };

  return (
    <ScrollView>
      {/* Boat Selection */}
      {/* Crew Input */}
      {/* Fishing Hours */}
      {/* Speed Slider */}
      {/* Fuel Price (Island: auto, International: manual) */}

      <CustomButton
        title="Calculate Trip Cost"
        onPress={handlePredict}
        loading={loading}
      />
    </ScrollView>
  );
}
```

---

### 6.4 Prediction Result Screen

**File to Create:** `mobile/app/(root)/(tabs)/fishtripcost/prediction-result.tsx`

**Sections:**

```tsx
export default function PredictionResultScreen() {
  const { prediction, carbonScore, profitability } = useTripStore();

  if (!prediction) return <Text>No prediction</Text>;

  return (
    <ScrollView>
      {/* ========== DISTANCE CARD ========== */}
      <Card>
        <Text>Base Distance: {prediction.distance.base} km</Text>
        <Text>Effective Distance: {prediction.distance.effective} km</Text>
        <Text>
          Route Deviation: {(prediction.distance.drf * 100).toFixed(1)}%
        </Text>
      </Card>

      {/* ========== FUEL CARD ========== */}
      <Card>
        <Text>Travel Fuel: {prediction.fuel.travel} L</Text>
        <Text>Idle Fuel: {prediction.fuel.idle} L</Text>
        <Text>Weather Adjusted: {prediction.fuel.weatherAdjusted} L</Text>
        <WeatherSeverityBadge wsi={prediction.fuel.wsi} />
      </Card>

      {/* ========== COST BREAKDOWN ========== */}
      <Card>
        <CostBreakdownChart data={prediction.cost} />
        <Text style={styles.total}>
          Total: LKR {prediction.cost.totalCost.toFixed(0)}
        </Text>
        <Text style={styles.fesi}>
          Risk Adjusted: LKR {prediction.cost.fesiAdjusted.toFixed(0)}
        </Text>
      </Card>

      {/* ========== CARBON SCORE ========== */}
      <Card>
        <CarbonGauge
          value={carbonScore.total}
          perKg={carbonScore.perKg}
          rating={carbonScore.rating}
        />
      </Card>

      {/* ========== PROFITABILITY ========== */}
      <Card>
        <ProfitabilityCircle
          probability={profitability.probability}
          riskCategory={profitability.riskCategory}
        />
        <Text>Expected Profit: LKR {profitability.netProfit.toFixed(0)}</Text>
      </Card>

      {/* ========== ACTIONS ========== */}
      <CustomButton
        title="See Optimization Suggestions"
        onPress={() => router.push("/fishtripcost/optimization-suggestions")}
      />

      <CustomButton
        title="Confirm & Save Trip Plan"
        onPress={handleSaveTrip}
        bgVariant="success"
      />
    </ScrollView>
  );
}
```

---

### 6.5 Optimization Suggestions Screen

**File to Create:** `mobile/app/(root)/(tabs)/fishtripcost/optimization-suggestions.tsx`

```tsx
export default function OptimizationScreen() {
  const { optimizations } = useTripStore();

  return (
    <View>
      <Text style={styles.header}>Save Money with These Suggestions</Text>

      {optimizations?.map((suggestion, index) => (
        <OptimizationCard key={index}>
          <Icon name="lightbulb" />
          <Text>{suggestion}</Text>
        </OptimizationCard>
      ))}

      <CustomButton
        title="Apply Suggestions & Recalculate"
        onPress={handleApplyOptimization}
      />
    </View>
  );
}
```

---

### 6.6 Post-Trip Logging Screen

**File to Create:** `mobile/app/(root)/(tabs)/fishtripcost/log-actual.tsx`

**Purpose:** User enters actual fuel and catch after trip for self-learning.

```tsx
export default function LogActualScreen() {
  const { route } = useLocalSearchParams();
  const tripId = route.params.tripId;

  const [actualFuel, setActualFuel] = useState("");
  const [actualCatch, setActualCatch] = useState("");

  const { logActualTrip } = useTripStore();

  const handleSubmit = async () => {
    await logActualTrip(tripId, {
      actualFuelLiters: parseFloat(actualFuel),
      actualCatchKg: parseFloat(actualCatch),
    });

    Alert.alert(
      "Learning Update",
      "Your boat's fuel model has been updated based on this trip!",
      [{ text: "OK", onPress: () => router.back() }],
    );
  };

  return (
    <View>
      <Text>How much fuel did you actually use?</Text>
      <InputField
        label="Actual Fuel (Liters)"
        value={actualFuel}
        onChangeText={setActualFuel}
        keyboardType="numeric"
      />

      <Text>How much did you catch?</Text>
      <InputField
        label="Actual Catch (Kg)"
        value={actualCatch}
        onChangeText={setActualCatch}
        keyboardType="numeric"
      />

      <CustomButton
        title="Submit & Update Model"
        onPress={handleSubmit}
        bgVariant="success"
      />
    </View>
  );
}
```

---

## 7️⃣ MATHEMATICAL FUNCTIONS IMPLEMENTATION

### 7.1 Haversine Distance

**File to Create:** `Backend/src/common/utils/haversine.util.ts`

```typescript
/**
 * Calculate great circle distance between two lat/lon points
 * d = 2r × arcsin(√[sin²(Δφ/2) + cos(φ1)cos(φ2)sin²(Δλ/2)])
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.asin(Math.sqrt(a));

  return R * c;
}
```

---

### 7.2 Weather Severity Index

**File to Create:** `Backend/src/common/utils/wsi.util.ts`

```typescript
/**
 * Weather Severity Index
 * WSI = w1(Wind) + w2(Wave) + w3(Rain)
 */
export interface WeatherData {
  windSpeed: number; // km/h
  waveHeight: number; // meters
  precipitation?: number; // mm/h (optional)
}

export function calculateWSI(weather: WeatherData): number {
  // Normalize wind (0-50 km/h → 0-1)
  const windNorm = Math.min(weather.windSpeed / 50, 1);

  // Normalize wave (0-5m → 0-1)
  const waveNorm = Math.min(weather.waveHeight / 5, 1);

  // Normalize rain (0-10mm/h → 0-1)
  const rainNorm = weather.precipitation
    ? Math.min(weather.precipitation / 10, 1)
    : 0;

  // Weights
  const w1 = 0.3; // Wind
  const w2 = 0.5; // Wave (most important)
  const w3 = 0.2; // Rain

  return w1 * windNorm + w2 * waveNorm + w3 * rainNorm;
}
```

---

### 7.3 FESI Calculation

**File to Create:** `Backend/src/common/utils/fesi.util.ts`

```typescript
/**
 * Fisheries Economic Stress Index
 * FESI = α(FuelVolatility) + β(FishPriceFluctuation) + γ(WeatherUncertainty)
 */

export interface FESIInputs {
  fuelPrices: number[]; // Last 30 days
  fishPrices?: number[]; // Optional - from Market module
  weatherWSI: number;
}

export function calculateFESI(inputs: FESIInputs): number {
  // α: Fuel volatility
  const fuelVolatility = calculateStdDevNormalized(inputs.fuelPrices, 50);

  // β: Fish price fluctuation (if available)
  const fishVolatility = inputs.fishPrices
    ? calculateStdDevNormalized(inputs.fishPrices, 200)
    : 0;

  // γ: Weather uncertainty (use WSI as proxy)
  const weatherUncertainty = inputs.weatherWSI;

  // Weights
  const alpha = 0.4;
  const beta = 0.3;
  const gamma = 0.3;

  return (
    alpha * fuelVolatility + beta * fishVolatility + gamma * weatherUncertainty
  );
}

function calculateStdDevNormalized(values: number[], maxValue: number): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return Math.min(stdDev / maxValue, 1);
}
```

---

## 8️⃣ SELF-LEARNING ARCHITECTURE

### 8.1 Learning Workflow

```
User completes trip
    ↓
Mobile: Navigate to "Log Actual Data" screen
    ↓
User enters:
  - Actual Fuel Used
  - Actual Catch
    ↓
Mobile → Backend: POST /trips/:id/log-actual
    ↓
Backend calculates:
  - Fuel Error = Actual - Predicted
  - Catch Error = Actual - Expected
    ↓
Backend → Python: POST /update-coefficients
    ↓
Python Self-Learning Engine:
  - a_new = a_old + η × Error
  - b_new = b_old + η × Error
  - c_new = c_old + η × Error
    ↓
Python returns new coefficients
    ↓
Backend updates Boat document in MongoDB
    ↓
Backend saves to trip_coefficients history
    ↓
Mobile shows: "Model Updated! Your next prediction will be more accurate."
```

---

### 8.2 Backend Learning Endpoint

**File to Add to:** `Backend/src/trips/trips.controller.ts`

```typescript
@Post(':id/log-actual')
@UseGuards(JwtAuthGuard)
async logActualData(
  @Param('id') tripId: string,
  @Body() dto: LogActualDto,
  @Request() req,
) {
  const trip = await this.tripsService.findOne(tripId, req.user.userId, false);

  // Update trip with actual data
  trip.actualFuelLiters = dto.actualFuelLiters;
  trip.actualCatchKg = dto.actualCatchKg;
  trip.fuelPredictionError = dto.actualFuelLiters - trip.predictedFuelLiters;
  await trip.save();

  // Trigger self-learning
  const boat = await this.boatModel.findById(trip.boatId);

  const mlResponse = await this.httpService.post('http://localhost:5000/update-coefficients', {
    boatId: trip.boatId,
    predictedFuel: trip.predictedFuelLiters,
    actualFuel: dto.actualFuelLiters,
    currentA: boat.aCoefficient,
    currentB: boat.bCoefficient,
    currentC: boat.cCoefficient,
    learningRate: 0.01,
  }).toPromise();

  // Update boat coefficients
  boat.aCoefficient = mlResponse.data.aCoefficient;
  boat.bCoefficient = mlResponse.data.bCoefficient;
  boat.cCoefficient = mlResponse.data.cCoefficient;
  boat.tripCount += 1;
  await boat.save();

  // Save to history
  await this.tripCoefficientModel.create({
    boatId: trip.boatId,
    tripId: trip._id,
    aBefore: mlResponse.data.before.a,
    bBefore: mlResponse.data.before.b,
    cBefore: mlResponse.data.before.c,
    aAfter: mlResponse.data.aCoefficient,
    bAfter: mlResponse.data.bCoefficient,
    cAfter: mlResponse.data.cCoefficient,
    predictionError: trip.fuelPredictionError,
    learningRate: 0.01,
    updatedAt: new Date(),
  });

  return {
    message: 'Model updated successfully',
    errorPercentage: mlResponse.data.errorPercentage,
    newCoefficients: {
      a: mlResponse.data.aCoefficient,
      b: mlResponse.data.bCoefficient,
      c: mlResponse.data.cCoefficient,
    },
  };
}
```

---

## 9️⃣ ISLAND VS INTERNATIONAL MODE

### 9.1 Island Mode (Sri Lanka Optimized)

**Preloaded Settings:**

```typescript
const ISLAND_MODE_CONFIG = {
  // Monsoon multipliers by month
  monsoonMultipliers: {
    1: 1.2, // January - Southwest monsoon
    2: 1.15,
    3: 1.1,
    4: 1.0,
    5: 1.3, // May-September - Southwest monsoon
    6: 1.4,
    7: 1.4,
    8: 1.3,
    9: 1.2,
    10: 1.15, // October-December - Northeast monsoon
    11: 1.2,
    12: 1.25,
  },

  // Fuel subsidy (if applicable)
  fuelSubsidyRate: 0.15, // 15% subsidy

  // Default crew wage (LKR/day)
  defaultCrewWage: 2000,

  // Lagoon vs Deep Sea
  lagoonMode: false, // Toggle in UI
  lagoonMultiplier: 0.7, // 30% less fuel in lagoon

  // Port fees (LKR)
  portFees: {
    negombo: 500,
    colombo: 800,
    galle: 600,
    trincomalee: 700,
  },
};
```

**Backend Implementation:**

```typescript
// In cost calculation
if (mode === "island") {
  const month = new Date().getMonth() + 1;
  const monsoonFactor = ISLAND_MODE_CONFIG.monsoonMultipliers[month];
  fuelAdjusted *= monsoonFactor;

  if (boat.islandConfig.lagoonMode) {
    fuelAdjusted *= ISLAND_MODE_CONFIG.lagoonMultiplier;
  }

  fuelPrice *= 1 - ISLAND_MODE_CONFIG.fuelSubsidyRate;
}
```

---

### 9.2 International Mode

**User Configurable:**

- Fuel price (no subsidy)
- Crew wage (varies by country)
- Emission factor (different diesel types)
- Currency

**No preloaded presets. Fully flexible.**

---

## 🔟 NAVIGATION FLOW DESIGN

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                     DASHBOARD SCREEN                         │
│  • Last trip summary                                        │
│  • Average cost per trip                                    │
│  • Carbon efficiency trend                                  │
│  • Profit success rate                                      │
│  [Button: Plan New Trip]                                    │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   PLAN TRIP SCREEN                          │
│  1. Select Boat (dropdown)                                  │
│  2. Select Fishing Zones (from Fish Zone module)            │
│     → Auto-calculates distance                              │
│  3. Fishing Hours (slider)                                  │
│  4. Crew Count (stepper)                                    │
│  5. Speed (slider with fuel preview)                        │
│  6. Weather (auto-fetch or manual)                          │
│  7. Fuel Price (Island: auto, International: manual)        │
│  [Button: Calculate Trip Cost]                              │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│               PREDICTION RESULT SCREEN                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Distance: 45.2 km (Effective: 47.5 km)              │    │
│  │ Route Deviation: 5%                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Fuel Estimate: 85 L (Weather Adjusted: 92 L)       │    │
│  │ Weather Severity: Medium (WSI: 0.42)               │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Total Cost: LKR 48,500                              │    │
│  │ Risk Adjusted: LKR 51,200 (FESI: 0.055)           │    │
│  │ [Show Cost Breakdown]                               │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Carbon Emission: 246 kg CO2                         │    │
│  │ Per Kg Catch: 2.46 kg CO2/kg                        │    │
│  │ Rating: Fair                                        │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Profitability: 78% chance of profit                │    │
│  │ Risk: Low                                           │    │
│  │ Expected Profit: LKR 8,800                          │    │
│  └─────────────────────────────────────────────────────┘    │
│  [Button: See Optimization Suggestions]                     │
│  [Button: Confirm & Save Trip]                              │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│            OPTIMIZATION SUGGESTIONS SCREEN                  │
│  💡 Reduce speed to 9 knots → Save LKR 3,200               │
│  💡 Delay departure 6 hours (better weather) → Save 8%     │
│  💡 Reduce crew by 1 → Save LKR 2,000                      │
│  [Button: Apply & Recalculate]                              │
│  [Button: Proceed with Original Plan]                       │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                 TRIP SAVED                                  │
│  Trip plan saved! Good luck with your trip.                 │
│  [Button: View Trip History]                                │
│  [Button: Back to Dashboard]                                │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
                   (User goes on trip)
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              LOG ACTUAL DATA SCREEN                         │
│  Welcome back! Help improve predictions:                    │
│  • Actual Fuel Used: [___] L                                │
│  • Actual Catch: [___] Kg                                   │
│  [Button: Submit & Train Model]                             │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  LEARNING UPDATE                            │
│  ✅ Model Updated!                                          │
│  Your boat's fuel model is now 3% more accurate.            │
│  Trip #12 completed. Keep logging for better predictions!   │
│  [Button: Done]                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣1️⃣ INTEGRATION POINTS

### 11.1 With Fish Zone Module (Other Member)

**Your Input Needed:**

- Expected catch (kg) based on selected zones

**API Contract:**

```typescript
// You call their endpoint
GET /fish-zones/predict-catch
Request: {
  zones: [{ lat, lon, radius }],
  season: "monsoon" | "off-season",
  boatType: string
}

Response: {
  expectedCatchKg: number,
  confidence: number,
  topSpecies: string[]
}
```

**Your Implementation:**

```typescript
// In mobile TripPlanner
const expectedCatch = await fetch("/fish-zones/predict-catch", {
  zones: selectedZones,
  season: getCurrentSeason(),
  boatType: selectedBoat.type,
});

// Use their prediction in your cost calculation
await predictTripCost({
  ...otherData,
  expectedCatch: expectedCatch.expectedCatchKg,
});
```

---

### 11.2 With Market Price Module (Other Member)

**Your Input Needed:**

- Current market price per kg for profitability

**API Contract:**

```typescript
// You call their endpoint
GET /market/price-prediction
Request: {
  fishSpecies: string[],
  date: Date,
  location: string
}

Response: {
  averagePricePerKg: number,
  volatility: number,
  priceHistory: number[]
}
```

**Your Implementation:**

```typescript
const marketData = await fetch("/market/price-prediction", {
  fishSpecies: expectedCatch.topSpecies,
  date: tripDate,
  location: "island",
});

// Use in profitability calculation
const profitability = await predictProfitability({
  expectedCatch: expectedCatch.expectedCatchKg,
  marketPrice: marketData.averagePricePerKg,
  totalCost: costPrediction.totalCost,
});
```

**For FESI Calculation:**

```typescript
// Use their price history for FESI (β component)
const fesi = calculateFESI({
  fuelPrices: fuelPriceHistory,
  fishPrices: marketData.priceHistory, // From their module
  weatherWSI: wsi,
});
```

---

### 11.3 With Fish Quality Module (Other Member)

**Optional Integration:**

- Quality score could adjust market price
- Premium quality → higher revenue

**Your Use:**

```typescript
const qualityFactor = qualityScore > 0.8 ? 1.2 : 1.0;
const adjustedMarketPrice = baseMarketPrice * qualityFactor;
```

---

## 1️⃣2️⃣ RESEARCH POSITIONING

### 12.1 Novelty Assessment

**Individual Components (Not Novel):**

- ❌ Haversine distance → Standard formula
- ❌ Quadratic fuel model → Known approach
- ❌ RandomForest ML → Standard tool
- ❌ Carbon calculation → Standard emission factor

**Your Novelty (Applied Innovation):**

- ✅ **Time-Evolving Coefficients:** a(t), b(t), c(t) adapt per boat
- ✅ **Self-Learning Without IoT:** User-logged data drives learning
- ✅ **Fisheries Economic Stress Index (FESI):** Custom composite metric
- ✅ **Carbon-Per-Catch Sustainability:** Not just total emissions
- ✅ **Integrated Multi-Factor Cost Intelligence:** All engines combined
- ✅ **Island Mode Optimization:** Sri Lanka-specific calibration
- ✅ **Profitability Probability:** Not just cost, but profit likelihood
- ✅ **Route Deviation Learning:** DRF improves over time

---

### 12.2 Research Paper Structure

**Title:**
"Adaptive Multi-Factor Trip Cost and Profitability Intelligence Framework for Small-Scale Fisheries Using Self-Calibrating User-Logged Data"

**Abstract:**

```
Small-scale fisheries face economic uncertainty due to volatile fuel costs,
weather variability, and unpredictable catch. This paper presents DATCIE
(Dynamic Adaptive Trip Cost Intelligence Engine), a software-only decision
support system that combines time-evolving fuel consumption modeling,
weather-adjusted cost prediction, economic stress indexing, and carbon
efficiency scoring. Unlike traditional approaches requiring IoT sensors,
DATCIE employs user-logged post-trip data for continuous self-learning,
enabling personalized boat-specific models. Evaluated with N trips across
M boats, the system achieved X% fuel prediction accuracy and demonstrated
Y% cost optimization potential. The framework is scalable for both island
(Sri Lanka) and international contexts, offering a low-cost, high-impact
tool for sustainable fisheries management.
```

**Sections:**

1. **Introduction**
   - Problem: Fuel cost uncertainty in small-scale fisheries
   - Gap: Existing tools lack adaptability and personalization
   - Contribution: Self-learning, multi-factor framework

2. **Related Work**
   - Fuel consumption models in marine transport
   - Cost prediction in fisheries
   - Carbon footprint analysis
   - ML in fisheries management
   - _Your Differentiation:_ None combine all factors with self-learning

3. **Methodology**
   - System Architecture (3-tier: Mobile, Backend, ML)
   - Distance Engine (Haversine + DRF)
   - Adaptive Fuel Model (a(t)v² + b(t)v + c(t))
   - Weather Severity Index (WSI)
   - Economic Stress Index (FESI)
   - Carbon Efficiency
   - Profitability Probability
   - Self-Learning Algorithm
   - Optimization Engine

4. **Implementation**
   - Tech Stack
   - Database Schema
   - ML Models (RandomForest)
   - Island vs International Mode

5. **Evaluation**
   - Dataset: N trips, M boats
   - Metrics:
     - Fuel MAE, RMSE
     - Cost prediction accuracy
     - Profitability classification F1-score
     - Learning convergence rate
     - User feedback (SUS score)
   - Baselines:
     - Static fuel model
     - Simple linear regression
     - No weather adjustment

6. **Results**
   - Adaptive model outperforms static by X%
   - Self-learning reduces error by Y% after 20 trips
   - Carbon-per-kg metric reveals Z insights
   - Optimization suggestions save ₨W per trip

7. **Discussion**
   - Practical Impact
   - Limitations (requires user logging)
   - Future Work (IoT integration, real-time weather)

8. **Conclusion**
   - Successful applied research
   - Software-only, scalable, sustainable

---

### 12.3 Key Metrics for Evaluation

**When You Have Real Data:**

```python
# Fuel Prediction Accuracy
MAE = mean_absolute_error(actual_fuel, predicted_fuel)
RMSE = sqrt(mean_squared_error(actual_fuel, predicted_fuel))
R2 = r2_score(actual_fuel, predicted_fuel)

# Cost Prediction
Cost_MAE = mean_absolute_error(actual_cost, predicted_cost)

# Profitability Classification
Accuracy = (TP + TN) / (TP + TN + FP + FN)
F1_Score = 2 * (Precision * Recall) / (Precision + Recall)

# Learning Convergence
Error_Reduction = (Initial_MAE - Final_MAE) / Initial_MAE * 100

# Optimization Impact
Savings = sum(actual_cost_without_optimization - cost_with_suggestions)
```

---

## 📌 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Weeks 1-2)

- ✅ Extend Trip schema
- ✅ Create Boat schema
- ✅ Implement Haversine distance
- ✅ Build basic Cost Engine service
- ✅ Set up FastAPI ML service
- ✅ Create mobile prediction flow

### Phase 2: Advanced Engines (Weeks 3-4)

- ✅ Implement WSI calculation
- ✅ Implement FESI calculation
- ✅ Build adaptive fuel engine (Python)
- ✅ Add carbon calculation
- ✅ Add profitability ML model
- ✅ Build optimization engine

### Phase 3: Self-Learning (Week 5)

- ✅ Create log-actual endpoint
- ✅ Build self-learning Python service
- ✅ Implement coefficient update logic
- ✅ Add learning history tracking
- ✅ Create mobile logging screen

### Phase 4: Island Mode (Week 6)

- ✅ Add monsoon multipliers
- ✅ Implement lagoon mode
- ✅ Add fuel subsidy logic
- ✅ Preload Sri Lankan presets

### Phase 5: UI/UX (Week 7)

- ✅ Build dashboard screen
- ✅ Build prediction result screen
- ✅ Build optimization screen
- ✅ Add charts and visualizations
- ✅ Polish mobile UI

### Phase 6: Integration (Week 8)

- ✅ Connect with Fish Zone module
- ✅ Connect with Market module
- ✅ Test end-to-end flow
- ✅ Handle edge cases

### Phase 7: Testing & Data Collection (Weeks 9-10)

- ✅ Collect real trip data
- ✅ Test self-learning convergence
- ✅ Evaluate prediction accuracy
- ✅ User testing with fishermen

### Phase 8: Research Paper (Weeks 11-12)

- ✅ Write methodology
- ✅ Analyze results
- ✅ Create visualizations
- ✅ Submit to conference/journal

---

## 📂 FILE CREATION CHECKLIST

### Backend Files to Create

```
✅ Backend/src/schemas/boat.schema.ts
✅ Backend/src/schemas/trip-coefficient.schema.ts
✅ Backend/src/schemas/fuel-price.schema.ts
✅ Backend/src/cost-engine/cost-engine.module.ts
✅ Backend/src/cost-engine/cost-engine.controller.ts
✅ Backend/src/cost-engine/cost-engine.service.ts
✅ Backend/src/cost-engine/dto/predict-cost.dto.ts
✅ Backend/src/cost-engine/dto/log-actual.dto.ts
✅ Backend/src/boat/boat.module.ts
✅ Backend/src/boat/boat.controller.ts
✅ Backend/src/boat/boat.service.ts
✅ Backend/src/common/utils/haversine.util.ts
✅ Backend/src/common/utils/wsi.util.ts
✅ Backend/src/common/utils/fesi.util.ts
```

### Backend Files to Extend

```
✅ Backend/src/schemas/trip.schema.ts (add new fields)
✅ Backend/src/trips/trips.controller.ts (add log-actual endpoint)
✅ Backend/src/trips/trips.service.ts (extend methods)
✅ Backend/src/app.module.ts (import new modules)
```

### Python Files to Create

```
✅ model/cost_prediction/main.py
✅ model/cost_prediction/services/adaptive_fuel.py
✅ model/cost_prediction/services/profitability.py
✅ model/cost_prediction/services/self_learning.py
✅ model/cost_prediction/utils/fuel_equations.py
✅ model/cost_prediction/train_adaptive.py
✅ model/cost_prediction/train_profitability.py
```

### Python Files to Update

```
✅ model/cost_prediction/requirements.txt
```

### Mobile Files to Create

```
✅ mobile/app/(root)/(tabs)/fishtripcost/plan-trip.tsx
✅ mobile/app/(root)/(tabs)/fishtripcost/prediction-result.tsx
✅ mobile/app/(root)/(tabs)/fishtripcost/optimization-suggestions.tsx
✅ mobile/app/(root)/(tabs)/fishtripcost/log-actual.tsx
✅ mobile/components/CarbonGauge.tsx
✅ mobile/components/ProfitabilityCircle.tsx
✅ mobile/components/CostBreakdownChart.tsx
✅ mobile/components/WeatherSeverityBadge.tsx
```

### Mobile Files to Extend

```
✅ mobile/stores/tripStore.ts (add prediction state & actions)
✅ mobile/types/type.d.ts (add new interfaces)
✅ mobile/services/tripService.ts (add new API calls)
```

---

## 🎯 FINAL VERDICT

**Can You Build This?**
✅ **YES**

**Is It Fully Software-Only?**
✅ **YES** (No IoT, no sensors, no external datasets initially)

**Is It Self-Learning?**
✅ **YES** (Via user-logged post-trip data)

**Is It Novel Enough for Research?**
✅ **YES** (Applied innovation with 8 novel integrations)

**Is It Island & International Scalable?**
✅ **YES** (Mode toggle with presets)

**Does It Fit Your Current Structure?**
✅ **YES** (Extends existing modules cleanly)

**Estimated Development Time:**
⏱️ **8-10 weeks** for full implementation

**Research Paper Potential:**
📄 **High** (Conference or applied journal)

---

## 📞 NEXT STEPS

1. **Review this document** with your team
2. **Coordinate with other members** for integration contracts
3. **Set up Python FastAPI environment**
4. **Create boat registration flow in mobile**
5. **Start with Phase 1** (Foundation)
6. **Collect initial trip data** for training
7. **Iterate and test** self-learning convergence

---

**END OF IMPLEMENTATION GUIDE**

This document is your complete roadmap. Follow it step-by-step, and you'll have a research-grade Dynamic Adaptive Trip Cost Intelligence Engine that is:

- Technically sophisticated
- Academically defensible
- Practically useful
- Fully integrated with your existing architecture

Good luck! 🚀🐟
