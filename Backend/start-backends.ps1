# Fish Price Prediction - Backend Startup Script
# Automatically detects IP address - no manual configuration needed!

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Fish Price Prediction Backend" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env file
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*?)\s*=\s*(.*?)\s*$') {
            $name = $matches[1]
            $value = $matches[2]
            Set-Item -Path "env:$name" -Value $value
        }
    }
}

$HOST_IP = if ($env:HOST) { $env:HOST } else { "0.0.0.0" }
$PYTHON_PORT = if ($env:PORT) { $env:PORT } else { "8000" }
$NESTJS_PORT = if ($env:NESTJS_PORT) { $env:NESTJS_PORT } else { "5000" }

# Auto-detect local IP address (for network access from mobile device)
Write-Host "Detecting network IP address..." -ForegroundColor Yellow
$localIP = $null

# Try to get IP from active network interfaces
$networkInterfaces = Get-NetIPAddress -AddressFamily IPv4 | `
    Where-Object { $_.IPAddress -notmatch "^127\." -and $_.IPAddress -ne "0.0.0.0" } | `
    Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*" }

if ($networkInterfaces) {
    $localIP = @($networkInterfaces)[0].IPAddress
} else {
    # Fallback: use localhost for testing
    $localIP = "127.0.0.1"
}

Write-Host "Detected IP: $localIP" -ForegroundColor Green
Write-Host ""

$API_HOST = $localIP

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Python API:  http://${HOST_IP}:${PYTHON_PORT}" -ForegroundColor Green
Write-Host "  NestJS API:  http://localhost:${NESTJS_PORT}" -ForegroundColor Green
Write-Host "  Mobile App:  Use http://${API_HOST}:${PYTHON_PORT}" -ForegroundColor Magenta
Write-Host ""
Write-Host "Mobile App Setup:" -ForegroundColor Cyan
Write-Host "   Copy this to your mobile app environment:" -ForegroundColor Gray
Write-Host "   EXPO_PUBLIC_API_URL=http://${API_HOST}:${PYTHON_PORT}" -ForegroundColor Yellow
Write-Host ""

# Check if virtual environment exists
if (-not (Test-Path "../.venv/Scripts/python.exe")) {
    Write-Host "ERROR: Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please create it first: python -m venv .venv" -ForegroundColor Yellow
    exit 1
}

# Check if models exist
if (-not (Test-Path "models/rf_model.pkl")) {
    Write-Host "ERROR: Model files not found in models/ folder!" -ForegroundColor Red
    exit 1
}

Write-Host "Starting Python API Server..." -ForegroundColor Green
$pythonJob = Start-Job -ScriptBlock {
    param($dir, $host_ip, $port)
    Set-Location $dir
    & "../.venv/Scripts/python.exe" -m uvicorn api_server:app --host $host_ip --port $port --reload
} -ArgumentList $PSScriptRoot, $HOST_IP, $PYTHON_PORT

Start-Sleep -Seconds 3

Write-Host "Starting NestJS API Server..." -ForegroundColor Green
$nestJob = Start-Job -ScriptBlock {
    param($dir, $port)
    Set-Location $dir
    $env:PORT = $port
    pnpm run start:dev
} -ArgumentList $PSScriptRoot, $NESTJS_PORT

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Both servers are starting..." -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Yellow
Write-Host ""

# Monitor both jobs
try {
    while ($true) {
        # Show Python output
        $pythonOutput = Receive-Job -Job $pythonJob -ErrorAction SilentlyContinue
        if ($pythonOutput) {
            $pythonOutput | ForEach-Object {
                Write-Host "[Python] $_" -ForegroundColor Green
            }
        }

        # Show NestJS output
        $nestOutput = Receive-Job -Job $nestJob -ErrorAction SilentlyContinue
        if ($nestOutput) {
            $nestOutput | ForEach-Object {
                Write-Host "[NestJS] $_" -ForegroundColor Blue
            }
        }

        # Check if jobs are still running
        if ($pythonJob.State -ne "Running" -and $nestJob.State -ne "Running") {
            Write-Host "All servers stopped" -ForegroundColor Yellow
            break
        }

        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host ""
    Write-Host "Stopping all servers..." -ForegroundColor Yellow
    Stop-Job -Job $pythonJob, $nestJob -ErrorAction SilentlyContinue
    Remove-Job -Job $pythonJob, $nestJob -Force -ErrorAction SilentlyContinue
    Write-Host "Done!" -ForegroundColor Green
}
