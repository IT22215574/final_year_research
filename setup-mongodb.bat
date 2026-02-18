@echo off
echo ============================================
echo Quick MongoDB Setup for Windows
echo ============================================

echo [Option 1] Installing MongoDB Community Server...
echo.
echo 1. Go to: https://www.mongodb.com/try/download/community
echo 2. Download MongoDB Community Server (Windows x64)
echo 3. Run the installer (use default settings)
echo 4. During installation, check "Install MongoDB as a Service"
echo 5. After installation, MongoDB will start automatically
echo.

echo [Option 2] Using Docker (if you have Docker installed)...
echo Run: docker run -d -p 27017:27017 --name mongodb mongo:latest
echo.

echo [Option 3] Quick Online Database Setup...
pause
echo Opening MongoDB Atlas setup guide...
start https://www.mongodb.com/atlas/database

echo.
echo After setting up MongoDB, restart your application with:
echo npm run start:dev
echo.
pause