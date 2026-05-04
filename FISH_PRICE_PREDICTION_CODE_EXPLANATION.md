# 🐟 Fish Price Prediction Component - සම්පූර්ණ Code Explanation

## පරිපූර්ණ සිස්ටම් architecture එක තේරුම් ගතයුතු කිසිඩ

**Fish Price Prediction Component** යනු ඔබගේ final year research එකේ **DATCIE (Dynamic Adaptive Trip Cost Intelligence Engine)** හි central part එක.

---

## 📋 Outline - සිස්ටම් කොටස්

1. **Backend Architecture (NestJS)**
2. **Fish Market Entry Management**
3. **Cost Engine - Trip Price Prediction**
4. **Python ML Services - Market & Profitability**
5. **Data Models & DTOs**
6. **Integration Flow**
7. **Line-by-Line Code Explanation**

---

---

# 🏗️ SECTION 1: Backend Architecture (NestJS) Overview

## Backend Directory Structure

```
Backend/src/
├── fish-market/                 👈 Market Data Management
│   ├── fish-market.controller.ts
│   ├── fish-market.service.ts
│   ├── fish-market.module.ts
│   └── dto/
│       ├── create-fish-market-entry.dto.ts
│       └── update-fish-market-entry.dto.ts
│
├── cost-engine/                 👈 Trip Cost Prediction
│   ├── cost-engine.controller.ts
│   ├── cost-engine.service.ts
│   ├── cost-engine.module.ts
│   ├── dto/
│   │   ├── predict-cost.dto.ts
│   │   └── predict-and-save.dto.ts
│   ├── functions/
│   │   ├── fuel/
│   │   ├── cost/
│   │   ├── profit/
│   │   ├── environment/
│   │   ├── optimization/
│   │   └── mapping/
│   └── utils/
│       └── mode-calculator.util.ts
│
├── schemas/
│   ├── fish-market-entry.schema.ts
│   └── trip.schema.ts
│
└── common/
    ├── utils/
    │   ├── haversine.util.ts
    │   ├── wsi.util.ts          (Weather Severity Index)
    │   └── fesi.util.ts         (Economic Stress Index)
    └── guards/
        ├── auth-token.guard.ts
        └── admin.guard.ts
```

---

---

# 📊 SECTION 2: Fish Market Entry Management

## 2.1 ফ مMarket Data Storage Model

### File: `schemas/fish-market-entry.schema.ts`

**මෙම Schema එක අර්තක් කරන කරන්නේ:**
- ද෈ දිනට fish prices දතා store කරනවා
- කවර කෝට්ඨාසයෙන් fish catches වුණා
- fish වල grade (quality level) එක
- wholesale vs. retail prices

```typescript
FishMarketEntry {
  _id: ObjectId,              // Unique ID
  categoryId: ObjectId,       // Reference to fish category
  grade: string,              // "A", "B", "C" (quality levels)
  wholesalePrice: number,     // තිරසර අඩුවෙන් price
  price: number,              // Market retail price
  numberOfKilos: number,      // Quantity caught
  catchingAreaName: string,   // Region එක (eg: Negombo, Galle)
  images: string[],           // Photos of catch
  marketDate: Date,           // UTC midnight of market date
  createdAt: Date,
  updatedAt: Date
}
```

---

## 2.2 Fish Market Service - Code Explanation

### File: `fish-market/fish-market.service.ts`

#### **Part 1: Constructor & Initialization**

```typescript
@Injectable()
export class FishMarketService {
  constructor(
    @InjectModel(FishMarketEntry.name)
    private readonly model: Model<FishMarketEntryDocument>,
  ) {}
```

**කුමක් කරන්නේ:**
- `@Injectable()` දිගින්:
  - NestJS ව සැයුම් කරනවා අයින්, මෙවා dependency injection එකේ use කරන්න
- `@InjectModel()` දිගින්:
  - MongoDB එකේ `FishMarketEntry` collection එක inject කරනවා
- `private readonly model` දිගින්:
  - Database queries run කරන්න ගිණුම් කරනවා

---

#### **Part 2: Create Market Entry (Data Input)**

```typescript
async create(
  dto: CreateFishMarketEntryDto,
  imageFiles: Express.Multer.File[],
): Promise<FishMarketEntryDocument> {
  
  // ✅ STEP 1: Validate category ID
  if (!Types.ObjectId.isValid(dto.categoryId)) {
    throw new BadRequestException('Invalid categoryId');
  }

  // ✅ STEP 2: Save uploaded images
  const images = imageFiles.map(
    (f) => `/uploads/fish-market/${f.filename}`,
  );

  // ✅ STEP 3: Convert date string to UTC midnight
  const marketDate = toUtcMidnight(dto.marketDate);

  // ✅ STEP 4: Create document in database
  const doc = new this.model({
    categoryId: new Types.ObjectId(dto.categoryId),
    grade: dto.grade.trim(),
    wholesalePrice: dto.wholesalePrice,
    price: dto.price,
    numberOfKilos: dto.numberOfKilos,
    catchingAreaName: dto.catchingAreaName.trim(),
    images,
    marketDate,
  });

  // ✅ STEP 5: Save & return with category details
  return (await doc.save()).populate('categoryId', 'name');
}
```

**Line-by-Line Explanation:**

| පේලිය | කුමක් කරන්නේ | උදාහරණ |
|---------|-----------|---------|
| `@InjectModel()` | MongoDB collection access | fish_market_entries collection |
| `Types.ObjectId.isValid()` | Category ID check කරනවා | "507f1f77bcf86cd799439011" ✓ valid |
| `imageFiles.map()` | File paths array එක හදනවා | ["/uploads/fish-market/img1.jpg"] |
| `toUtcMidnight()` | Date string → UTC Date object | "2024-05-04" → Date(2024-05-04T00:00:00Z) |
| `.populate()` | Related data join කරනවා | categoryId with category name |

**Usage Example:**
```
POST /api/v1/admin/fish-market
Body: {
  categoryId: "507f1f77bcf86cd799439011",
  grade: "A",
  wholesalePrice: 450,
  price: 550,
  numberOfKilos: 25,
  catchingAreaName: "Negombo",
  marketDate: "2024-05-04"
}
Files: [image1.jpg, image2.jpg]

Response:
{
  _id: "ObjectId",
  categoryId: { _id: "...", name: "Tuna" },
  grade: "A",
  price: 550,
  ...
}
```

---

#### **Part 3: Retrieve Market Data (Filtering & Date Range)**

```typescript
async findAll(filters: {
  date?: string;        // Exact date (YYYY-MM-DD)
  from?: string;        // Start date
  to?: string;          // End date
  categoryId?: string;  // Filter by fish type
}): Promise<FishMarketEntryDocument[]> {
  
  const query: Record<string, any> = {};

  // ✅ Case 1: Exact date filter
  if (filters.date) {
    const start = toUtcMidnight(filters.date);
    query.marketDate = { 
      $gte: start,                    // Greater than or equal to start
      $lte: toUtcEndOfDay(start)      // Less than or equal to end of day
    };
  } 
  // ✅ Case 2: Date range filter (from/to)
  else if (filters.from || filters.to) {
    query.marketDate = {};
    if (filters.from) 
      query.marketDate.$gte = toUtcMidnight(filters.from);
    if (filters.to) 
      query.marketDate.$lte = toUtcEndOfDay(toUtcMidnight(filters.to));
  }

  // ✅ Case 3: Fish category filter
  if (filters.categoryId && Types.ObjectId.isValid(filters.categoryId)) {
    query.categoryId = new Types.ObjectId(filters.categoryId);
  }

  // ✅ Execute query and return sorted results
  return this.model
    .find(query)
    .populate('categoryId', 'name')
    .sort({ marketDate: -1, createdAt: -1 })  // Newest first
    .exec();
}
```

