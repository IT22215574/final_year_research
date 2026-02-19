@echo off
echo ========================================
echo Starting Backend Server (Fixed Version)
echo ========================================

cd /d "%~dp0Backend"

echo Checking for dependencies...
if not exist node_modules (
    echo Installing dependencies...
    call pnpm install
)

echo Starting NestJS backend server...
echo Backend will be available at:
echo   - Local: http://localhost:3000
echo   - Network: http://172.28.22.68:3000

call npx ts-node src/main.ts

pause