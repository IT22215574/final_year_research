# Dataset Upload API Quick Reference

## Base URL
```
https://your-api.com/api/v1
```

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Admin-Only Endpoints
All endpoints require **Admin role** in addition to valid JWT token.

---

## Endpoints

### 1. Upload Dataset File
**Endpoint:** `POST /training-uploads/upload`

**Content-Type:** `multipart/form-data`

**Parameters:**
```
file: <CSV or JSON file>           (required, max 50MB)
boatType: IDAT|IMUI|MTRP|OFRP     (required)
```

**Response:**
```json
{
  "message": "Dataset uploaded successfully",
  "dataset": {
    "id": "507f1f77bcf86cd799439011",
    "filename": "training_data.csv",
    "boatType": "IDAT",
    "uploadSource": "csv",
    "status": "PENDING",
    "rowCount": 100,
    "processedCount": 98,
    "errorCount": 2,
    "validationErrors": [
      "Row 5: Missing required field boatId",
      "Row 42: actualCost must be positive"
    ],
    "createdAt": "2026-05-04T10:30:00Z"
  }
}
```

**Example (cURL):**
```bash
curl -X POST https://api.com/api/v1/training-uploads/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@training_data.csv" \
  -F "boatType=IDAT"
```

---

### 2. Get Pending Datasets (For Review)
**Endpoint:** `GET /training-uploads/pending`

**Response:**
```json
{
  "count": 3,
  "datasets": [
    {
      "id": "507f1f77bcf86cd799439011",
      "filename": "upload_may_4.csv",
      "boatType": "IDAT",
      "uploadSource": "csv",
      "rowCount": 150,
      "processedCount": 148,
      "errorCount": 2,
      "validationErrors": ["Row 5: ...", "Row 10: ..."],
      "uploaderId": "user_123",
      "createdAt": "2026-05-04T10:30:00Z"
    },
    ...
  ]
}
```

---

### 3. Get Approved Datasets
**Endpoint:** `GET /training-uploads/approved`

**Response:**
```json
{
  "count": 5,
  "datasets": [
    {
      "id": "507f1f77bcf86cd799439011",
      "filename": "may_4_approved.csv",
      "boatType": "IMUI",
      "status": "APPROVED",
      "rowCount": 200,
      "processedCount": 200,
      "reviewedAt": "2026-05-04T11:00:00Z",
      "syncedAt": "2026-05-04T11:05:00Z"
    },
    ...
  ]
}
```

---

### 4. Get Datasets by Boat Type
**Endpoint:** `GET /training-uploads/boat-type/{boatType}`

**Path Parameters:**
- `boatType`: IDAT | IMUI | MTRP | OFRP

**Response:**
```json
{
  "boatType": "IDAT",
  "count": 12,
  "datasets": [...]
}
```

---

### 5. Get Dataset Details (With Records)
**Endpoint:** `GET /training-uploads/{id}`