**Explanation with MongoDB Query Examples:**

```javascript
// Query Example 1: Exact date
db.fish_market_entries.find({
  marketDate: { 
    $gte: ISODate("2024-05-04T00:00:00Z"),
    $lte: ISODate("2024-05-04T23:59:59.999Z")
  }
})

// Query Example 2: Date range
db.fish_market_entries.find({
  marketDate: {
    $gte: ISODate("2024-05-01T00:00:00Z"),
    $lte: ISODate("2024-05-31T23:59:59.999Z")
  },
  categoryId: ObjectId("507f1f77bcf86cd799439011")
})
```

---

#### **Part 4: Get Available Dates (For UI Navigation)**

```typescript
async getAvailableDates(): Promise<string[]> {
  // ✅ STEP 1: Get all unique market dates from database
  const dates = await this.model.distinct('marketDate').exec();
  
  // ✅ STEP 2: Sort by most recent first
  return (dates as Date[])
    .sort((a, b) => b.getTime() - a.getTime())
    // ✅ STEP 3: Convert to ISO string format (YYYY-MM-DD)
    .map((d) => (d as Date).toISOString().split('T')[0]);
}
```

**Example Output:**
```javascript
["2024-05-04", "2024-05-03", "2024-05-02", "2024-05-01"]
```

**Mobile App Usage:**
- UI එකට dates list එක දිනවා
- Dropdown එකෙන් user කිසි date එක තෝරාගන්න පුලුවන් කරනවා

---

#### **Part 5: Update & Delete**

```typescript
// UPDATE: Modify existing market entry
async update(
  id: string,
  dto: UpdateFishMarketEntryDto,
  imageFiles: Express.Multer.File[],
  replaceImages: boolean,
): Promise<FishMarketEntryDocument> {
  const doc = await this.findOne(id);

  // Update fields if provided
  if (dto.grade !== undefined) doc.grade = dto.grade.trim();
  if (dto.price !== undefined) doc.price = dto.price;
  if (dto.numberOfKilos !== undefined) doc.numberOfKilos = dto.numberOfKilos;
  
  // Handle image replacement
  if (imageFiles.length > 0) {
    const newPaths = imageFiles.map(f => `/uploads/fish-market/${f.filename}`);
    if (replaceImages) {
      doc.images.forEach(p => this.deleteFile(p));
      doc.images = newPaths;
    } else {
      doc.images = [...doc.images, ...newPaths];
    }
  }

  await doc.save();
  return doc.populate('categoryId', 'name');
}

// DELETE: Remove entry and its images
async remove(id: string): Promise<{ success: boolean; message: string }> {
  const doc = await this.findOne(id);
  doc.images.forEach((p) => this.deleteFile(p));
  await doc.deleteOne();
  return { success: true, message: 'Fish market entry deleted successfully' };
}
```

---

---

# 💰 SECTION 3: Cost Engine - Trip Price Prediction

## 3.1 Overview

**Cost Engine** හි job එක:
1. නොවිය හැකි boat පයිතන්වලින් inputs ගැනීම (lat/lon, speed, fuel price, etc.)
2. Fuel consumption predict කරනවා
3. Total trip cost calculate කරනවා
4. Profitability probability predict කරනවා
5. Recommendations generate කරනවා

---

## 3.2 Data Input: PredictCostDto

### File: `cost-engine/dto/predict-cost.dto.ts`

```typescript
export class PredictCostDto {
  // ═══════════════════════════════════════════════════════════
  // BOAT & ROUTE INFORMATION
  // ═══════════════════════════════════════════════════════════
  
  @IsMongoId()
  boatId: string;  // Which boat is making the trip?

  // OPTION 1: Coordinates (Calculate distance automatically)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  startLat?: number;  // Starting latitude (-90 to 90)

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  startLon?: number;  // Starting longitude (-180 to 180)

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  endLat?: number;    // Destination latitude

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  endLon?: number;    // Destination longitude

  // OPTION 2: Manual Distance (Direct input)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distanceKm?: number;  // Direct distance input

  // ═══════════════════════════════════════════════════════════
  // TRIP PARAMETERS
  // ═══════════════════════════════════════════════════════════

  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  speed: number;  // Travel speed in knots (0.1 - unlimited)

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fishingHours: number;  // Hours spent fishing (0 - unlimited)

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  numberOfDays: number;  // Trip duration in days (minimum 1)

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  crewCount: number;  // Crew members on trip (minimum 1)

  // ═══════════════════════════════════════════════════════════
  // WEATHER CONDITIONS
  // ═══════════════════════════════════════════════════════════

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  windSpeed: number;  // Wind speed in knots (0+)

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  waveHeight: number;  // Wave height in meters (0+)

  // ═══════════════════════════════════════════════════════════
  // ECONOMIC FACTORS
  // ═══════════════════════════════════════════════════════════

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fuelPrice: number;  // Price per liter in Rs

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  expectedCatch: number;  // Expected catch in kg

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  marketPrice: number;  // Price per kg in Rs

  // ═══════════════════════════════════════════════════════════
  // TRIP MODE
  // ═══════════════════════════════════════════════════════════

  @IsOptional()
  @IsIn(['island', 'international'])
  mode?: 'island' | 'international';  // Fishing area type
}
```

**Decorator Meanings:**
- `@IsMongoId()` = Must be valid MongoDB ID
- `@IsOptional()` = This field may be omitted
- `@Type(() => Number)` = Convert string to number (from form data)
- `@IsNumber()` = Value must be a number
- `@Min(0)` = Minimum value allowed is 0
- `@Max(180)` = Maximum value allowed is 180

---

## 3.3 Main Prediction Function

### File: `cost-engine/cost-engine.service.ts` - `predictTrip()` Method

#### **STEP 1: Validate Boat & Calculate Distance**

```typescript
async predictTrip(dto: PredictCostDto, userId?: string) {
  
  // ✅ STEP 1A: Get boat details from database
  const boat = await this.getValidatedBoatForPrediction(
    dto.boatId, 
    userId
  );
  // Example boat object:
  // {
  //   _id: "507f...",
  //   engineHorsePower: 85,
  //   fuelEfficiencyFactor: 1.0,
  //   engineDegradationFactor: 0.05,
  //   userId: "user123"
  // }

  // ✅ STEP 1B: Calculate distance using coordinates (Option A)
  let baseDistanceKm: number;
  let predictedDistanceKm: number;
  const drf = 0.05;  // Detour/Route Factor (5% extra for navigation)

  if (
    dto.startLat != null &&
    dto.startLon != null &&
    dto.endLat != null &&
    dto.endLon != null
  ) {
    // Use Haversine formula to calculate great-circle distance
    baseDistanceKm = haversineDistanceKm(
      dto.startLat,
      dto.startLon,
      dto.endLat,
      dto.endLon
    );
    // baseDistanceKm = 45.2 km (example)
    
    // Add 5% for actual route (not straight line)
    predictedDistanceKm = effectiveDistanceKm(baseDistanceKm, drf);
    // predictedDistanceKm = 45.2 * 1.05 = 47.46 km
  }
  // ✅ STEP 1C: Or use manual distance (Option B)
  else if (dto.distanceKm != null && dto.distanceKm > 0) {
    baseDistanceKm = dto.distanceKm;
    predictedDistanceKm = effectiveDistanceKm(baseDistanceKm, drf);
  }
  // ✅ STEP 1D: Error if neither provided
  else {
    throw new BadRequestException(
      'Either coordinates or distanceKm must be provided'
    );
  }
}
```

