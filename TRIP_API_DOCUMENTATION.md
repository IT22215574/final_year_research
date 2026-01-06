# Trip Management API Documentation

## Overview

The Trip Management system allows users to save and track their fishing trip predictions, including all cost breakdowns and trip details.

## Backend Endpoints

### Base URL: `http://localhost:3000`

---

### 1. **Create a New Trip**

**POST** `/trips`

Save a trip prediction to the database.

**Request Body:**

```json
{
  "userId": "user_id_here",
  "boatType": "IMUL",
  "engineHp": 75,
  "tripDays": 1,
  "distanceKm": 50,
  "windKph": 15,
  "waveM": 1.0,
  "month": 3,
  "portName": "Colombo",
  "fishingZone": "Colombo Deep Sea Zone",
  "fishingZoneId": "WC1",
  "dieselPriceLKR": 205,
  "petrolPriceLKR": 195,
  "kerosenePriceLKR": 185,
  "baseCost": 15234.56,
  "fuelCostEstimate": 14650.0,
  "iceCostEstimate": 584.56,
  "externalCosts": [
    {
      "type": "Crew Payment",
      "amount": 5000,
      "description": "3 crew members"
    }
  ],
  "externalCostsTotal": 5000,
  "totalTripCost": 20234.56,
  "currency": "LKR",
  "breakdown": {
    "baseCostPercentage": 75.3,
    "externalCostsPercentage": 24.7
  },
  "status": "planned"
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Trip created successfully",
  "data": {
    "_id": "trip_id_here",
    "userId": "user_id_here",
    "boatType": "IMUL",
    "totalTripCost": 20234.56,
    "status": "planned",
    "createdAt": "2026-01-05T10:30:00.000Z",
    ...
  }
}
```

---

### 2. **Get User's Recent Trips**

**GET** `/trips/user/:userId/recent?limit=5`

Retrieve the most recent trips for a user.

**Query Parameters:**

- `limit` (optional): Number of trips to return (default: 5)

**Response:**

```json
{
  "status": "success",
  "count": 5,
  "data": [
    {
      "_id": "trip_id_1",
      "boatType": "IMUL",
      "tripDays": 1,
      "distanceKm": 50,
      "portName": "Colombo",
      "fishingZone": "Colombo Deep Sea Zone",
      "baseCost": 15234.56,
      "fuelCostEstimate": 14650.00,
      "iceCostEstimate": 584.56,
      "externalCosts": [...],
      "externalCostsTotal": 5000,
      "totalTripCost": 20234.56,
      "status": "planned",
      "createdAt": "2026-01-05T10:30:00.000Z"
    },
    ...
  ]
}
```

---

### 3. **Get User's Trip History (Paginated)**

**GET** `/trips/user/:userId?page=1&limit=10`

Retrieve all trips for a user with pagination.

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**

```json
{
  "status": "success",
  "data": {
    "trips": [...],
    "total": 25,
    "page": 1,
    "totalPages": 3
  }
}
```

---

### 4. **Get User's Trip Statistics**

**GET** `/trips/user/:userId/stats`

Get aggregated statistics for a user's trips.

**Response:**

```json
{
  "status": "success",
  "data": {
    "totalTrips": 10,
    "totalCost": 250000,
    "avgCostPerTrip": 25000,
    "totalDistance": 500,
    "statusBreakdown": [
      { "status": "planned", "count": 3 },
      { "status": "completed", "count": 7 }
    ]
  }
}
```

---

### 5. **Get Single Trip Details**

**GET** `/trips/:id`

Retrieve detailed information about a specific trip.

**Response:**

```json
{
  "status": "success",
  "data": {
    "_id": "trip_id_here",
    "userId": {
      "_id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+94701234567"
    },
    "boatType": "IMUL",
    "engineHp": 75,
    "tripDays": 1,
    "distanceKm": 50,
    "portName": "Colombo",
    "fishingZone": "Colombo Deep Sea Zone",
    "baseCost": 15234.56,
    "externalCosts": [...],
    "totalTripCost": 20234.56,
    "status": "planned",
    "createdAt": "2026-01-05T10:30:00.000Z",
    "updatedAt": "2026-01-05T10:30:00.000Z"
  }
}
```

---

### 6. **Update Trip**

**PATCH** `/trips/:id`

Update trip details (e.g., change status from "planned" to "ongoing").

**Request Body:**

```json
{
  "status": "ongoing",
  "notes": "Started the trip early morning"
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Trip updated successfully",
  "data": {
    ...updated trip
  }
}
```

