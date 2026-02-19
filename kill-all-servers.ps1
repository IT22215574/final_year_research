# Kill All Development Servers
Write-Host "============================================" -ForegroundColor Red
Write-Host "   Stopping All Development Servers" -ForegroundColor Red  
Write-Host "   (Ports 3000, 8000, Metro Bundler)" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Red

# Function to kill all processes on a specific port
function Kill-ProcessesOnPort($port, $description) {
    Write-Host "`n[STOP] Checking port $port ($description)..." -ForegroundColor Yellow
    
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
            try {
                $processName = (Get-Process -Id $pid -ErrorAction SilentlyContinue).ProcessName
                Write-Host "[STOP] Killing $processName (PID: $pid) on port $port..." -ForegroundColor Yellow
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            } catch {
                Write-Host "[STOP] Killing process $pid on port $port..." -ForegroundColor Yellow
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
        Write-Host "[STOP] ✅ Cleared port $port" -ForegroundColor Green
    } else {
        Write-Host "[STOP] ✅ Port $port already free" -ForegroundColor Green
    }
}

# Kill common development server processes
$commonPorts = @(
    @{Port=3000; Description="NestJS/React"},
    @{Port=8000; Description="Python API"},
    @{Port=8081; Description="Metro Bundler"}
)

foreach ($portInfo in $commonPorts) {
    Kill-ProcessesOnPort $portInfo.Port $portInfo.Description
}

# Also kill any Node/Python processes that might be development servers
Write-Host "`n[STOP] Checking for Metro Bundler and Expo processes..." -ForegroundColor Yellow

$metroProcesses = Get-Process | Where-Object { $_.ProcessName -match "(node|expo)" -and $_.CommandLine -match "(start|serve|metro)" }
if ($metroProcesses) {
    foreach ($proc in $metroProcesses) {
        Write-Host "[STOP] Killing Metro/Expo process: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Yellow
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "[STOP] ✅ No Metro/Expo processes found" -ForegroundColor Green
}

# Wait for processes to terminate
Start-Sleep -Seconds 2

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "   🎉 ALL DEVELOPMENT SERVERS STOPPED!" -ForegroundColor Green
Write-Host "`n   You can now run start-both-fixed.ps1 safely" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green

Write-Host "`nPress Enter to exit..." -ForegroundColor Gray
Read-Host