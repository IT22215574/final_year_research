$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-IPv4 {
  # Best-effort: prefer Wi-Fi IPv4, else first usable non-loopback.
  try {
    $rows = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
      Where-Object {
        $_.IPAddress -ne '127.0.0.1' -and
        $_.IPAddress -notlike '169.254.*' -and
        $_.AddressState -eq 'Preferred'
      }

    $wifi = $rows | Where-Object { $_.InterfaceAlias -match '^Wi-?Fi$' -and $_.PrefixOrigin -eq 'Dhcp' } | Select-Object -First 1
    if ($wifi -and $wifi.IPAddress) { return $wifi.IPAddress }

    $nonVirtual = $rows |
      Where-Object {
        $_.PrefixOrigin -eq 'Dhcp' -and
        $_.InterfaceAlias -notmatch 'VMware|Virtual|vEthernet|Hyper-V|Bluetooth'
      } |
      Select-Object -First 1

    if ($nonVirtual -and $nonVirtual.IPAddress) { return $nonVirtual.IPAddress }

    $any = $rows | Select-Object -First 1
    if ($any -and $any.IPAddress) { return $any.IPAddress }
  } catch {}

  return $null
}

Write-Host "Workspace: $root" -ForegroundColor Cyan
$ip = Get-IPv4
if ($ip) {
  Write-Host "Detected host IP: $ip" -ForegroundColor Cyan
} else {
  Write-Host "Detected host IP: (could not determine)" -ForegroundColor Yellow
}

# Start NestJS backend (port 5000)
Write-Host "Starting NestJS backend (port 5000)..." -ForegroundColor Green
Start-Process -FilePath "pnpm" -ArgumentList @(
  "-C", "$root\Backend",
  "start:dev"
) -WorkingDirectory "$root\Backend" | Out-Null

# Start FastAPI prediction server (port 8000)
Write-Host "Starting Prediction API (port 8000)..." -ForegroundColor Green
Start-Process -FilePath "PowerShell" -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", "$root\Backend\start_prediction_api.ps1"
) -WorkingDirectory "$root\Backend" | Out-Null

Start-Sleep -Seconds 2

Write-Host "\nQuick checks:" -ForegroundColor Cyan
try {
  $tn1 = Test-NetConnection -ComputerName 127.0.0.1 -Port 5000
  Write-Host ("- Auth API  : 127.0.0.1:5000 TCP=" + $tn1.TcpTestSucceeded)
} catch { Write-Host "- Auth API  : check failed" -ForegroundColor Yellow }

try {
  $tn2 = Test-NetConnection -ComputerName 127.0.0.1 -Port 8000
  Write-Host ("- Predict API: 127.0.0.1:8000 TCP=" + $tn2.TcpTestSucceeded)
} catch { Write-Host "- Predict API: check failed" -ForegroundColor Yellow }

Write-Host "\nNext:" -ForegroundColor Cyan
Write-Host "- In another terminal: cd \"$root\mobile\"; npx expo start -c" -ForegroundColor Cyan
Write-Host "- Open Expo Go on your phone using the new QR." -ForegroundColor Cyan
Write-Host "\nNotes:" -ForegroundColor Cyan
Write-Host "- You do NOT need to manually change IPs in .env; the app uses the current Expo host IP automatically." -ForegroundColor Cyan
Write-Host "- If you still see Network request failed on a real phone, allow Windows Firewall for Node/Python ports 5000 and 8000, and ensure phone+PC are on the same Wi‑Fi." -ForegroundColor Cyan
