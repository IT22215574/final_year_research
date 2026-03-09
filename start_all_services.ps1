# Complete Service Startup Script
# Starts NestJS Backend, Python Prediction API, and Mobile App

Write-Host "=== Fish Price Prediction System Startup ===" -ForegroundColor Green
Write-Host "Starting all services..." -ForegroundColor Blue

# Get network IP
$NetworkIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -ne "127.0.0.1" -and $_.IPAddress -ne "169.254.*"} | Select-Object -First 1).IPAddress
Write-Host "Network IP: $NetworkIP" -ForegroundColor Yellow

# Kill existing processes on ports
Write-Host "Cleaning up existing services..." -ForegroundColor Blue

# Kill port 3000 (NestJS)
$Port3000 = netstat -ano | findstr :3000 | findstr LISTENING
if ($Port3000) {
    $PID3000 = ($Port3000 -split '\s+')[-1]
    Write-Host "Stopping existing service on port 3000 (PID: $PID3000)" -ForegroundColor Red
    Stop-Process -Id $PID3000 -Force -ErrorAction SilentlyContinue
}

# Kill port 8000 (Python API)
$Port8000 = netstat -ano | findstr :8000 | findstr LISTENING
if ($Port8000) {
    $PID8000 = ($Port8000 -split '\s+')[-1]
    Write-Host "Stopping existing service on port 8000 (PID: $PID8000)" -ForegroundColor Red
    Stop-Process -Id $PID8000 -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

# Start Backend (NestJS)
Write-Host "Starting NestJS Backend on port 3000..." -ForegroundColor Green
Start-Process PowerShell -ArgumentList "-Command", "cd 'D:\reserch\final_year_research\Backend'; pnpm start" -WindowStyle Normal

# Wait for backend to start
Write-Host "Waiting for backend to initialize..." -ForegroundColor Blue
Start-Sleep -Seconds 8

# Start Python Prediction API
Write-Host "Starting Python Prediction API on port 8000..." -ForegroundColor Green
Start-Process PowerShell -ArgumentList "-Command", "cd 'D:\reserch\final_year_research\Backend'; .venv\Scripts\activate; python api_server.py" -WindowStyle Normal

# Wait for Python API to start
Write-Host "Waiting for prediction API to initialize..." -ForegroundColor Blue
Start-Sleep -Seconds 6

# Start Mobile App
Write-Host "Starting Mobile App on port 8083..." -ForegroundColor Green
Start-Process PowerShell -ArgumentList "-Command", "cd 'D:\reserch\final_year_research\mobile'; pnpm start --port 8083" -WindowStyle Normal

# Wait and verify services
Write-Host "Verifying all services..." -ForegroundColor Blue
Start-Sleep -Seconds 10

# Check service status
Write-Host "`n=== Service Status ===" -ForegroundColor Green

$Backend = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet
if ($Backend) {
    Write-Host "✓ NestJS Backend: http://$NetworkIP:3000" -ForegroundColor Green
} else {
    Write-Host "✗ NestJS Backend: Failed to start" -ForegroundColor Red
}

$PredictionAPI = Test-NetConnection -ComputerName localhost -Port 8000 -InformationLevel Quiet
if ($PredictionAPI) {
    Write-Host "✓ Prediction API: http://$NetworkIP:8000" -ForegroundColor Green
} else {
    Write-Host "✗ Prediction API: Failed to start" -ForegroundColor Red
}

$Mobile = Test-NetConnection -ComputerName localhost -Port 8083 -InformationLevel Quiet
if ($Mobile) {
    Write-Host "✓ Mobile App: http://$NetworkIP:8083" -ForegroundColor Green
    Write-Host "QR Code available for mobile scanning" -ForegroundColor Yellow
} else {
    Write-Host "✗ Mobile App: Failed to start" -ForegroundColor Red
}

Write-Host "`n=== All Services Ready! ===" -ForegroundColor Green
Write-Host "Backend API: http://$NetworkIP:3000" -ForegroundColor Cyan
Write-Host "Prediction API: http://$NetworkIP:8000" -ForegroundColor Cyan
Write-Host "Mobile App: http://$NetworkIP:8083" -ForegroundColor Cyan

Write-Host "`nPress any key to close startup windows..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")