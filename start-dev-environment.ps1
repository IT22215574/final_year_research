# Fish Price Predictor - Complete Development Environment Startup
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "   Fish Price Predictor Dev Environment" -ForegroundColor Magenta  
Write-Host "   (AUTO PORT CLEANUP + NETWORK READY)" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Magenta

$originalLocation = Get-Location

# Get current IP address
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
if (-not $ipAddress) {
    $ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -ne "127.0.0.1"} | Select-Object -First 1).IPAddress
}
if (-not $ipAddress) { $ipAddress = "172.28.22.68" }

Write-Host "`n[INFO] Computer IP Address: $ipAddress" -ForegroundColor Cyan
Write-Host "[INFO] Mobile apps will connect to: http://$ipAddress`:3000 and http://$ipAddress`:8000" -ForegroundColor Cyan

# Function to kill all processes on a specific port
function Kill-Port-Processes {
    param($port)
    
    $processes = netstat -ano | findstr ":$port"
    if ($processes) {
        $processes | ForEach-Object {
            $line = $_ -split '\s+'
            if ($line.Length -ge 5) {
                $processId = $line[-1]
                if ($processId -match '^\d+$') {
                    Write-Host "[KILL] Stopping process $processId on port $port..." -ForegroundColor Yellow
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue 2>$null
                }
            }
        }
    }
}

# Clean up ports function
function Cleanup-Ports {
    Write-Host "`n[CLEANUP] Clearing ports 3000, 8000, 8081..." -ForegroundColor Yellow
    
    Kill-Port-Processes 3000
    Kill-Port-Processes 8000
    Kill-Port-Processes 8081
    
    Start-Sleep -Seconds 3
    
    $port3000 = netstat -ano | findstr ":3000"
    $port8000 = netstat -ano | findstr ":8000" 
    
    if (-not $port3000 -and -not $port8000) {
        Write-Host "[CLEANUP] ✅ All ports cleared successfully!" -ForegroundColor Green
    } else {
        Write-Host "[CLEANUP] ⚠️ Some ports may still be busy, continuing..." -ForegroundColor Yellow
    }
}

# Start NestJS server function
function Start-NestJS {
    Write-Host "`n[NESTJS] Starting NestJS server on port 3000..." -ForegroundColor Green
    Set-Location -Path "Backend"
    
    if (Test-Path "node_modules") {
        # Start in background terminal
        $cmd = "npm start"
        Start-Process powershell -ArgumentList "-Command", "cd '$PWD'; $cmd; Write-Host 'NestJS started on http://$ipAddress`:3000'; Read-Host 'Press Enter to close'" -WindowStyle Normal
        
        # Wait and verify
        Write-Host "[NESTJS] Waiting for server to start..." -ForegroundColor Cyan
        Start-Sleep -Seconds 8
        
        $running = netstat -ano | findstr ":3000"
        if ($running) {
            Write-Host "[NESTJS] ✅ Server started successfully!" -ForegroundColor Green
            Write-Host "[NESTJS] 🌐 Available at: http://$ipAddress`:3000" -ForegroundColor Yellow
        } else {
            Write-Host "[NESTJS] ⚠️ May have startup issues" -ForegroundColor Red
        }
    } else {
        Write-Host "[NESTJS] ❌ Dependencies not found! Run 'pnpm install' first." -ForegroundColor Red
    }
    
    Set-Location $originalLocation
}

# Start Python API function  
function Start-Python-API {
    Write-Host "`n[PYTHON] Starting Python FastAPI server on port 8000..." -ForegroundColor Green
    Set-Location -Path "Backend"
    
    if ((Test-Path "api_server.py") -and (Test-Path "requirements.txt")) {
        # Start in background terminal
        $cmd = "python api_server.py"
        Start-Process powershell -ArgumentList "-Command", "cd '$PWD'; $cmd; Write-Host 'Python API started on http://$ipAddress`:8000'; Read-Host 'Press Enter to close'" -WindowStyle Normal
        
        # Wait and verify
        Write-Host "[PYTHON] Waiting for API server to start..." -ForegroundColor Cyan
        Start-Sleep -Seconds 6
        
        $running = netstat -ano | findstr ":8000" 
        if ($running) {
            Write-Host "[PYTHON] ✅ API server started successfully!" -ForegroundColor Green
            Write-Host "[PYTHON] 🌐 Available at: http://$ipAddress`:8000" -ForegroundColor Yellow
        } else {
            Write-Host "[PYTHON] ⚠️ May have startup issues" -ForegroundColor Red
        }
    } else {
        Write-Host "[PYTHON] ❌ Python files not found!" -ForegroundColor Red
    }
    
    Set-Location $originalLocation
}

# Start mobile app function
function Start-Mobile-App {
    Write-Host "`n[MOBILE] Starting Expo development server..." -ForegroundColor Green
    Set-Location -Path "mobile"
    
    if (Test-Path "node_modules") {
        # Start mobile in background terminal
        $cmd = "npx expo start"
        Start-Process powershell -ArgumentList "-Command", "cd '$PWD'; $cmd; Read-Host 'Press Enter to close'" -WindowStyle Normal
        
        Start-Sleep -Seconds 4
        Write-Host "[MOBILE] ✅ Expo server started!" -ForegroundColor Green
        Write-Host "[MOBILE] 📱 Scan QR code with Expo Go app" -ForegroundColor Yellow
    } else {
        Write-Host "[MOBILE] ❌ Dependencies not found! Run 'pnpm install' first." -ForegroundColor Red
    }
    
    Set-Location $originalLocation
}

# Directory validation
if (!(Test-Path "Backend") -or !(Test-Path "mobile")) {
    Write-Host "❌ ERROR: Run this script from project root directory!" -ForegroundColor Red
    Write-Host "Make sure 'Backend' and 'mobile' directories exist." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Execute startup sequence
Cleanup-Ports
Start-Python-API
Start-NestJS
Start-Mobile-App

# Final status
Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "   🎉 STARTUP SEQUENCE COMPLETED!" -ForegroundColor Green
Write-Host "`n   📋 Server Status Check:" -ForegroundColor White

$nestjs = netstat -ano | findstr ":3000"
$python = netstat -ano | findstr ":8000"

if ($nestjs) { 
    Write-Host "   ✅ NestJS API: http://$ipAddress`:3000" -ForegroundColor Green 
} else { 
    Write-Host "   ❌ NestJS API: Not responding" -ForegroundColor Red 
}

if ($python) { 
    Write-Host "   ✅ Python API: http://$ipAddress`:8000" -ForegroundColor Green 
} else { 
    Write-Host "   ❌ Python API: Not responding" -ForegroundColor Red 
}

Write-Host "`n   📱 Mobile Setup:" -ForegroundColor White  
Write-Host "   1. Open Expo Go app on your phone" -ForegroundColor Yellow
Write-Host "   2. Ensure phone & computer on same WiFi" -ForegroundColor Yellow
Write-Host "   3. Scan QR code in Expo window" -ForegroundColor Yellow
Write-Host "   4. Fish data should now load properly!" -ForegroundColor Green

Write-Host "`n   💡 Troubleshooting:" -ForegroundColor Cyan
Write-Host "   • If servers failed: Check the opened terminal windows" -ForegroundColor Cyan
Write-Host "   • To restart: Run kill-all-servers.ps1 then this script" -ForegroundColor Cyan
Write-Host "   • Python packages: Run setup-python.ps1 if needed" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Magenta

Write-Host "`nPress Enter to exit this script..." -ForegroundColor Gray
Read-Host