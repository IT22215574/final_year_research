@echo off
echo ========================================  
echo Starting Mobile App (Network Fixed)
echo ========================================

cd /d "%~dp0mobile"

echo Mobile app configured to connect to:
echo   - Backend: http://172.28.22.68:3000
echo   - Prediction API: http://172.28.22.68:8000

echo Starting Expo development server...
call node ../start-expo.js

pause