**Haversine Formula (Behind the Scenes):**
```
Formula: d = 2R × arcsin(√(sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)))

Where:
  R = Earth's radius (6371 km)
  lat1, lon1 = Start coordinates
  lat2, lon2 = End coordinates
  d = Distance in km

Example:
  Start: Colombo (6.9271°N, 79.8612°E)
  End: Negombo (7.2089°N, 79.8515°E)
  Distance = ~35 km
```

---

#### **STEP 2: Calculate Weather Severity Index (WSI)**

```typescript
// Calculate how much weather affects fuel consumption & costs
const { wsi, normalized: wsiNormalized } = calculateWSI(
  dto.windSpeed,    // e.g., 15 knots
  dto.waveHeight,   // e.g., 1.5 meters
  0                 // rain parameter (currently 0)
);

// Example calculations:
// wsi = 0.35 (0 = perfect weather, 1 = severe)
// normalized = { wind: 0.3, wave: 0.2, rain: 0 }

// Impact on fuel:
// Base fuel = 50 liters
// With WSI 0.35: fuel increases by ~35%
```

**WSI Calculation (Simplified):**
```python
def calculate_wsi(wind_speed, wave_height):
    wind_factor = min(wind_speed / 25, 1.0)    # 25 knots = max wind
    wave_factor = min(wave_height / 3.0, 1.0)  # 3m waves = max height
    
    wsi = (wind_factor * 0.5) + (wave_factor * 0.5)  # Weighted average
    
    # Example:
    # wind_speed=15 → wind_factor=0.6
    # wave_height=1.5 → wave_factor=0.5
    # wsi = (0.6 * 0.5) + (0.5 * 0.5) = 0.55
    return wsi
```

---

#### **STEP 3: Calculate Economic Stress Index (FESI)**

```typescript
// FESI = Fuel Economic Stress Index
// Measures economic vulnerability to fuel & market price changes
const { fesi, components: fesiComponents } = calculateFESI({
  recentFuelPrices: [],      // Historical fuel prices (empty for now)
  recentMarketPrices: [],    // Historical fish prices (empty for now)
  recentWSI: [],             // Historical weather data (empty for now)
});

// Example output:
// fesi = 0.45 (0 = economically stable, 1 = high risk)
// components = {
//   fuelComponentScore: 0.4,
//   marketComponentScore: 0.5,
//   weatherComponentScore: 0.4
// }
```

---

#### **STEP 4: Request ML Service for Fuel Prediction**

```typescript
// ✅ Setup base URL for Python ML service
const baseUrl = 
  this.config.get<string>('ML_SERVICE_BASE_URL') || 
  'http://localhost:5001';

// ✅ Get boat efficiency factor (engine condition)
const efficiencyFactor = boat.fuelEfficiencyFactor ?? 1;

// ✅ First, calculate baseline fuel estimate
const fuelBaseResult = estimateFuelBase({
  predictedDistanceKm,  // 47.46 km
  wsi,                   // 0.35 (weather impact)
  speed: dto.speed,      // 12 knots
  efficiencyFactor,      // 1.0 (good condition)
});

// fuelBaseResult = {
//   predictedFuelLiters: 58.3,
//   fuelPerKmBase: 1.23,
//   weatherMultiplier: 1.35
// }

let predictedFuelLiters = fuelBaseResult.predictedFuelLiters;

// ✅ Now call the ML service for more accurate prediction
try {
  const fuelRes = await firstValueFrom(
    this.http.post(`${baseUrl}/predict/fuel`, {
      boatId: dto.boatId,
      distanceKm: predictedDistanceKm,      // 47.46
      speed: dto.speed,                      // 12
      engineHP: boat.engineHorsePower ?? 85, // 85
      fishingHours: dto.fishingHours,        // 8
      numberOfDays: dto.numberOfDays,        // 1
      weatherSeverityIndex: wsi,             // 0.35
      engineDegradation: 1 - (boat.engineDegradationFactor ?? 0),
      fuelEfficiencyFactor: efficiencyFactor,
    }),
  );

  // ML service returns predicted fuel
  const v = Number(fuelRes.data?.predictedFuelLiters);
  
  if (!Number.isFinite(v)) {
    throw new Error('Invalid ML fuel output');
  }

  predictedFuelLiters = v;  // e.g., 61.2 liters (more accurate)

} catch (e: any) {
  // ✅ If ML service fails, use baseline estimate
  mlFallback = true;
  console.log('ML fuel error:', e?.message);
  // Continue with fuelBaseResult value
}
```

**ML Service Request/Response:**
```json
REQUEST: POST http://localhost:5001/predict/fuel
{
  "boatId": "507f1f77bcf86cd799439011",
  "distanceKm": 47.46,
  "speed": 12,
  "engineHP": 85,
  "fishingHours": 8,
  "numberOfDays": 1,
  "weatherSeverityIndex": 0.35,
  "engineDegradation": 0.95,
  "fuelEfficiencyFactor": 1.0
}

RESPONSE:
{
  "predictedFuelLiters": 61.2,
  "confidence": 0.92,
  "breakdown": {
    "baseConsumption": 52.4,
    "weatherAdjustment": 8.8,
    "engineAdjustment": 0.0
  }
}
```

---

#### **STEP 5: Apply Speed Adjustments**

```typescript
// Faster speed = higher fuel consumption (exponential)
const speedAdjusted = applySpeedAdjustment(
  predictedFuelLiters,  // 61.2 liters
  dto.speed              // 12 knots
);

// speedAdjusted = {
//   predictedFuelLiters: 63.5,
//   speedFactor: 1.038  // 3.8% increase for this speed
// }

predictedFuelLiters = speedAdjusted.predictedFuelLiters;
```

**Speed Factor Calculation (Exponential):**
```
Formula: speedFactor = 1 + (((speed - 8) / 8) ^ 1.3)

Example for different speeds:
- 8 knots (baseline): speedFactor = 1.0 (no change)
- 10 knots: speedFactor = 1.01 (1% increase)
- 12 knots: speedFactor = 1.038 (3.8% increase)
- 16 knots: speedFactor = 1.15 (15% increase)

Why exponential?
Fuel consumption increases exponentially with speed due to water resistance.
Going faster is increasingly fuel-inefficient.
```

---

#### **STEP 6: Apply Mode Adjustments (Island vs International)**

