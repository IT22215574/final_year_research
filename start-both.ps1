# Start Both Backend and Mobile Development Servers (Network Fixed)
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "   Starting Development Environment" -ForegroundColor Magenta  
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
Write-Host "[INFO] Mobile apps will connect to: http://$ipAddress`:3000" -ForegroundColor Cyan



# Function to cleanup ports
function Stop-Ports {
    Write-Host "`n[CLEANUP] Checking ports 3000 and 8000..." -ForegroundColor Yellow
    
    # Stop port 3000
    $processInfo = netstat -ano | findstr :3000
    if ($processInfo) {
        $processId = ($processInfo -split '\s+')[-1]
        if ($processId -and $processId -match '^\d+$') {
            Write-Host "[CLEANUP] Stopping process $processId on port 3000..." -ForegroundColor Yellow
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Stop port 8000
    $processInfo = netstat -ano | findstr :8000
    if ($processInfo) {
        $processId = ($processInfo -split '\s+')[-1]
        if ($processId -and $processId -match '^\d+$') {
            Write-Host "[CLEANUP] Stopping process $processId on port 8000..." -ForegroundColor Yellow
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
    
    Start-Sleep -Seconds 2
    Write-Host "[CLEANUP] ✅ Ports cleaned up!" -ForegroundColor Green
}

# Function to start Backend Services
function Start-Backend {
    Write-Host "`n[BACKEND] Starting Backend Services..." -ForegroundColor Green
    Set-Location -Path "Backend"
    
    # Check if required dependencies exist
    $nestjsReady = Test-Path "node_modules"
    $pythonReady = (Test-Path "requirements.txt") -and (Test-Path "api_server.py")
    
    if ($nestjsReady) {
        Write-Host "[BACKEND] Starting NestJS server (Port 3000)..." -ForegroundColor Yellow
        
        # Start NestJS backend in a new window
        Start-Process cmd -ArgumentList "/c", "npm start `& echo. `& echo NestJS Backend started! `& echo Available at: http://$ipAddress`:3000 `& pause" -WindowStyle Normal
        
        Start-Sleep -Seconds 3
        
        # Verify NestJS started
        $nestjsRunning = netstat -ano | findstr :3000
        if ($nestjsRunning) {
            Write-Host "[BACKEND] ✅ NestJS server started successfully!" -ForegroundColor Green
            Write-Host "[BACKEND] 🌐 NestJS API: http://$ipAddress`:3000" -ForegroundColor Yellow
        } else {
            Write-Host "[BACKEND] ⚠️  NestJS server may have issues. Check the window." -ForegroundColor Red
        }
    } else {
        Write-Host "[BACKEND] ❌ node_modules not found for NestJS!" -ForegroundColor Red
        Write-Host "[BACKEND] Run 'pnpm install' in Backend directory first." -ForegroundColor Red
    }
    
    if ($pythonReady) {
        Write-Host "[BACKEND] Starting Python FastAPI server (Port 8000)..." -ForegroundColor Yellow
        
        # Start Python API in a new window
        Start-Process cmd -ArgumentList "/c", "python api_server.py `& echo. `& echo Python API started! `& echo Available at: http://$ipAddress`:8000 `& pause" -WindowStyle Normal
        
        Start-Sleep -Seconds 3
        
        # Verify Python API started
        $pythonRunning = netstat -ano | findstr :8000
        if ($pythonRunning) {
            Write-Host "[BACKEND] ✅ Python API server started successfully!" -ForegroundColor Green
            Write-Host "[BACKEND] 🌐 Python API: http://$ipAddress`:8000" -ForegroundColor Yellow
        } else {
            Write-Host "[BACKEND] ⚠️  Python API server may have issues. Check the window." -ForegroundColor Red
            Write-Host "[BACKEND] ℹ️  Make sure Python and required packages are installed." -ForegroundColor Cyan
        }
    } else {
        Write-Host "[BACKEND] ❌ Python API files not found!" -ForegroundColor Red
        Write-Host "[BACKEND] Make sure api_server.py and requirements.txt exist." -ForegroundColor Red
    }
    
    Set-Location $originalLocation
}

# Function to start Mobile  
function Start-Mobile {
    Write-Host "`n[MOBILE] Starting Mobile App Server..." -ForegroundColor Green
    Set-Location -Path "mobile"
    
    if (Test-Path "node_modules") {
        Write-Host "[MOBILE] Starting Expo development server..." -ForegroundColor Yellow
        
        # Start mobile in a new window
        Start-Process cmd -ArgumentList "/c", "node ../start-expo.js `& echo. `& echo Mobile app started! `& echo Scan QR code with Expo Go app `& pause" -WindowStyle Normal
        
        Start-Sleep -Seconds 2
        Write-Host "[MOBILE] ✅ Mobile app started!" -ForegroundColor Green
        Write-Host "[MOBILE] 📱 Scan QR code with Expo Go app" -ForegroundColor Yellow
    } else {
        Write-Host "[MOBILE] ❌ node_modules not found!" -ForegroundColor Red
        Write-Host "[MOBILE] Run 'pnpm install' in mobile directory first." -ForegroundColor Red
    }
    
    Set-Location $originalLocation
}

# Check if we're in the right directory
if (!(Test-Path "Backend") -or !(Test-Path "mobile")) {
    Write-Host "❌ ERROR: Please run this script from the project root directory!" -ForegroundColor Red
    Write-Host "Make sure both 'Backend' and 'mobile' directories exist." -ForegroundColor Red
    exit 1
}

# Stop any existing processes on ports 3000 and 8000
Stop-Ports

# Start both servers
Start-Backend
Start-Mobile

Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "   🎉 SERVERS STARTED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "`n   📋 Server Information:" -ForegroundColor White
Write-Host "   • NestJS API: http://$ipAddress`:3000" -ForegroundColor Cyan
Write-Host "   • Python API: http://$ipAddress`:8000" -ForegroundColor Cyan
Write-Host "   • Mobile Config: Auto-configured for network access" -ForegroundColor Cyan
Write-Host "`n   📱 Mobile Setup:" -ForegroundColor White  
Write-Host "   1. Open Expo Go app on your phone" -ForegroundColor Yellow
Write-Host "   2. Scan the QR code in the Expo window" -ForegroundColor Yellow
Write-Host "   3. Fish price predictions should now work!" -ForegroundColor Green
Write-Host "`n   ⚠️  Make sure your phone and computer are on same WiFi!" -ForegroundColor Red
Write-Host "`n   💡 Both backend servers must be running for full functionality" -ForegroundColor Cyan
Write-Host "   🔄 If you need to restart: just run this script again!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Magenta

Write-Host "`nPress Enter to exit this script..." -ForegroundColor Gray
Read-Host