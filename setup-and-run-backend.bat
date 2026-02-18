@echo off
echo ============================================
echo MongoDB Atlas Connection Setup and Test
echo ============================================
echo.

cd /d "%~dp0Backend"

echo [1/3] Installing dependencies...
call npm install

echo.
echo [2/3] Testing MongoDB Atlas connection...
node test-mongodb-connection.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [3/3] Starting NestJS application...
    npm run start:dev
) else (
    echo.
    echo ❌ MongoDB connection test failed!
    echo Please check your .env configuration and try again.
    echo Refer to MongoDB_Atlas_Setup_Guide.md for detailed instructions.
    pause
)