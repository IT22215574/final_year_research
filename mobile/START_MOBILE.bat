@echo off
echo ============================================
echo 📱 FISH PRICE PREDICTION - MOBILE APP
echo ============================================
echo.
echo ⚠️  Make sure API is running on Port 8000!
echo    If not, run: START_PRICE_PREDICTION_SYSTEM.bat
echo.
pause

if not exist "node_modules" (
    echo 📦 First time setup: Installing dependencies...
    echo ⏳ This may take 3-5 minutes...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo ❌ npm install failed!
        echo 💡 Try: pnpm install
        pause
        exit /b 1
    )
    echo.
    echo ✅ Installation complete!
    echo.
)

echo 🚀 Starting Expo development server...
echo.
echo 📲 Options:
echo   - Press 'w' for web browser  
echo   - Scan QR code with Expo Go app
echo   - Press 'a' for Android emulator
echo   - Press 'i' for iOS simulator
echo.
echo ⚠️  API should be at: http://localhost:8000
echo.
npm start
