# Python Dependencies Setup Script for Fish Price Predictor
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "   Python Dependencies Setup" -ForegroundColor Magenta  
Write-Host "   Fish Price Predictor Backend" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Magenta

$originalLocation = Get-Location

# Check if we're in the right directory
if (!(Test-Path "Backend")) {
    Write-Host "❌ ERROR: Please run this script from the project root directory!" -ForegroundColor Red
    Write-Host "Make sure 'Backend' directory exists." -ForegroundColor Red
    exit 1
}

Set-Location -Path "Backend"

# Check if Python is available
Write-Host "`n[CHECK] Verifying Python installation..." -ForegroundColor Yellow

try {
    $pythonVersion = python --version 2>&1
    Write-Host "[CHECK] ✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[CHECK] ❌ Python not found!" -ForegroundColor Red
    Write-Host "[CHECK] Please install Python 3.8+ from https://python.org" -ForegroundColor Red
    Set-Location $originalLocation
    exit 1
}

# Check if requirements.txt exists
if (!(Test-Path "requirements.txt")) {
    Write-Host "[CHECK] ❌ requirements.txt not found!" -ForegroundColor Red
    Write-Host "[CHECK] Cannot install Python dependencies." -ForegroundColor Red
    Set-Location $originalLocation
    exit 1
}

# Install Python packages
Write-Host "`n[INSTALL] Installing Python dependencies..." -ForegroundColor Yellow
Write-Host "[INSTALL] This may take a few minutes..." -ForegroundColor Cyan

try {
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
    
    Write-Host "[INSTALL] ✅ Python dependencies installed successfully!" -ForegroundColor Green
    
    # Verify key packages
    Write-Host "`n[VERIFY] Checking key packages..." -ForegroundColor Yellow
    
    $packages = @("fastapi", "uvicorn", "pandas", "numpy", "scikit-learn")
    foreach ($package in $packages) {
        try {
            python -c "import $package; print('✅ $package: OK')"
        } catch {
            Write-Host "⚠️  $package: May have issues" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Host "[INSTALL] ❌ Failed to install Python dependencies!" -ForegroundColor Red
    Write-Host "[INSTALL] Error: $($_.Exception.Message)" -ForegroundColor Red
    Set-Location $originalLocation
    exit 1
}

Set-Location $originalLocation

Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "   🎉 PYTHON SETUP COMPLETED!" -ForegroundColor Green
Write-Host "`n   Next steps:" -ForegroundColor White
Write-Host "   1. Run 'start-both.ps1' to start all servers" -ForegroundColor Yellow
Write-Host "   2. Your Python API will be available on port 8000" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Magenta

Write-Host "`nPress Enter to exit..." -ForegroundColor Gray
Read-Host