---

### 7. **Delete Trip**

**DELETE** `/trips/:id`

Delete a trip from the database.

**Response:** `204 No Content`

---

## Mobile App Usage

### Save Trip After Prediction

```typescript
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = process.env.EXPO_PUBLIC_API_KEY;

const handleSaveTrip = async () => {
  const userId = await AsyncStorage.getItem("userId");

  const tripPayload = {
    userId,
    boatType: tripData.boat_type,
    engineHp: parseFloat(tripData.engine_hp),
    tripDays: parseInt(tripData.trip_days),
    distanceKm: parseFloat(tripData.distance_km),
    // ... other trip details
    baseCost: predictionResult.base_cost,
    externalCosts: predictionResult.external_costs,
    totalTripCost: predictionResult.total_trip_cost,
    status: "planned",
  };

  const response = await axios.post(`${API}/trips`, tripPayload);

  if (response.data.status === "success") {
    Alert.alert("Trip Saved!", "Your trip has been saved successfully.");
  }
};
```

### Load User's Trips

```typescript
const loadTrips = async (userId: string) => {
  const response = await axios.get(`${API}/trips/user/${userId}/recent`, {
    params: { limit: 20 },
  });

  if (response.data.status === "success") {
    setTrips(response.data.data);
  }
};
```

### Load Trip Statistics

```typescript
const loadStats = async (userId: string) => {
  const response = await axios.get(`${API}/trips/user/${userId}/stats`);

  if (response.data.status === "success") {
    setStats(response.data.data);
  }
};
```

---

## MongoDB Schema

### Trip Document Structure

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),

  // Trip Details
  boatType: string,
  engineHp: number,
  tripDays: number,
  distanceKm: number,
  windKph: number,
  waveM: number,
  month: number,
  portName: string,
  fishingZone?: string,
  fishingZoneId?: string,

  // Fuel Prices
  dieselPriceLKR: number,
  petrolPriceLKR: number,
  kerosenePriceLKR: number,

  // Base Costs (from ML prediction)
  baseCost: number,
  fuelCostEstimate: number,
  iceCostEstimate: number,

  // External Costs
  externalCosts: [
    {
      type: string,
      amount: number,
      description?: string
    }
  ],
  externalCostsTotal: number,

  // Total Cost
  totalTripCost: number,
  currency: string,

  // Breakdown
  breakdown: {
    baseCostPercentage: number,
    externalCostsPercentage: number
  },

  // Trip Status
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled',
  notes?: string,
  startDate?: Date,
  endDate?: Date,

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

---

## Status Values

- **planned**: Trip is planned but not started
- **ongoing**: Trip is currently in progress
- **completed**: Trip has been completed
- **cancelled**: Trip was cancelled

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "status": "error",
  "message": "Error message here",
  "error": "Detailed error information (development only)"
}
```

**Common Status Codes:**

- `200 OK` - Request successful
- `201 Created` - Trip created successfully
- `204 No Content` - Trip deleted successfully
- `400 Bad Request` - Invalid input data
- `404 Not Found` - Trip or user not found
- `500 Internal Server Error` - Server error

---

## Testing

### Test with cURL

```bash
# Create a trip
curl -X POST http://localhost:3000/trips \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your_user_id",
    "boatType": "IMUL",
    "engineHp": 75,
    "tripDays": 1,
    "distanceKm": 50,
    "windKph": 15,
    "waveM": 1.0,
    "month": 3,
    "portName": "Colombo",
    "baseCost": 15234.56,
    "fuelCostEstimate": 14650.00,
    "iceCostEstimate": 584.56,
    "externalCosts": [],
    "externalCostsTotal": 0,
    "totalTripCost": 15234.56,
    "currency": "LKR",
    "breakdown": {
      "baseCostPercentage": 100,
      "externalCostsPercentage": 0
    },
    "status": "planned"
  }'

# Get user's recent trips
curl http://localhost:3000/trips/user/your_user_id/recent?limit=5

# Get user's stats
curl http://localhost:3000/trips/user/your_user_id/stats
```

---

## Features

✅ Save trip predictions with all cost breakdowns  
✅ View trip history with pagination  
✅ Track trip statistics (total trips, costs, distance)  
✅ Support for external costs (crew, food, equipment, etc.)  
✅ Trip status management (planned → ongoing → completed)  
✅ Fishing zone tracking  
✅ Cost breakdown percentages  
✅ Notes and additional trip details

---

**Version:** 1.0.0  
**Last Updated:** January 5, 2026
