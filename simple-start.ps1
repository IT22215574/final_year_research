# Simple Development Server Startup
Write-Host "Starting Fish Price Predictor Development Environment..." -ForegroundColor Green

# Kill existing processes on ports 3000 and 8000
Write-Host "Cleaning up ports..." -ForegroundColor Yellow

# Get processes on port 3000
$port3000 = netstat -ano | findstr ":3000"
if ($port3000) {
    $port3000 | ForEach-Object {
        $columns = $_ -split '\s+'
        if ($columns.Length -ge 5) {
            $processId = $columns[-1]
            if ($processId -match '^\d+$') {
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                Write-Host "Killed process $processId on port 3000" -ForegroundColor Yellow
            }
        }
    }
}

# Get processes on port 8000  
$port8000 = netstat -ano | findstr ":8000"
if ($port8000) {
    $port8000 | ForEach-Object {
        $columns = $_ -split '\s+'
        if ($columns.Length -ge 5) {
            $processId = $columns[-1]
            if ($processId -match '^\d+$') {
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                Write-Host "Killed process $processId on port 8000" -ForegroundColor Yellow
            }
        }
    }
}

Start-Sleep -Seconds 3
Write-Host "Ports cleaned up!" -ForegroundColor Green

# Start Python API Server  
Write-Host "`nStarting Python API Server..." -ForegroundColor Green
Set-Location -Path "Backend"
Start-Process powershell -ArgumentList "-Command", "python api_server.py; Read-Host 'Press Enter to close'" -WindowStyle Normal

Start-Sleep -Seconds 4

# Start NestJS Server
Write-Host "Starting NestJS Server..." -ForegroundColor Green  
Start-Process powershell -ArgumentList "-Command", "npm start; Read-Host 'Press Enter to close'" -WindowStyle Normal

Start-Sleep -Seconds 4

# Go back to root and start mobile
Set-Location ..
Write-Host "Starting Mobile App..." -ForegroundColor Green
Set-Location -Path "mobile"  
Start-Process powershell -ArgumentList "-Command", "npx expo start; Read-Host 'Press Enter to close'" -WindowStyle Normal

Set-Location ..

# Wait and check status
Write-Host "`nWaiting for servers to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 8 

# Check if servers are running
$nestjs = netstat -ano | findstr ":3000"
$python = netstat -ano | findstr ":8000"

Write-Host "`n=== SERVER STATUS ===" -ForegroundColor Magenta

if ($python) {
    Write-Host "Python API (Port 8000): RUNNING" -ForegroundColor Green
} else {
    Write-Host "Python API (Port 8000): NOT RUNNING" -ForegroundColor Red
}

if ($nestjs) {
    Write-Host "NestJS API (Port 3000): RUNNING" -ForegroundColor Green  
} else {
    Write-Host "NestJS API (Port 3000): NOT RUNNING" -ForegroundColor Red
}

# Get IP address
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -ne "127.0.0.1"} | Select-Object -First 1).IPAddress
if (-not $ipAddress) { $ipAddress = "172.28.22.68" }

Write-Host "`n=== MOBILE APP SETUP ===" -ForegroundColor Magenta
Write-Host "1. Open Expo Go app on your phone" -ForegroundColor Yellow  
Write-Host "2. Make sure phone and computer on same WiFi" -ForegroundColor Yellow
Write-Host "3. Scan QR code in Expo window" -ForegroundColor Yellow
Write-Host "4. Fish data should load from: http://$ipAddress`:8000" -ForegroundColor Green

Write-Host "`nPress Enter to exit..." -ForegroundColor Gray
Read-Host