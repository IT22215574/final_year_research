# Backend Development Server Startup Script
Write-Host "Starting Backend Development Server..." -ForegroundColor Green

# Navigate to Backend directory
Set-Location -Path "Backend"

# Check if node_modules exists
if (Test-Path "node_modules") {
    Write-Host "Dependencies found. Starting server..." -ForegroundColor Yellow
    
    # Try different ways to start the server
    try {
        # Method 1: Try pnpm
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            Write-Host "Using pnpm to start server..." -ForegroundColor Cyan
            pnpm run "start:dev"
        }
        # Method 2: Try npm
        elseif (Get-Command npm -ErrorAction SilentlyContinue) {
            Write-Host "Using npm to start server..." -ForegroundColor Cyan
            npm run "start:dev"
        }
        # Method 3: Direct nest command
        else {
            Write-Host "Trying direct nest command..." -ForegroundColor Cyan
            node_modules\.bin\nest start --watch
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