# Postman CSV Export - Step by Step

## ✅ Updated: Now Returns Token in Response Body

The backend has been updated to always return the JWT token in the response (not just in cookies).

---

## Step 1️⃣: Login and Get Token

**Method:** POST  
**URL:** `http://localhost:5000/api/v1/auth/signin`

**Headers:**

```
Content-Type: application/json
```

**Body (Raw JSON):**

```json
{
  "email": "sjayaweera@gmail.com",
  "password": "your_password"
}
```

**Send Request**

You'll get a response like:

```json
{
  "success": true,
  "data": {
    "_id": "69d5c390747313783762a47b",
    "username": "sp4890",
    "email": "sjayaweera@gmail.com",
    "firstName": "Sp",
    ...
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OWQ1YzM5MD..."
  }
}
```

✅ **Copy the `access_token` value** (long string starting with `eyJhb...`)

---

## Step 2️⃣: Download Training Data CSV

**Method:** GET  
**URL:** `http://localhost:5000/api/v1/training-candidates/export/csv`

**Headers:**

```
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
```

Replace `YOUR_ACCESS_TOKEN_HERE` with the token from Step 1.

**Send Request**

You'll get a CSV file with columns:

- `boat_type`
- `source_trip_id`
- `boat_id`
- `feature_distanceKm`
- `feature_engineHP`
- `feature_fishingHours`
- `feature_speed`
- `feature_weatherSeverityIndex`
- `label_fuelUsedLiters`
- `label_estimatedCostLKR`

---

## Step 3️⃣: Download Specific Boat Type CSV

**Method:** GET  
**URL:** `http://localhost:5000/api/v1/training-candidates/export/csv/Fiber%20Boat%20(small)`

**Headers:**

```
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
```

**Boat Type Options** (URL encode spaces as `%20`):

- `Fiber%20Boat%20(small)` → Fiber Boat (small)
- `Fiber%20Boat%20(medium)` → Fiber Boat (medium)
- `One%20Day%20Boat` → One Day Boat
- `Multi%20Day%20Boat` → Multi Day Boat
- `Longliner` → Longliner

---

## 🔑 Complete Bearer Token Format

In Postman Authorization header:

```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OWQ1YzM5MD...
```

OR in key/value Headers:

```
Key: Authorization
Value: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OWQ1YzM5MD...
```

---

## 💡 Pro Tips

1. **Reuse Token**: The token is valid for 1 hour. Use it for multiple CSV requests.
2. **Save to File**: In Postman, click "Send and Download" to save CSV directly
3. **Test with Python**: Use the `fetch_training_data.py` script after getting a token
4. **No Admin Required**: CSV export only needs valid JWT (doesn't require admin role)

---

## 🐛 Troubleshooting

**Error: "No resources found**  
→ No approved training candidates exist yet. You need to create trips and approve them as candidates.

**Error: "Unauthorized"**  
→ Token expired or invalid. Get a new token from login step.

**Error: "Forbidden"**  
→ Check you're using the correct Authorization header format: `Bearer TOKEN_HERE`