```typescript
const mode = dto.mode || 'island';
const tripDurationHours = dto.fishingHours + (predictedDistanceKm / dto.speed);

const modeAdjustments = calculateModeAdjustments(
  mode,                  // 'island' or 'international'
  predictedDistanceKm,   // 47.46 km
  tripDurationHours,     // 8 + (47.46/12) = 11.96 hours
  dto.crewCount          // 4 crew members
);

// modeAdjustments = {
//   fuelMultiplier: 1.0,          // Island = standard fuel
//   costMultiplier: 1.0,
//   safetyMultiplier: 1.0,
//   recommendedRoute: "direct"
// }

// OR if international:
// modeAdjustments = {
//   fuelMultiplier: 1.2,          // 20% more fuel for international
//   costMultiplier: 1.3,          // 30% more total cost
//   safetyMultiplier: 1.5,        // 50% higher safety requirements
//   recommendedRoute: "safe_lane"
// }

const adjustedFuelLiters = applyModeFuelAdjustment(
  predictedFuelLiters,           // 63.5 liters
  modeAdjustments.fuelMultiplier // 1.0 or 1.2
);
```

---

#### **STEP 7: Calculate Total Cost**

```typescript
// Calculate all cost components
const costBreakdown = calculateTotalCost({
  adjustedFuelLiters,    // 63.5 liters (after all adjustments)
  fuelPrice: dto.fuelPrice,      // 120 Rs/liter
  crewCount: dto.crewCount,      // 4 people
  fesi,                          // 0.45 (economic stress)
  mode,                          // 'island'
  modeAdjustments,               // Multipliers
  internationalCosts: 0,         // 0 for island mode
});

// costBreakdown = {
//   fuelCost: 7620,              // 63.5 * 120
//   crewCost: 4000,              // 4 * 1000 per day
//   maintenanceCost: 2500,
//   insuranceCost: 1500,
//   licenseCost: 800,
//   otherCosts: 1200,
//   predictedTotalCost: 17620    // Sum of all costs
// }
```

---

#### **STEP 8: Handle External Costs (User Preferences)**

```typescript
// Get user's cost preferences (saved patterns)
let activePreferences: any[] = [];

if (userId) {
  try {
    activePreferences = 
      await this.costPreferencesService.findActiveAutoApplyForUser(userId);
    // Example preferences:
    // [
    //   { name: "Ice", category: "supplies", amount: 1500 },
    //   { name: "Safety equipment", category: "safety", amount: 2000 }
    // ]
  } catch {
    activePreferences = [];
  }
}

// Merge user preferences with manual costs from current trip
const mergedExternalCosts = mergeCostPreferences(
  activePreferences,
  dto.manualExternalCosts || []  // Manual costs for this trip only
);

// Calculate total external costs
const externalCostTotal = calculateExternalCostTotal(mergedExternalCosts);
// externalCostTotal = 3500 (e.g., ice + fuel drums)
```

---

#### **STEP 9: Calculate Profitability**

```typescript
// Base calculation: expected catch * price - costs
const baseProfitability = calculateProfit({
  expectedCatch: dto.expectedCatch,        // 80 kg
  marketPrice: dto.marketPrice,            // 650 Rs/kg
  predictedTotalCost: finalPredictedTotalCost, // 17620 Rs
});

// baseProfitability = {
//   expectedRevenue: 52000,      // 80 * 650
//   profit: 34380,               // 52000 - 17620
//   profitMargin: 0.661,         // 66.1% profit margin
//   riskCategory: "medium"
// }

// Now call ML service for probabilistic prediction
let profitabilityProbability = baseProfitability.profitabilityProbability;
let riskCategory = baseProfitability.riskCategory;

try {
  const profRes = await firstValueFrom(
    this.http.post(`${baseUrl}/predict/profitability`, {
      expectedCatchKg: dto.expectedCatch,
      marketPrice: dto.marketPrice,
      predictedTotalCost: finalPredictedTotalCost,
      weatherSeverityIndex: wsi,
    }),
  );

  // ML predictions include uncertainty
  const p = Number(profRes.data?.profitabilityProbability);
  const r = profRes.data?.riskCategory;

  if (Number.isFinite(p)) {
    profitabilityProbability = p;  // e.g., 0.78 (78% chance of profit)
  }

  if (r === 'low' || r === 'medium' || r === 'high') {
    riskCategory = r;  // Updated risk assessment
  }

} catch (e: any) {
  mlFallback = true;
  // Use base calculation
}
```

---

#### **STEP 10: Generate Recommendations**

```typescript
const recommendations: string[] = [];

// Weather-based recommendations
if (wsi > 0.65) {
  recommendations.push(
    '⚠️ High weather severity: consider delaying trip or reducing speed.'
  );
}

// Economic-based recommendations
if (fesi > 0.5) {
  recommendations.push(
    '💰 High economic stress: monitor fuel price and consider cost-cutting measures.'
  );
}

// Profitability-based recommendations
if (profitabilityProbability < 0.45) {
  recommendations.push(
    '📉 Low profitability chance: consider alternative zone or time.'
  );
}

// Fuel consumption-based recommendations
if (adjustedFuelLiters > 120) {
  recommendations.push(
    '⛽ High fuel usage predicted: optimize route carefully.'
  );
}

// Mode-specific recommendations
recommendations.push(
  ...getModeRecommendations(mode, predictedDistanceKm, wsi)
);

// Fallback if no recommendations
if (recommendations.length === 0) {
  recommendations.push(
    '✅ Conditions look stable: proceed with standard plan.'
  );
}
```

---

#### **STEP 11: Build Response**

```typescript
return buildPredictionResponse({
  distance: {
    baseDistanceKm,           // 45.2 km (straight line)
    predictedDistanceKm,      // 47.46 km (actual route)
    drf,                       // 0.05 (5% detour factor)
  },
  weather: {
    wsi,                       // 0.35
    normalized: wsiNormalized, // { wind: 0.3, wave: 0.2, rain: 0 }
    windSpeed: dto.windSpeed,
    waveHeight: dto.waveHeight,
  },
  economics: {
    fesi,                      // 0.45
    components: fesiComponents,
    fuelPrice: dto.fuelPrice,
    marketPrice: dto.marketPrice,
  },
  fuel: {
    predictedFuelLiters,       // 63.5 liters
    adjustedFuelLiters,        // After all adjustments
    fuelPerKmBase: fuelBaseResult.fuelPerKmBase,
    weatherMultiplier: fuelBaseResult.weatherMultiplier,
    efficiencyFactor,
    speedFactor: speedAdjusted.speedFactor,
    modeMultiplier: modeAdjustments.fuelMultiplier,
  },
  cost: {
    ...costBreakdown,
    baseOperationalCost,
    externalCosts: mergedExternalCosts,
    externalCostTotal,
    predictedTotalCost: finalPredictedTotalCost,
  },
  mode: {
    selectedMode: mode,
    adjustments: modeAdjustments,
    tripDurationHours,
  },
  carbon: {
    carbonEmissionKg,
    carbonPerKgCatch,
  },
  profitability: {
    expectedRevenue: baseProfitability.expectedRevenue,
    profit: baseProfitability.expectedRevenue - finalPredictedTotalCost,
    profitabilityProbability,
    riskCategory,
  },
  recommendations,
  mlFallback,
});
```

