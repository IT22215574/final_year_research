# Mobile App Development Server Startup Script
Write-Host "Starting Mobile Development Server..." -ForegroundColor Green

# Navigate to mobile directory
Set-Location -Path "mobile"

# Check if node_modules exists
if (Test-Path "node_modules") {
    Write-Host "Dependencies found. Starting Expo server..." -ForegroundColor Yellow
    
    # Try different ways to start the server
    try {
        # Method 1: Try pnpm
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            Write-Host "Using pnpm to start Expo..." -ForegroundColor Cyan
            pnpm start
        }
        # Method 2: Try npm
        elseif (Get-Command npm -ErrorAction SilentlyContinue) {
            Write-Host "Using npm to start Expo..." -ForegroundColor Cyan
            npm start
        }
        # Method 3: Direct expo command
        else {
            Write-Host "Trying direct expo command..." -ForegroundColor Cyan
            npx expo start
        }
    }
    catch {
        Write-Host "Error starting server: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "node_modules not found. Installing dependencies..." -ForegroundColor Red
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        pnpm install
    } elseif (Get-Command npm -ErrorAction SilentlyContinue) {
        npm install
    }
}