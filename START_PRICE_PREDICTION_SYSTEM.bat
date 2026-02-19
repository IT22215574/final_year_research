@echo off
echo ============================================
echo 🐟 FISH PRICE PREDICTION - COMPLETE SYSTEM
echo ============================================
echo.
echo This will start:
echo  🤖 Price Prediction API (Port 8000)
echo  📱 Mobile App (Expo)
echo.
echo ⚠️  Make sure you're on: price-prediction-mobile-app branch
echo.
pause

echo.
echo 🔍 Checking branch...
git branch --show-current
echo.

echo 🚀 Step 1: Starting Price Prediction API...
start "Fish Price API" cmd /k "cd api-server && python api_server.py"

echo ⏳ Waiting for API to start...
timeout /t 5 /nobreak >nul

echo.
echo ✅ API Started at http://localhost:8000
echo.

echo 📦 Step 2: Checking mobile dependencies...
cd mobile

if not exist "node_modules" (
    echo 📦 Installing dependencies for first time...
    echo ⏳ This will take 3-5 minutes...
    call npm install
    if errorlevel 1 (
        echo ❌ npm install failed! Trying pnpm...
        call pnpm install
    )
)

echo.
echo 📱 Step 3: Starting Mobile App...
echo.
echo 📲 Options:
echo   - Press 'w' for web browser
echo   - Scan QR code with Expo Go app
echo   - Press 'a' for Android
echo   - Press 'i' for iOS
echo.
npm start
