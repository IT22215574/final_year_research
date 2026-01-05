# 🚀 Smart Fisher Lanka - Complete Application Startup Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  📱 Mobile App (React Native/Expo)                          │
│                         ↓                                    │
│  🏢 Backend (NestJS) - Port 3000                            │
│                         ↓                                    │
│  🤖 ML Service (Flask) - Port 5000                          │
│                         ↓                                    │
│  🧠 ML Model (trip_cost_predictor.pkl)                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Running the Complete Application

### **Step 1: Start ML Service (Terminal 1)**

```powershell
# Open Terminal 1
cd 'C:\Users\Piuminda Jayaweera\Desktop\RESEARCH\new\final_year_research\model_files'
python ml_service.py
```

**Expected Output:**
```
🚀 STARTING ML PREDICTION SERVICE
📊 Available Endpoints:
   GET  /health          - Health check
   GET  /model/info      - Model information
   POST /predict         - Single trip prediction
   POST /predict/batch   - Batch trip prediction

 * Running on http://127.0.0.1:5000
```

**Status**: ✅ Keep this terminal running

---

### **Step 2: Start Backend (Terminal 2)**

```powershell
# Open Terminal 2
cd 'C:\Users\Piuminda Jayaweera\Desktop\RESEARCH\new\final_year_research\Backend'

# Install axios (if not installed)
pnpm install axios

# Start backend
pnpm run start:dev
```

**Expected Output:**
```
[Nest] 12345  - LOG [NestFactory] Starting Nest application...
[Nest] 12345  - LOG [InstanceLoader] MlPredictionModule dependencies initialized
[Nest] 12345  - LOG [RoutesResolver] MlPredictionController {/api/ml-prediction}:
[Nest] 12345  - LOG [RouterExplorer] Mapped {/api/ml-prediction/health, GET}
[Nest] 12345  - LOG [RouterExplorer] Mapped {/api/ml-prediction/predict, POST}
[Nest] 12345  - LOG [NestApplication] Nest application successfully started
[Nest] 12345  - LOG Application is running on: http://localhost:3000
```

**Status**: ✅ Keep this terminal running

---

### **Step 3: Start Mobile App (Terminal 3)**

```powershell
# Open Terminal 3
cd 'C:\Users\Piuminda Jayaweera\Desktop\RESEARCH\new\final_year_research\mobile'

# Start Expo dev server
npx expo start
```

**Expected Output:**
```
Starting Metro Bundler
Metro waiting on exp://192.168.x.x:8081

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
```

**Options:**
- Press **`a`** - Open on Android device/emulator
- Press **`i`** - Open on iOS simulator
- Press **`w`** - Open in web browser
- Scan QR code with Expo Go app on your phone

**Status**: ✅ Keep this terminal running

---

## ✅ Testing the System

### Test 1: ML Service (Terminal 4)

```powershell
# Test ML service health
curl http://localhost:5000/health

# Expected: {"status":"healthy","service":"ml-prediction-service"}
```

```powershell
# Test prediction
curl -X POST http://localhost:5000/predict `
  -H "Content-Type: application/json" `
  -d '{
    "boat_type": "IMUL",
    "engine_hp": 75,
    "trip_days": 1,
    "distance_km": 50,
    "crew_size": 3,
    "ice_capacity_kg": 200,
    "water_capacity_L": 100,
    "avg_speed_kmh": 12.0,
    "trip_month": 3,
    "wind_kph": 15,
    "wave_height_m": 1.0,
    "weather_factor": 1.0,
    "region": "West",
    "is_multi_day": false,
    "has_engine": true,
    "is_deep_sea": false
  }'

# Expected: Prediction with costs
```

### Test 2: Backend API (Terminal 4)

```powershell
# Test backend health
curl http://localhost:3000/api/ml-prediction/health

# Expected: {"status":"success","data":{...}}
```

```powershell
# Test prediction through backend
curl -X POST http://localhost:3000/api/ml-prediction/predict-simple `
  -H "Content-Type: application/json" `
  -d '{
    "boatType": "IMUL",
    "tripDays": 1,
    "distanceKm": 50,
    "engineHp": 75,
    "crewSize": 3
  }'

# Expected: Prediction with costs
```

### Test 3: Mobile App

1. Open the app on your device/simulator
2. Navigate to the trip planning screen
3. Enter trip details:
   - Boat Type: IMUL
   - Trip Days: 1
   - Distance: 50 km
   - Crew Size: 3
4. Click "Calculate Cost"
5. Should see predicted costs:
   - Fuel Cost: ~LKR 15,000
   - Ice Cost: ~LKR 2,400
   - Water Cost: ~LKR 500
   - Total: ~LKR 18,000

---

## 🔧 Troubleshooting

### Problem: ML Service won't start

**Solution:**
```powershell
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process if needed
taskkill /PID <PID> /F

# Restart ML service
python ml_service.py
```

### Problem: Backend can't connect to ML service

**Solution:**
```powershell
# Check if ML service is running
curl http://localhost:5000/health

# If not, start ML service first (Terminal 1)

# Set environment variable (Backend/.env)
# Add: ML_SERVICE_URL=http://localhost:5000
```

### Problem: Mobile app can't connect to backend

**Solution:**
1. Check backend is running on port 3000
2. Update API URL in mobile app:
   - For Android emulator: `http://10.0.2.2:3000`
   - For iOS simulator: `http://localhost:3000`
   - For physical device: `http://YOUR_COMPUTER_IP:3000`
   - Replace `YOUR_COMPUTER_IP` with your actual local IP (e.g., 192.168.1.100)

### Problem: "Module not found" errors

**Solution:**
```powershell
# Python packages
pip install -r requirements.txt

# Backend packages
cd Backend
pnpm install

# Mobile packages
cd mobile
npm install
```

---

## 📊 Quick Status Check

Run this in Terminal 4 to check all services:

```powershell
# Check ML Service
Write-Host "1. ML Service (Port 5000):" -ForegroundColor Yellow
curl -s http://localhost:5000/health | ConvertFrom-Json

# Check Backend
Write-Host "`n2. Backend (Port 3000):" -ForegroundColor Yellow
curl -s http://localhost:3000/api/ml-prediction/health | ConvertFrom-Json

# Check ports
Write-Host "`n3. Active Ports:" -ForegroundColor Yellow
netstat -ano | findstr ":3000 :5000 :8081"
```

---

## 🎯 Summary

**Required Running Terminals:**

| Terminal | Service        | Port | Command                        |
|----------|----------------|------|--------------------------------|
| 1        | ML Service     | 5000 | `python ml_service.py`         |
| 2        | Backend        | 3000 | `pnpm run start:dev`           |
| 3        | Mobile App     | 8081 | `npx expo start`               |
| 4        | Testing        | -    | Test commands                  |

**Startup Order:**
1. ✅ Start ML Service first (Terminal 1)
2. ✅ Start Backend second (Terminal 2)
3. ✅ Start Mobile App last (Terminal 3)

**Access URLs:**
- ML Service: http://localhost:5000
- Backend API: http://localhost:3000
- Mobile App: Expo Dev Tools in browser
- API Docs: http://localhost:3000/api/ml-prediction/model-info

---

## 🚀 Production Deployment

For production, you'll need:

1. **ML Service**: Deploy on cloud with PM2 or Docker
2. **Backend**: Deploy on cloud (AWS, Heroku, etc.)
3. **Mobile App**: Build APK/IPA and publish to stores

See `ML_INTEGRATION_GUIDE.md` for detailed deployment instructions.

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Support**: Check documentation in `model_files/` folder
