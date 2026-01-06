$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

# Starts FastAPI server in a separate process so it keeps running
Start-Process -FilePath "py" -ArgumentList @(
  "-m","uvicorn",
  "api_server:app",
  "--host","0.0.0.0",
  "--port","8000"
) -WorkingDirectory $here

Write-Host "Started prediction API on http://0.0.0.0:8000" -ForegroundColor Green