**Path Parameters:**
- `id`: Dataset ID

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "filename": "training_data.csv",
  "boatType": "IDAT",
  "uploadSource": "csv",
  "status": "PENDING",
  "rowCount": 100,
  "processedCount": 98,
  "errorCount": 2,
  "validationErrors": ["Row 5: ...", "Row 42: ..."],
  "records": [
    {
      "boatType": "IDAT",
      "boatId": "boat_001",
      "featuresSnapshot": {
        "speed": 7.7,
        "weatherSeverityIndex": 0.4,
        "distanceKm": 101.85,
        "engineHP": 68,
        "fishingHours": 23,
        "numberOfDays": 1,
        "predictedFuelLiters": 205.89
      },
      "labelSnapshot": {
        "actualFuelLiters": 231.4,
        "actualCost": 92690
      },
      "validationStatus": "VALID"
    },
    ...
  ],
  "uploaderId": "user_123",
  "createdAt": "2026-05-04T10:30:00Z"
}
```

---

### 6. Approve Dataset
**Endpoint:** `POST /training-uploads/{id}/approve`

**Path Parameters:**
- `id`: Dataset ID

**Request Body:**
```json
{
  "reason": "Data quality looks good, ready for training"
}
```

**Response:**
```json
{
  "message": "Dataset approved successfully and synced to training files",
  "dataset": {
    "id": "507f1f77bcf86cd799439011",
    "status": "APPROVED",
    "processedCount": 98,
    "errorCount": 2,
    "reviewedAt": "2026-05-04T11:00:00Z"
  }
}
```

**Note:** ✅ CSV files are automatically generated/updated in `model/cost_prediction/training_data/`

---

### 7. Reject Dataset
**Endpoint:** `POST /training-uploads/{id}/reject`

**Path Parameters:**
- `id`: Dataset ID

**Request Body:**
```json
{
  "reason": "Too many validation errors, please fix and reupload"
}
```

**Response:**
```json
{
  "message": "Dataset rejected",
  "dataset": {
    "id": "507f1f77bcf86cd799439011",
    "status": "REJECTED",
    "reason": "Too many validation errors, please fix and reupload",
    "rejectedAt": "2026-05-04T11:00:00Z"
  }
}
```

---

### 8. Get Statistics
**Endpoint:** `GET /training-uploads/stats/all`

**Response:**
```json
{
  "pending": 3,
  "approved": 15,
  "rejected": 2,
  "trained": 8,
  "byBoatType": {
    "IDAT": 12,
    "IMUI": 10,
    "MTRP": 5,
    "OFRP": 1
  }
}
```

---

## CSV/JSON Format Requirements

### Required Fields
- **boat_id** (or variants: boatId, Boat ID) - Must uniquely identify boat

### Feature Columns (At least one required)
```
speed / boat_speed / speed_kmh
distanceKm / distance_km / distance
engineHP / engine_hp / horsePower
fishingHours / fishing_hours / hours
numberOfDays / number_of_days / days
weatherSeverityIndex / weather_severity_index / weather_index
predictedFuelLiters / predicted_fuel_liters / predicted_fuel
```

### Label Columns (At least one required)
```
actualFuelLiters / actual_fuel_liters / actual_fuel / fuel_used / fuelUsed
actualCost / actual_cost / total_cost / cost / totalCost
```

---

## CSV Example

```csv
boat_id,speed,distanceKm,engineHP,fishingHours,numberOfDays,predictedFuelLiters,actualFuelLiters,actualCost
boat_001,7.7,101.85,68,23,1,205.89,231.4,92690
boat_002,8.2,95.30,72,22,1,198.45,220.0,85000
boat_003,6.5,110.20,65,24,1,212.50,245.8,98500
```

## JSON Example

```json
[
  {
    "boat_id": "boat_001",
    "speed": 7.7,
    "distanceKm": 101.85,
    "engineHP": 68,
    "fishingHours": 23,
    "numberOfDays": 1,
    "predictedFuelLiters": 205.89,
    "actualFuelLiters": 231.4,
    "actualCost": 92690
  },
  {
    "boat_id": "boat_002",
    "speed": 8.2,
    "distanceKm": 95.30,
    "engineHP": 72,
    "fishingHours": 22,
    "numberOfDays": 1,
    "predictedFuelLiters": 198.45,
    "actualFuelLiters": 220.0,
    "actualCost": 85000
  }
]
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "No file provided",
  "statusCode": 400
}
```

### 401 Unauthorized
```json
{
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "message": "Dataset 507f1f77bcf86cd799439011 not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error",
  "error": "Details..."
}
```

---

## Validation Rules

✅ File types: CSV or JSON only
✅ File size: Max 50MB
✅ Required field: boatId (or variants)
✅ Features: At least one feature column with value
✅ Labels: At least one label column with value
✅ Numbers: Must parse as valid numbers
✅ Ranges: Positive values for distances, costs, fuel
✅ Boat Type: Must be one of: IDAT, IMUI, MTRP, OFRP

---

## Workflow Example

### Step 1: Upload Dataset
```bash
curl -X POST https://api.com/api/v1/training-uploads/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@my_training_data.csv" \
  -F "boatType=IDAT"
```

Response: `{"dataset": {"id": "abc123", "status": "PENDING", ...}}`

### Step 2: Check Pending Datasets
```bash
curl https://api.com/api/v1/training-uploads/pending \
  -H "Authorization: Bearer $TOKEN"
```

### Step 3: Review Dataset Details
```bash
curl https://api.com/api/v1/training-uploads/abc123 \
  -H "Authorization: Bearer $TOKEN"
```

### Step 4: Approve Dataset
```bash
curl -X POST https://api.com/api/v1/training-uploads/abc123/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Data looks good"}'
```

**Result:** ✅ Dataset approved & CSV files updated automatically!

---

## CSV Output Locations

After approval, datasets are automatically synced to:

```
model/cost_prediction/training_data/
├── training_data_all.csv      # All approved records
├── training_data_idat.csv     # IDAT boat type only
├── training_data_imui.csv     # IMUI boat type only
├── training_data_mtrp.csv     # MTRP boat type only
└── training_data_ofrp.csv     # OFRP boat type only
```

**These CSVs are automatically picked up by model training in Colab!**

---

## Status Flow

```
PENDING → (Admin reviews) → APPROVED → (CSV sync) → TRAINED
         ↓
         REJECTED → (No CSV generation)
```

- **PENDING**: Waiting for admin review
- **APPROVED**: Approved by admin, ready for training
- **TRAINED**: Data included in model training
- **REJECTED**: Admin rejected, not used for training

---

## Notes

- All times in UTC ISO 8601 format
- `source_trip_id` is `null` for uploads (to distinguish from manual trip entries)
- Uploads with errors can still be approved (only valid records are used)
- CSV files are boat-wise separated automatically
- Both manual trips and uploads are merged in final CSVs