**Example Response:**
```json
{
  "distance": {
    "baseDistanceKm": 45.2,
    "predictedDistanceKm": 47.46,
    "drf": 0.05
  },
  "weather": {
    "wsi": 0.35,
    "windSpeed": 15,
    "waveHeight": 1.5
  },
  "fuel": {
    "predictedFuelLiters": 63.5,
    "adjustedFuelLiters": 63.5
  },
  "cost": {
    "fuelCost": 7620,
    "crewCost": 4000,
    "predictedTotalCost": 17620
  },
  "profitability": {
    "expectedRevenue": 52000,
    "profit": 34380,
    "profitabilityProbability": 0.78,
    "riskCategory": "low"
  },
  "recommendations": [
    "✅ Conditions look stable: proceed with standard plan."
  ],
  "mlFallback": false
}
```

---

---

# 🤖 SECTION 4: Python ML Services - Market & Profitability

## 4.1 Overview

**Python Backend** (FastAPI) හි job:
1. Advanced fuel prediction models
2. Market price analysis
3. Profitability risk assessment
4. Learning from historical data

---

## 4.2 Profitability Engine Deep Dive

### File: `model/cost_prediction/services/economics/profitability.py`

#### **Class Structure:**

```python
class ProfitabilityEngine:
    def __init__(self, model_dir: str):
        self.model_dir = model_dir
        self.market_history_path = os.path.join(model_dir, "market_history.json")
        self._ensure_market_history()
```

**Initialization Logic:**
- Loads market history from JSON file
- Creates initial data if file doesn't exist
- Stores seasonal patterns and volatility levels

---

#### **Main Prediction Method:**

```python
def predict(self, data: dict):
    """
    ඔබගේ trip එකට profitability predict කරනවා
    
    Input data:
      - expectedCatchKg: 80 kg
      - marketPrice: 650 Rs/kg
      - predictedTotalCost: 17620 Rs
      - weatherSeverityIndex: 0.35
    
    Output: Complex profitability analysis with risk scores
    """
    
    # ✅ STEP 1: Calculate base revenue & profit
    expected_catch = data["expectedCatchKg"]        # 80 kg
    market_price = data["marketPrice"]              # 650 Rs/kg
    predicted_cost = data["predictedTotalCost"]     # 17620 Rs
    
    base_revenue = expected_catch * market_price    # 52000 Rs
    base_profit = base_revenue - predicted_cost     # 34380 Rs
```

---

#### **STEP 2: Market Risk Analysis**

```python
def _analyze_market_risk(self, current_price: float, market_data: dict) -> float:
    """
    කුමක් කරන්නේ: Market price volatility analyze කරනවා
    
    Market price ගේ නිතිපතා වෙනස්වීම් නිරීක්ෂණ කරනවා.
    Volatility = ඉහළ නම් අඩුවෙන් risk.
    """
    
    price_history = market_data.get("priceHistory", [])
    
    if len(price_history) < 5:
        # Not enough data - default to medium risk
        return 0.3
    
    # ✅ Get last 30 price records
    recent_prices = [p["price"] for p in price_history[-30:]]
    # [650, 640, 670, 620, 680, ...] (30 prices)
    
    # ✅ Calculate volatility (standard deviation)
    if len(recent_prices) > 1:
        price_std = np.std(recent_prices)           # 35 Rs (variation)
        price_mean = np.mean(recent_prices)         # 645 Rs (average)
        volatility = price_std / price_mean         # 35/645 = 0.054
    else:
        volatility = 0.3  # Default high volatility
    
    # ✅ Convert volatility to risk score (0-1)
    market_risk = min(volatility * 2, 1.0)        # 0.054 * 2 = 0.108
    
    return market_risk  # 0.108 (low market risk)
```

**Interpretation:**
```
market_risk = 0.1   → Low risk (stable prices)
market_risk = 0.3   → Medium risk (moderate fluctuations)
market_risk = 0.6   → High risk (volatile market)
market_risk = 0.9   → Very high risk (unpredictable prices)
```

---

#### **STEP 3: Seasonal Adjustments**

```python
def _calculate_seasonal_factor(self) -> float:
    """
    සමයකට සමයට බස්නා quantity & price වෙනස්වීම් සැලසුම් කරනවා
    
    Monsoon season → Less supply, more demand
    Dry season → More supply, less demand
    """
    
    current_month = datetime.utcnow().month  # e.g., May = 5
    
    # ✅ Load seasonal patterns from market_history.json
    with open(self.market_history_path, "r") as f:
        market_data = json.load(f)
    
    patterns = market_data["seasonalPatterns"]
    # {
    #   "monsoon": {
    #     "demandMultiplier": 0.8,
    #     "supplyMultiplier": 0.6
    #   },
    #   "dry": {
    #     "demandMultiplier": 1.2,
    #     "supplyMultiplier": 1.1
    #   },
    #   "inter_monsoon": {
    #     "demandMultiplier": 1.0,
    #     "supplyMultiplier": 1.0
    #   }
    # }
    
    # ✅ Determine current season
    if current_month in [5, 6, 7, 8, 9, 10]:  # May-October
        season_data = patterns["monsoon"]
        # demandMultiplier: 0.8, supplyMultiplier: 0.6
    elif current_month in [12, 1, 2, 3]:      # Dec-March
        season_data = patterns["dry"]
        # demandMultiplier: 1.2, supplyMultiplier: 1.1
    else:                                      # Apr, Nov
        season_data = patterns["inter_monsoon"]
        # demandMultiplier: 1.0, supplyMultiplier: 1.0
    
    # ✅ Calculate seasonal factor
    demand_factor = season_data["demandMultiplier"]    # 0.8
    supply_factor = season_data["supplyMultiplier"]    # 0.6
    
    # Higher demand + lower supply = higher prices
    seasonal_factor = demand_factor / supply_factor   # 0.8 / 0.6 = 1.333
    
    return seasonal_factor  # 1.333 (33.3% price increase)
    
    # ✅ This adjusts revenue:
    # adjusted_revenue = base_revenue * seasonal_factor
    # adjusted_revenue = 52000 * 1.333 = 69316 Rs (in monsoon)
```

---

#### **STEP 4: Risk Calculations**

```python
def _calculate_catch_risk(self, expected_catch: float) -> float:
    """
    අපේ catch goal එක achieve කරන්නට හැකිරෙවි නැතිද?
    
    More ambitious catch targets = higher uncertainty
    """
    
    base_risk = min(expected_catch / 500, 0.7)
    # 80 kg / 500 = 0.16 (low risk for reasonable catch)
    # 400 kg / 500 = 0.8 (high risk, but capped at 0.7)
    
    environmental_uncertainty = 0.2  # 20% base uncertainty
    
    catch_risk = min(base_risk + environmental_uncertainty, 0.8)
    # catch_risk = min(0.16 + 0.2, 0.8) = 0.36 (36% risk)
    
    return catch_risk

def _calculate_weather_risk(self, weather_severity: float) -> float:
    """
    Weather එක කුතරම්ම bad එකද? එය profit එක hit කරනවා.
    """
    
    weather_risk = weather_severity * 0.8
    # If wsi = 0.35, weather_risk = 0.35 * 0.8 = 0.28
    
    return weather_risk

def _calculate_fuel_price_risk(self, predicted_cost: float) -> float:
    """
    Fuel price volatility කරන risk එක
    
    Fuel = ~60% of total cost in fishing
    """
    
    fuel_portion = 0.6
    fuel_cost_estimate = predicted_cost * fuel_portion
    # 17620 * 0.6 = 10572 Rs
    
    if fuel_cost_estimate > 100000:
        fuel_risk = 0.4  # Very high
    elif fuel_cost_estimate > 50000:
        fuel_risk = 0.25  # Medium
    else:
        fuel_risk = 0.15  # Low
    
    return fuel_risk  # 0.15 (our fuel cost is low)
```

