# Postman Setup for CSV Export

## Quick Steps

### 1️⃣ Login and Get Token

**Request Type:** POST

```
URL: http://localhost:5000/api/v1/auth/signin

Headers:
  Content-Type: application/json

Body (JSON):
{
  "email": "fishadmin",
  "password": "your_password"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

✅ **Copy the `access_token` value**

---

### 2️⃣ Download All Training Data CSV

**Request Type:** GET

```
URL: http://localhost:5000/api/v1/training-candidates/export/csv

Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

Replace `YOUR_TOKEN_HERE` with the token from Step 1.

**Response:** CSV file (auto-downloads)

---

### 3️⃣ Download Specific Boat Type CSV

**Request Type:** GET

```
URL: http://localhost:5000/api/v1/training-candidates/export/csv/Fiber%20Boat%20(small)

Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

**Boat Type Options:**

- `Fiber%20Boat%20(small)` → Fiber Boat (small)
- `Fiber%20Boat%20(medium)` → Fiber Boat (medium)
- `One%20Day%20Boat` → One Day Boat
- `Multi%20Day%20Boat` → Multi Day Boat
- `Longliner` → Longliner

**Response:** CSV file (auto-downloads)

---

## Postman Collection (Save as JSON)

```json
{
  "info": {
    "name": "FishAI Training Candidates CSV",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Login Admin",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"fishadmin\",\n  \"password\": \"your_password\"\n}"
        },
        "url": {
          "raw": "http://localhost:5000/api/v1/auth/signin",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "v1", "auth", "signin"]
        }
      }
    },
    {
      "name": "2. Export All Data CSV",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}"
          }
        ],
        "url": {
          "raw": "http://localhost:5000/api/v1/training-candidates/export/csv",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "v1", "training-candidates", "export", "csv"]
        }
      }
    },
    {
      "name": "3. Export Fiber Boat (Small) CSV",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{access_token}}"
          }
        ],
        "url": {
          "raw": "http://localhost:5000/api/v1/training-candidates/export/csv/Fiber%20Boat%20(small)",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": [
            "api",
            "v1",
            "training-candidates",
            "export",
            "csv",
            "Fiber Boat (small)"
          ]
        }
      }
    }
  ]
}
```

---

## Notes

✅ **CSV Export** - Only requires valid JWT token (any authenticated user)
✅ **Approve/Reject** - Still requires admin role (unchanged)
✅ **Token Format** - Use `Bearer YOUR_TOKEN_HERE` in Authorization header
✅ **Response** - CSV file with columns: boat*type, source_trip_id, boat_id, feature*_, label\__
