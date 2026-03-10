#!/usr/bin/env pwsh
# Quick Setup Script for Bulk Import
# This script helps you configure the bulk import tool

Write-Host "`n🔧 FishAI Bulk Import Setup`n" -ForegroundColor Cyan

# Step 1: Check if user has auth token
if (-not $env:AUTH_TOKEN) {
    Write-Host "❌ AUTH_TOKEN not found in environment" -ForegroundColor Red
    Write-Host "`n📝 To get your auth token:" -ForegroundColor Yellow
    Write-Host "   1. Make sure backend is running (http://localhost:5000)" -ForegroundColor Gray
    Write-Host "   2. Login using curl or Postman:" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   curl -X POST http://localhost:5000/api/v1/auth/login ``" -ForegroundColor White
    Write-Host "     -H `"Content-Type: application/json`" ``" -ForegroundColor White
    Write-Host "     -d '{`"email`":`"your@email.com`",`"password`":`"yourpassword`"}'" -ForegroundColor White
    Write-Host ""
    Write-Host "   3. Copy the 'token' from response and run:" -ForegroundColor Gray
    Write-Host '   $env:AUTH_TOKEN="paste-token-here"' -ForegroundColor Green
    Write-Host ""
    exit 1
} else {
    $tokenPreview = $env:AUTH_TOKEN.Substring(0, [Math]::Min(30, $env:AUTH_TOKEN.Length)) + "..."
    Write-Host "✅ AUTH_TOKEN found: $tokenPreview" -ForegroundColor Green
}

# Step 2: Fetch available boats
Write-Host "`n📡 Fetching available boats..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/boat" `
        -Headers @{ Authorization = "Bearer $env:AUTH_TOKEN" } `
        -Method Get
    
    if ($response -is [Array] -and $response.Count -gt 0) {
        Write-Host "✅ Found $($response.Count) boat(s):" -ForegroundColor Green
        Write-Host ""
        
        foreach ($boat in $response) {
            $boatId = if ($boat._id) { $boat._id } else { $boat.id }
            $boatName = if ($boat.boatName) { $boat.boatName } else { "Unknown" }
            $boatType = if ($boat.type) { $boat.type } else { "Unknown" }
            
            Write-Host "   🚢 Boat ID: $boatId" -ForegroundColor White
            Write-Host "      Name: $boatName" -ForegroundColor Gray
            Write-Host "      Type: $boatType" -ForegroundColor Gray
            Write-Host ""
        }
        
        # Suggest configuration
        $firstBoatId = if ($response[0]._id) { $response[0]._id } else { $response[0].id }
        Write-Host "📋 Suggested configuration for bulk-import-trips.ts:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   const USE_SINGLE_BOAT = true;" -ForegroundColor White
        Write-Host "   const SINGLE_BOAT_ID = '$firstBoatId';" -ForegroundColor Green
        Write-Host ""
        
        # Copy to clipboard if available
        try {
            Set-Clipboard -Value $firstBoatId
            Write-Host "✅ First boat ID copied to clipboard!" -ForegroundColor Green
        } catch {
            # Clipboard not available, skip
        }
        
    } else {
        Write-Host "⚠️  No boats found in the system!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Please create a boat first:" -ForegroundColor Gray
        Write-Host "   1. Use the mobile app or web interface" -ForegroundColor Gray
        Write-Host "   2. Or use the API:" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   curl -X POST http://localhost:5000/api/v1/boat ``" -ForegroundColor White
        Write-Host "     -H `"Authorization: Bearer `$env:AUTH_TOKEN`" ``" -ForegroundColor White
        Write-Host "     -H `"Content-Type: application/json`" ``" -ForegroundColor White
        Write-Host '     -d ''{"boatName":"Test Boat","type":"Trawler","enginePower":100,...}''' -ForegroundColor White
        Write-Host ""
    }
} catch {
    Write-Host "❌ Failed to fetch boats: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Make sure:" -ForegroundColor Yellow
    Write-Host "   1. Backend is running at http://localhost:5000" -ForegroundColor Gray
    Write-Host "   2. AUTH_TOKEN is valid (not expired)" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Step 3: Next steps
Write-Host "`n🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Edit bulk-import-trips.ts and update SINGLE_BOAT_ID" -ForegroundColor White
Write-Host "   2. Run the import:" -ForegroundColor White
Write-Host ""
Write-Host "      npx ts-node src/trips/utils/bulk-import-trips.ts --with-actuals" -ForegroundColor Green
Write-Host ""
Write-Host "   Or without logging actuals (just test predictions):" -ForegroundColor Gray
Write-Host ""
Write-Host "      npx ts-node src/trips/utils/bulk-import-trips.ts" -ForegroundColor Gray
Write-Host ""

Write-Host "✨ Setup complete!`n" -ForegroundColor Green