---

#### **STEP 5: Combined Risk Assessment**

```python
def _calculate_combined_risk(self, market_risk: float, catch_risk: float,
                           weather_risk: float, fuel_risk: float) -> float:
    """
    සියලු risk factors එක්ක එකතු කරනවා weighted scores.
    
    Each risk has different importance level.
    """
    
    weights = {
        "market": 0.25,    # 25% - Market is important but not most
        "catch": 0.35,     # 35% - Most important (depends on catch success)
        "weather": 0.25,   # 25% - Weather affects operations significantly
        "fuel": 0.15       # 15% - Fuel risk is manageable
    }
    
    combined_risk = (
        weights["market"] * market_risk +      # 0.25 * 0.108 = 0.027
        weights["catch"] * catch_risk +        # 0.35 * 0.36 = 0.126
        weights["weather"] * weather_risk +    # 0.25 * 0.28 = 0.070
        weights["fuel"] * fuel_risk            # 0.15 * 0.15 = 0.0225
    )
    
    # combined_risk = 0.027 + 0.126 + 0.070 + 0.0225 = 0.2455
    
    return min(combined_risk, 1.0)  # Cap at 1.0
    # Returns: 0.2455 (24.55% combined risk)
```

---

#### **STEP 6: Monte Carlo Simulations**

```python
def _run_profitability_scenarios(self, revenue: float, cost: float,
                               risk_score: float, expected_catch: float) -> dict:
    """
    100 different අවස්තා simulate කරනවා profit possible scenarios.
    
    This shows us:
    - Worst case scenario
    - Best case scenario  
    - Probability of making profit
    """
    
    scenarios = []
    num_simulations = 100  # Run 100 simulations
    
    for simulation in range(num_simulations):
        # ✅ Add randomness based on risk score
        revenue_variance = np.random.normal(1.0, risk_score * 0.3)
        # 1.0 = no change, std dev = risk_score * 0.3
        # For risk_score=0.246: std dev = 0.074
        # Produces values like: 0.95, 1.02, 0.98, 1.05, 0.88, ...
        
        cost_variance = np.random.normal(1.0, risk_score * 0.2)
        # Similar but smaller std dev for costs
        # Produces values like: 0.99, 1.01, 0.97, 1.03, 0.96, ...
        
        # ✅ Clamp to reasonable bounds
        revenue_variance = max(0.5, min(1.5, revenue_variance))
        # If revenue_variance was 1.8, clamp to 1.5 (max 50% increase)
        # If revenue_variance was 0.2, clamp to 0.5 (min 50% decrease)
        
        cost_variance = max(0.8, min(1.3, cost_variance))
        # Cost can decrease 20% or increase 30%
        
        # ✅ Calculate scenario profit
        scenario_revenue = revenue * revenue_variance
        scenario_cost = cost * cost_variance
        scenario_profit = scenario_revenue - scenario_cost
        
        scenarios.append(scenario_profit)
        
        # Example iteration:
        # revenue = 52000, cost = 17620, risk_score = 0.246
        # revenue_variance = 0.97, cost_variance = 1.02
        # scenario_revenue = 52000 * 0.97 = 50440
        # scenario_cost = 17620 * 1.02 = 17972
        # scenario_profit = 50440 - 17972 = 32468
    
    # ✅ Calculate statistics from 100 scenarios
    scenarios_array = np.array(scenarios)
    # [34500, 32468, 35200, 31000, 36100, ..., 33200]
    
    success_rate = np.mean(scenarios_array > 0)
    # How many scenarios ended with profit > 0?
    # Example: 87 out of 100 → success_rate = 0.87
    
    return {
        "worst_case": np.percentile(scenarios_array, 10),
        # 10th percentile - worst 10% of scenarios
        # Example: 28500 Rs profit
        
        "best_case": np.percentile(scenarios_array, 90),
        # 90th percentile - best 10% of scenarios
        # Example: 40200 Rs profit
        
        "expected": np.mean(scenarios_array),
        # Average across all scenarios
        # Example: 34380 Rs profit
        
        "success_rate": success_rate,
        # 0.87 (87% chance of profitability)
        
        "scenarios": scenarios  # All 100 profit values
    }
```

**Visual Representation:**
```
Scenario Distribution (100 simulations):

Profit (Rs)
    ↑
40000 |              ╱╲
35000 |            ╱  ╲         ← Best case (90th percentile)
30000 |          ╱      ╲
25000 |        ╱          ╲
20000 |      ╱              ╲    ← Worst case (10th percentile)
15000 |____╱________________╲___
      └─────────────────────────
        Expected: 34380 Rs
        Success Rate: 87%
```

---

#### **STEP 7: Risk Category Determination**

```python
def _determine_risk_category(self, success_rate: float, combined_risk: float) -> str:
    """
    Risk category determine කරනවා simple labels ( - low, medium, high, very_high).
    
    success_rate: 0.87 (87% chance of profit)
    combined_risk: 0.246 (24.6% risk score)
    """
    
    if success_rate >= 0.8 and combined_risk <= 0.3:
        return "low"         # 👍 Safe trip
        # 87% success + 24.6% risk → LOW
    
    elif success_rate >= 0.6 and combined_risk <= 0.5:
        return "medium"      # 🤔 Moderate
    
    elif success_rate >= 0.4 and combined_risk <= 0.7:
        return "high"        # ⚠️ Risky
    
    else:
        return "very_high"   # 🚫 Very risky
```

---

#### **STEP 8: Confidence Intervals**

```python
def _calculate_confidence_intervals(self, scenarios: dict) -> dict:
    """
    Our profit prediction එකට confidence levels දෙනවා.
    
    95% confidence = We're 95% sure profit will be in this range.
    """
    
    scenarios_array = np.array(scenarios["scenarios"])
    # [34500, 32468, 35200, 31000, ..., 33200] (100 values)
    
    return {
        "95%_interval": {
            "lower": np.percentile(scenarios_array, 2.5),
            # Only 2.5% of scenarios worse than this
            # Example: 28000 Rs
            
            "upper": np.percentile(scenarios_array, 97.5),
            # Only 2.5% of scenarios better than this
            # Example: 40500 Rs
            
            # Interpretation: 95% sure profit will be between 28k-40.5k
        },
        
        "80%_interval": {
            "lower": np.percentile(scenarios_array, 10),   # 28500
            "upper": np.percentile(scenarios_array, 90),   # 40200
            # 80% sure profit will be between 28.5k-40.2k
        },
        
        "50%_interval": {
            "lower": np.percentile(scenarios_array, 25),   # 32000
            "upper": np.percentile(scenarios_array, 75),   # 36500
            # 50% sure profit will be between 32k-36.5k
        }
    }
```

---

#### **STEP 9: Actionable Recommendations**

