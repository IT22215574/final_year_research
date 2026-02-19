# Fixed Mobile App Startup Script
Write-Host "Starting Mobile Development Server..." -ForegroundColor Green

# Navigate to mobile directory  
Set-Location -Path "mobile"

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found! Make sure you're in the project root." -ForegroundColor Red
    exit 1
}

Write-Host "Installing/updating Expo CLI globally..." -ForegroundColor Yellow
try {
    npm install -g @expo/cli --silent
} catch {
    Write-Host "Warning: Could not update global Expo CLI" -ForegroundColor Yellow
}

Write-Host "Starting Expo development server..." -ForegroundColor Cyan

# Try multiple methods to start Expo
$methods = @(
    "expo start",
    "npx @expo/cli start", 
    "npx expo start",
    "node node_modules/@expo/cli/build/bin/cli start"
)

foreach ($method in $methods) {
    Write-Host "Trying: $method" -ForegroundColor Gray
    try {
        Invoke-Expression $method
        break
    } catch {
        Write-Host "Method failed: $method" -ForegroundColor Red
        continue
    }
}

Read-Host "Press Enter to exit"