@echo off
echo ========================================
echo Starting Both Backend Services
echo ========================================
echo.
echo 1. Python Fish Prediction API (Port 8000)
echo 2. NestJS User Auth API (Port 5000)
echo.
echo Press Ctrl+C to stop all services
echo ========================================
echo.

:: Start Python API in new window
start "Fish Prediction API" cmd /k "cd /d "%~dp0" && "..\.venv\Scripts\python.exe" -m uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload"

:: Wait 3 seconds
timeout /t 3 /nobreak > nul

:: Start NestJS in new window
start "User Auth API" cmd /k "cd /d "%~dp0" && npm run start:dev"

echo.
echo ✓ Both backends starting in separate windows
echo ✓ Python API: http://192.168.8.100:8000
echo ✓ NestJS API: http://localhost:5000
echo.
pause