```python
def _generate_profitability_recommendations(self, profit: float, risk_category: str,
                                          market_risk: float, weather_impact: float,
                                          seasonal_factor: float) -> List[str]:
    """
    User එකට මෙහෙම යන්න පුලුවන් කරනවා helpful recommendations.
    """
    
    recommendations = []
    
    # ✅ Profit-based recommendations
    if profit <= 0:
        recommendations.append(
            "🔴 CRITICAL: Trip likely unprofitable. Reconsider."
        )
    elif profit < 20000:
        recommendations.append(
            "🟡 LOW MARGIN: Small profit expected. Monitor closely."
        )
    elif profit > 100000:
        recommendations.append(
            "🟢 HIGH PROFIT: Excellent opportunity. Maximize catch!"
        )
    
    # ✅ Risk-based recommendations
    if risk_category == "very_high":
        recommendations.append(
            "🚫 VERY HIGH RISK: Strongly postpone or reduce scope."
        )
    elif risk_category == "high":
        recommendations.append(
            "⚠️ HIGH RISK: Proceed with extra caution."
        )
    elif risk_category == "low":
        recommendations.append(
            "✅ LOW RISK: Favorable conditions. Good to go!"
        )
    
    # ✅ Market-specific recommendations
    if market_risk > 0.5:
        recommendations.append(
            "📊 High market volatility. Lock in price if possible."
        )
    elif market_risk < 0.2:
        recommendations.append(
            "📈 Stable market. Good time for larger catch targets."
        )
    
    # ✅ Weather-specific recommendations
    if weather_impact > 0.6:
        recommendations.append(
            "⛈️ Severe weather. Consider postponing or closer zones."
        )
    elif weather_impact < 0.3:
        recommendations.append(
            "☀️ Favorable weather. Ideal conditions for trip."
        )
    
    # ✅ Seasonal recommendations
    if seasonal_factor > 1.15:
        recommendations.append(
            "🌾 Peak season. Maximize catch - high prices!"
        )
    elif seasonal_factor < 0.85:
        recommendations.append(
            "🌴 Off-season. Focus on efficiency over volume."
        )
    
    return recommendations
```

---

---

# 📱 SECTION 5: Integration Flow - How Everything Works Together

## 5.1 User Journey: From Mobile App to Prediction

```
┌─────────────────────────────────────────────────────────────┐
│ 1. MOBILE APP (React Native/Expo)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User inputs:                                               │
│  • Boat selection                                           │
│  • Trip start/end location (Colombo → Galle)              │
│  • Trip parameters (speed, fishing hours, crew)            │
│  • Weather conditions (wind, waves)                        │
│  • Economic factors (fuel price, expected catch, price)   │
│                                                              │
│ ↓ Clicks "Predict Cost"                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. NestJS BACKEND - Cost Engine                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ POST /api/v1/cost-engine/predict                           │
│                                                              │
│ Cost Engine Service:                                        │
│ 1. Validate boat                                           │
│ 2. Calculate distance (Haversine formula)                 │
│ 3. Calculate WSI (Weather Severity Index)                │
│ 4. Calculate FESI (Economic Stress Index)                │
│ 5. Call Python ML for fuel prediction                    │
│                                                              │
│ ↓ Needs ML service results                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 3. PYTHON ML SERVICE (FastAPI)                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ POST http://localhost:5001/predict/fuel                   │
│                                                              │
│ Fuel Prediction Engine:                                    │
│ • Uses trained ML models                                  │
│ • Considers boat history                                 │
│ • Weather severity impact                                │
│ • Returns: predicted fuel liters                         │
│                                                              │
│ Returns: { predictedFuelLiters: 61.2 }                   │
│                                                              │
│ ↓                                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 4. NestJS BACKEND - Continue Calculations                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Resume Cost Engine Service:                                │
│ 6. Apply speed adjustments                                │
│ 7. Apply mode adjustments (island/international)          │
│ 8. Calculate total cost (fuel + crew + others)           │
│ 9. Handle external costs (preferences)                    │
│ 10. Call Python ML for profitability prediction          │
│                                                              │
│ ↓ Needs profitability results                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 5. PYTHON ML SERVICE - Profitability                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ POST http://localhost:5001/predict/profitability          │
│                                                              │
│ Profitability Engine:                                      │
│ • Analyze market risk                                     │
│ • Calculate seasonal factors                             │
│ • Run 100 Monte Carlo simulations                        │
│ • Calculate confidence intervals                         │
│ • Generate recommendations                               │
│                                                              │
│ Returns: {                                                 │
│   profitabilityProbability: 0.87,                         │
│   riskCategory: "low",                                    │
│   recommendations: [...]                                 │
│ }                                                          │
│                                                              │
│ ↓                                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 6. NestJS BACKEND - Build Final Response                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Resume Cost Engine Service:                                │
│ 11. Calculate carbon emissions                            │
│ 12. Generate recommendations                              │
│ 13. Build comprehensive response                          │
│ 14. Optionally save trip to database                     │
│                                                              │
│ Returns Complete Prediction Object                         │
│                                                              │
│ ↓                                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 7. MOBILE APP - Display Results                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Screen shows:                                              │
│ • ⛽ Predicted Fuel: 63.5L                                │
│ • 💰 Total Cost: Rs 17,620                               │
│ • 📈 Expected Profit: Rs 34,380                          │
│ • 🎯 Profitability: 87%                                 │
│ • ⚠️ Risk Level: LOW                                     │
│ • ✅ Recommendations (list)                              │
│                                                              │
│ User can:                                                  │
│ • Save trip for later                                    │
│ • Adjust parameters and re-predict                       │
│ • Confirm and start trip                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5.2 Complete Request/Response Example

### Request (From Mobile App):
```json
POST /api/v1/cost-engine/predict

{
  "boatId": "507f1f77bcf86cd799439011",
  "startLat": 6.9271,
  "startLon": 79.8612,
  "endLat": 6.0535,
  "endLon": 80.5657,
  "speed": 12,
  "fishingHours": 8,
  "numberOfDays": 1,
  "crewCount": 4,
  "windSpeed": 15,
  "waveHeight": 1.5,
  "fuelPrice": 120,
  "expectedCatch": 80,
  "marketPrice": 650,
  "mode": "island"
}
```

### Response:
```json
{
  "success": true,
  "data": {
    "distance": {
      "baseDistanceKm": 45.2,
      "predictedDistanceKm": 47.46,
      "drf": 0.05
    },
    "weather": {
      "wsi": 0.35,
      "normalized": {
        "wind": 0.30,
        "wave": 0.20,
        "rain": 0.0
      },
      "windSpeed": 15,
      "waveHeight": 1.5
    },
    "fuel": {
      "predictedFuelLiters": 63.5,
      "adjustedFuelLiters": 63.5,
      "fuelPerKmBase": 1.23,
      "weatherMultiplier": 1.35,
      "speedFactor": 1.038,
      "modeMultiplier": 1.0
    },
    "cost": {
      "fuelCost": 7620,
      "crewCost": 4000,
      "maintenanceCost": 2500,
      "insuranceCost": 1500,
      "licenseCost": 800,
      "otherCosts": 1200,
      "externalCostTotal": 0,
      "baseOperationalCost": 10020,
      "predictedTotalCost": 17620
    },
    "carbon": {
      "carbonEmissionKg": 3.81,
      "carbonPerKgCatch": 0.0476
    },
    "profitability": {
      "expectedRevenue": 52000,
      "profit": 34380,
      "profitabilityProbability": 0.87,
      "riskCategory": "low"
    },
    "economics": {
      "fesi": 0.45,
      "fuelPrice": 120,
      "marketPrice": 650
    },
    "mode": {
      "selectedMode": "island",
      "tripDurationHours": 11.96
    },
    "recommendations": [
      "✅ Conditions look stable: proceed with standard plan and monitor weather updates."
    ],
    "mlFallback": false
  }
}
```

---

---

# 🎓 SECTION 6: Key Concepts Explained

## Concept 1: Haversine Formula (Distance Calculation)

```
Why Haversine?
- Earth is spherical (not flat)
- Cannot use simple Pythagoras theorem
- Accounts for Earth's curvature

