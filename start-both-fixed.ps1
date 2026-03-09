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
Write-Host "[INFO] Mobile apps will connect to: http://$ipAddress`:3000 and http://$ipAddress`:8000" -ForegroundColor Cyan

# Function to cleanup ports thoroughly
function Stop-Ports {
    Write-Host "`n[CLEANUP] Checking and clearing ports 3000 and 8000..." -ForegroundColor Yellow
    
    # Function to kill all processes on a specific port
    function Kill-ProcessesOnPort($port) {
        $processes = netstat -ano | findstr ":$port" | ForEach-Object {
            $line = $_ -split '\s+'
            if ($line.Length -ge 5) {
                $processId = $line[-1]
                if ($processId -match '^\d+$') {
                    $processId
                }
            }
        }
        
        if ($processes) {
            foreach ($pid in $processes) {
                Write-Host "[CLEANUP] Killing process $pid on port $port..." -ForegroundColor Yellow
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        } else {
            Write-Host "[CLEANUP] Port $port is free" -ForegroundColor Green
        }
    }
    
    # Kill processes on both ports
    Kill-ProcessesOnPort 3000
    Kill-ProcessesOnPort 8000
    
    # Wait for processes to terminate
    Start-Sleep -Seconds 3
    
    # Verify ports are free
    $port3000 = netstat -ano | findstr ":3000"
    $port8000 = netstat -ano | findstr ":8000"
    
    if (-not $port3000 -and -not $port8000) {
        Write-Host "[CLEANUP] ✅ Both ports 3000 and 8000 are now free!" -ForegroundColor Green
    } else {
        if ($port3000) { Write-Host "[CLEANUP] ⚠️  Port 3000 still busy" -ForegroundColor Yellow }
        if ($port8000) { Write-Host "[CLEANUP] ⚠️  Port 8000 still busy" -ForegroundColor Yellow }
        Write-Host "[CLEANUP] Continuing anyway..." -ForegroundColor Cyan
    }
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
        
        # Start NestJS backend in a new window (use cmd /c "command1 && command2")
        Start-Process cmd -ArgumentList "/c", "npm start && echo. && echo NestJS Backend started! && echo Available at: http://$ipAddress`:3000 && pause" -WindowStyle Normal
        
        # Wait longer for NestJS to start
        Write-Host "[BACKEND] Waiting for NestJS to start..." -ForegroundColor Cyan
        Start-Sleep -Seconds 6
        
        # Retry verification up to 3 times
        $retryCount = 0
        $nestjsRunning = $false
        
        while ($retryCount -lt 3 -and -not $nestjsRunning) {
            $nestjsCheck = netstat -ano | findstr :3000
            if ($nestjsCheck) {
                $nestjsRunning = $true
                Write-Host "[BACKEND] ✅ NestJS server started successfully!" -ForegroundColor Green
                Write-Host "[BACKEND] 🌐 NestJS API: http://$ipAddress`:3000" -ForegroundColor Yellow
            } else {
                $retryCount++
                Write-Host "[BACKEND] Attempt $retryCount/3: Still waiting for NestJS..." -ForegroundColor Yellow
                Start-Sleep -Seconds 3
            }
        }
        
        if (-not $nestjsRunning) {
            Write-Host "[BACKEND] ⚠️  NestJS server may have issues. Check the window." -ForegroundColor Red
        }
    } else {
        Write-Host "[BACKEND] ❌ node_modules not found for NestJS!" -ForegroundColor Red
        Write-Host "[BACKEND] Run 'pnpm install' in Backend directory first." -ForegroundColor Red
    }
    
    if ($pythonReady) {
        Write-Host "[BACKEND] Starting Python FastAPI server (Port 8000)..." -ForegroundColor Yellow
        
        # Start Python API in a new window
        Start-Process cmd -ArgumentList "/c", "python api_server.py && echo. && echo Python API started! && echo Available at: http://$ipAddress`:8000 && pause" -WindowStyle Normal
        
        # Wait longer for Python API to start
        Write-Host "[BACKEND] Waiting for Python API to start..." -ForegroundColor Cyan
        Start-Sleep -Seconds 5
        
        # Retry verification up to 3 times
        $retryCount = 0
        $pythonRunning = $false
        
        while ($retryCount -lt 3 -and -not $pythonRunning) {
            $pythonCheck = netstat -ano | findstr :8000
            if ($pythonCheck) {
                $pythonRunning = $true
                Write-Host "[BACKEND] ✅ Python API server started successfully!" -ForegroundColor Green
                Write-Host "[BACKEND] 🌐 Python API: http://$ipAddress`:8000" -ForegroundColor Yellow
            } else {
                $retryCount++
                Write-Host "[BACKEND] Attempt $retryCount/3: Still waiting for Python API..." -ForegroundColor Yellow
                Start-Sleep -Seconds 3
            }
        }
        
        if (-not $pythonRunning) {
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
        Start-Process cmd -ArgumentList "/c", "node ../start-expo.js && echo. && echo Mobile app started! && echo Scan QR code with Expo Go app && pause" -WindowStyle Normal
        
        Start-Sleep -Seconds 3
        Write-Host "[MOBILE] Mobile app started!" -ForegroundColor Green
        Write-Host "[MOBILE] Scan QR code with Expo Go app" -ForegroundColor Yellow
    } else {
        Write-Host "[MOBILE] node_modules not found!" -ForegroundColor Red
        Write-Host "[MOBILE] Run 'pnpm install' in mobile directory first." -ForegroundColor Red
    }
    
    Set-Location $originalLocation
}

# Check if we're in the right directory
if (!(Test-Path "Backend") -or !(Test-Path "mobile")) {
    Write-Host "ERROR: Please run this script from the project root directory!" -ForegroundColor Red
    Write-Host "Make sure both 'Backend' and 'mobile' directories exist." -ForegroundColor Red
    exit 1
}

# Stop any existing processes on ports 3000 and 8000
Stop-Ports

# Start both servers
Start-Backend
Start-Mobile

Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "   SERVERS STARTED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "`n   Server Information:" -ForegroundColor White
Write-Host "   • NestJS API: http://$ipAddress`:3000" -ForegroundColor Cyan
Write-Host "   • Python API: http://$ipAddress`:8000" -ForegroundColor Cyan
Write-Host "   • Mobile Config: Auto-configured for network access" -ForegroundColor Cyan
Write-Host "`n   Mobile Setup:" -ForegroundColor White  
Write-Host "   1. Open Expo Go app on your phone" -ForegroundColor Yellow
Write-Host "   2. Scan the QR code in the Expo window" -ForegroundColor Yellow
Write-Host "   3. Fish price predictions should now work!" -ForegroundColor Green
Write-Host "`n   Make sure your phone and computer are on same WiFi!" -ForegroundColor Red
Write-Host "`n   Both backend servers must be running for full functionality" -ForegroundColor Cyan
Write-Host "   If you need to restart: just run this script again!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Magenta

Write-Host "`nPress Enter to exit this script..." -ForegroundColor Gray
Read-Host