Formula: d = 2R × arcsin(√(sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)))

Example:
  Colombo: (6.9271°N, 79.8612°E)
  Galle: (6.0535°N, 80.5657°E)
  
  Distance = 45.2 km (great-circle distance)
  Actual route = 45.2 × 1.05 = 47.46 km (with 5% detour factor)
```

---

## Concept 2: Weather Severity Index (WSI)

```
Component Weights:
- Wind Speed: 50%
- Wave Height: 50%

Normalization:
- Wind: 0-25 knots → 0-1 scale
- Waves: 0-3 meters → 0-1 scale

Calculation:
  WSI = (wind_normalized × 0.5) + (wave_normalized × 0.5)

Interpretation:
  WSI = 0.0  → Perfect weather (calm)
  WSI = 0.35 → Moderate conditions (our example)
  WSI = 0.65 → Severe weather (risky)
  WSI = 1.0  → Extreme conditions (very dangerous)

Impact:
  - Affects fuel consumption (higher WSI = more fuel)
  - Affects trip duration (slower speed in rough seas)
  - Increases operational risk
```

---

## Concept 3: Fuel Economic Stress Index (FESI)

```
Components:
1. Fuel Price Component (How expensive is fuel?)
2. Market Price Component (Is fish price good?)
3. Weather Component (Will weather increase costs?)

Weights:
- Fuel: 40%
- Market: 35%
- Weather: 25%

Calculation:
  FESI = (0.4 × fuel_component) + (0.35 × market_component) + (0.25 × weather_component)

Interpretation:
  FESI = 0.2  → Low stress (economically healthy)
  FESI = 0.45 → Medium stress (our example)
  FESI = 0.7  → High stress (economically vulnerable)
  FESI = 0.9  → Critical stress (severe economic risk)
```

---

## Concept 4: Monte Carlo Simulation

```
What is it?
- Run same calculation 100 times with random variations
- Each run has slightly different input values based on uncertainty
- Analyze distribution of results

Why use it?
- Accounting for uncertainty in predictions
- Getting probability distributions instead of single values
- Understanding best/worst case scenarios

Example Process:
  Run 1: Revenue varies by +2%, Cost varies by +1% → Profit = 34,500
  Run 2: Revenue varies by -3%, Cost varies by +2% → Profit = 32,468
  Run 3: Revenue varies by +1%, Cost varies by -1% → Profit = 35,200
  ...
  Run 100: Revenue varies by -2%, Cost varies by +1% → Profit = 33,200

Results:
  Average profit (mean): 34,380
  Worst case (10th percentile): 28,500
  Best case (90th percentile): 40,200
  Success probability (% > 0): 87%
```

---

## Concept 5: Confidence Intervals

```
What it means:
- Range of values where actual result will likely fall
- Higher percentage = wider range

Example (from our scenario):
  
  95% Confidence Interval: [28,000 - 40,500]
    → 95% sure profit will be in this range
    → Only 2.5% chance profit is less than 28,000
    → Only 2.5% chance profit is more than 40,500

  80% Confidence Interval: [28,500 - 40,200]
    → 80% sure profit will be in this range
    → Narrower but more likely to be accurate

  50% Confidence Interval: [32,000 - 36,500]
    → 50% sure profit will be in this range
    → Even narrower, very likely

Visualized:
  
  Probability
       ▲
       │
       │      ┌─────────────────────────┐ 95% CI
       │    ┌─────────────────────────────┐ 80% CI
       │  ┌───────────────────────────────┐ 50% CI
       │  │                               │
       │  ├───────────────────────────────┤
       │  28K   32K   34.4K  36.5K   40.5K
       └─────────────────────────────────────→
```

---

---

# 📝 SUMMARY - Complete Code Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    FISH PRICE PREDICTION COMPONENT              │
│                         සම්පූර්ණ සිස්ටම්                       │
└────────────────────────────────────────────────────────────────┘

1️⃣ MARKET DATA MANAGEMENT
   File: fish-market/fish-market.service.ts
   • Store daily market prices (fish type, grade, price)
   • Retrieve prices for date ranges
   • Track pricing trends over time
   • Support Admin CRUD operations

2️⃣ TRIP COST PREDICTION (NestJS)
   File: cost-engine/cost-engine.service.ts
   
   Input Validation
   ↓
   Distance Calculation (Haversine)
   ↓
   Weather Analysis (WSI)
   ↓
   Economic Analysis (FESI)
   ↓
   ML Service Call: /predict/fuel
   ↓
   Speed & Mode Adjustments
   ↓
   Total Cost Calculation
   ↓
   ML Service Call: /predict/profitability
   ↓
   Recommendation Generation
   ↓
   Response Assembly

3️⃣ ML SERVICES (Python/FastAPI)
   
   Fuel Prediction Engine:
   • Trained models for fuel consumption
   • Considers boat specifications
   • Accounts for weather & speed impacts
   • Returns predicted liters
   
   Profitability Engine:
   • Market risk analysis
   • Seasonal adjustments
   • Monte Carlo simulations (100 runs)
   • Confidence interval calculations
   • Risk categorization
   • Actionable recommendations

4️⃣ DATABASE STORAGE (MongoDB)
   • Fish market entries (historical prices)
   • Trip records (planned & completed)
   • User cost preferences
   • Market history for analysis

5️⃣ MOBILE APP INTEGRATION
   • Displays predictions in user-friendly UI
   • Shows fuel, cost, profit, and recommendations
   • Allows trip saving & sharing
   • Tracks historical predictions vs actual

═══════════════════════════════════════════════════════════════════

KEY TAKEAWAYS:

✅ System uses multiple techniques:
   - Haversine formula for distance
   - Statistical calculations for risk
   - Machine learning for predictions
   - Monte Carlo for uncertainty
   - Weighted scoring for complex analysis

✅ Fallback mechanisms:
   - If ML service down → Use baseline calculations
   - If external costs missing → Use defaults
   - If history insufficient → Use medium estimates

✅ User-centric design:
   - Simple input form
   - Complex calculations hidden
   - Clear recommendations
   - Confidence metrics provided
   - Risk categorization
   - Actionable insights

✅ Continuous improvement:
   - Learns from actual vs predicted
   - Updates market history
   - Refines ML models
   - Tracks success rates
```

---

**Document Created:** May 4, 2026
**Framework:** NestJS (Backend) + FastAPI (ML)
**Database:** MongoDB
**Frontend:** React Native (Expo)

---

**ස්තූතියි! අපූර්ණ තොරතුරු ලබා දුන් එක අසිරිමි! 🙏**
