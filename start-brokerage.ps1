<#
.SYNOPSIS
  Startup script for all brokerage-related frontend and backend services.
.DESCRIPTION
  Starts all brokerage frontend apps (Next.js) and backend services (NestJS/Bun)
  for the insurance platform. Each service runs in its own window for easy monitoring.
  Port conflicts are resolved by assigning unique ports via env vars.
.PARAMETER FrontendOnly
  Start only the frontend apps.
.PARAMETER BackendOnly
  Start only the backend services.
.PARAMETER Stop
  Stop all running brokerage services.
.EXAMPLE
  .\start-brokerage.ps1
  .\start-brokerage.ps1 -FrontendOnly
  .\start-brokerage.ps1 -Stop
#>
param(
  [switch]$FrontendOnly,
  [switch]$BackendOnly,
  [switch]$Stop
)

$ErrorActionPreference = 'SilentlyContinue'

# ── Project root ──────────────────────────────────────────────────────────────
# Normalize to canonical Windows path casing to prevent webpack module duplication
# (D:\ vs d:\ causes React and React-DOM to load as separate instances)
$ROOT = (Get-Item $PSScriptRoot).FullName
$SERVICES = Join-Path $ROOT 'services'
$NEXT_BIN = Join-Path $ROOT 'node_modules\next\dist\bin\next'

# ── Service definitions ───────────────────────────────────────────────────────
# Frontend apps (Next.js) — use 40xx ports to avoid conflicts with backend
$FrontendApps = @(
  @{ Name = 'broker-portal-ui';       Dir = 'broker-portal-ui';       Port = 4030 }
  @{ Name = 'agent-portal-ui';        Dir = 'agent-portal-ui';        Port = 4001 }
  @{ Name = 'channel-workspace-ui';   Dir = 'channel-workspace-ui';   Port = 4031 }
  @{ Name = 'customer-portal-ui';     Dir = 'customer-portal-ui';     Port = 4002 }
  @{ Name = 'web-ui';                 Dir = 'web-ui';                 Port = 4026 }
)

# Backend BFF services (NestJS, npm start:dev)
$BffServices = @(
  @{ Name = 'broker-portal-bff';       Dir = 'broker-portal-bff';       Port = 3030 }
  @{ Name = 'channel-workspace-bff';   Dir = 'channel-workspace-bff';   Port = 3020 }
  @{ Name = 'customer-portal-bff';     Dir = 'customer-portal-bff';     Port = 3001 }
  @{ Name = 'insurer-operations-bff';  Dir = 'insurer-operations-bff';  Port = 3040 }
  @{ Name = 'catalog-bff';             Dir = 'catalog-bff';             Port = 3035 }
)

# Backend core services (Bun/NestJS)
$BackendServices = @(
  @{ Name = 'auth-service';                Dir = 'auth-service';                Port = 3007;  Runner = 'bun' }
  @{ Name = 'agent-portal-service';        Dir = 'agent-portal-service';        Port = 3032;  Runner = 'bun' }
  @{ Name = 'customer-portal-service';     Dir = 'customer-portal-service';     Port = 3031;  Runner = 'bun' }
  @{ Name = 'submission-placement-service';Dir = 'submission-placement-service';Port = 3025;  Runner = 'bun' }
  @{ Name = 'sales-network-service';       Dir = 'sales-network-service';       Port = 3022;  Runner = 'bun' }
  @{ Name = 'policy-service';              Dir = 'policy-service';              Port = 3014;  Runner = 'bun' }
  @{ Name = 'claims-service';              Dir = 'claims-service';              Port = 3002;  Runner = 'bun' }
  @{ Name = 'product-service';             Dir = 'product-service';             Port = 3018;  Runner = 'bun' }
  @{ Name = 'party-kyc-service';           Dir = 'party-kyc-service';           Port = 3012;  Runner = 'bun' }
  @{ Name = 'billing-service';             Dir = 'billing-service';             Port = 3037;  Runner = 'bun' }
  @{ Name = 'underwriting-service';        Dir = 'underwriting-service';        Port = 3021;  Runner = 'bun' }
  @{ Name = 'regulatory-gateway-service';  Dir = 'regulatory-gateway-service';  Port = 3009;  Runner = 'bun' }
  @{ Name = 'payments-service';            Dir = 'payments-service';            Port = 3004;  Runner = 'bun' }
  @{ Name = 'collections-service';         Dir = 'collections-service';         Port = 3019;  Runner = 'bun' }
  @{ Name = 'reporting-service';           Dir = 'reporting-service';           Port = 3038;  Runner = 'bun' }
)

# ── Stop logic ────────────────────────────────────────────────────────────────
if ($Stop) {
  Write-Host "`n[STOP] Stopping all brokerage services..." -ForegroundColor Yellow

  $allPorts = ($FrontendApps + $BffServices + $BackendServices).Port
  foreach ($p in $allPorts) {
    $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
      $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
      if ($proc) {
        Write-Host "  Killing $($proc.ProcessName) (PID $($proc.Id)) on port $p" -ForegroundColor DarkYellow
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
      }
    }
  }

  Write-Host "[STOP] Done.`n" -ForegroundColor Green
  return
}

# ── Helper: check if port is in use ───────────────────────────────────────────
function Test-PortInUse($port) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $conn -and $conn.Count -gt 0
}

# ── Helper: start a process in a new window ───────────────────────────────────
function Start-ServiceWindow($title, $command, $workingDir, $envVars = @{}) {
  $script = "@echo off`ntitle $title`n"
  foreach ($kv in $envVars.GetEnumerator()) {
    $script += "set $($kv.Key)=$($kv.Value)`n"
  }
  $script += "cd /d `"$workingDir`"`n"
  $script += "$command`n"
  $script += "echo.`necho [SERVICE STOPPED] $title`npause`n"

  $tempFile = Join-Path $env:TEMP "start_$($title.Replace(' ','_')).bat"
  $script | Out-File -FilePath $tempFile -Encoding ascii -Force

  Start-Process -FilePath 'cmd.exe' -ArgumentList "/c", $tempFile -WindowStyle Normal
  Start-Sleep -Milliseconds 500
}

# ── Start frontend apps ───────────────────────────────────────────────────────
function Start-FrontendApps {
  Write-Host "`n[FRONTEND] Starting $($FrontendApps.Count) frontend apps..." -ForegroundColor Cyan

  foreach ($app in $FrontendApps) {
    $dir = Join-Path $SERVICES $app.Dir
    $port = $app.Port

    if (Test-PortInUse $port) {
      Write-Host "  [SKIP] $($app.Name) - port $port already in use" -ForegroundColor DarkYellow
      continue
    }

    Write-Host "  [START] $($app.Name) on port $port" -ForegroundColor Green
    $cmd = "node `"$NEXT_BIN`" dev -p $port"
    Start-ServiceWindow -title "FE: $($app.Name)" -command $cmd -workingDir $dir
  }
}

# ── Start BFF services ────────────────────────────────────────────────────────
function Start-BffServices {
  Write-Host "`n[BFF] Starting $($BffServices.Count) BFF services..." -ForegroundColor Cyan

  foreach ($svc in $BffServices) {
    $dir = Join-Path $SERVICES $svc.Dir
    $port = $svc.Port

    if (Test-PortInUse $port) {
      Write-Host "  [SKIP] $($svc.Name) - port $port already in use" -ForegroundColor DarkYellow
      continue
    }

    Write-Host "  [START] $($svc.Name) on port $port" -ForegroundColor Green
    $cmd = "npm run start:dev"
    $envVars = @{ "PORT" = "$port" }
    Start-ServiceWindow -title "BFF: $($svc.Name)" -command $cmd -workingDir $dir -envVars $envVars
  }
}

# ── Start backend services ────────────────────────────────────────────────────
function Start-BackendServices {
  Write-Host "`n[BACKEND] Starting $($BackendServices.Count) backend services..." -ForegroundColor Cyan

  foreach ($svc in $BackendServices) {
    $dir = Join-Path $SERVICES $svc.Dir
    $port = $svc.Port

    if (Test-PortInUse $port) {
      Write-Host "  [SKIP] $($svc.Name) - port $port already in use" -ForegroundColor DarkYellow
      continue
    }

    Write-Host "  [START] $($svc.Name) on port $port" -ForegroundColor Green

    if ($svc.Runner -eq 'bun') {
      $cmd = "bun run src/main.ts"
    } else {
      $cmd = "npm run start:dev"
    }

    $envVars = @{ "PORT" = "$port" }
    Start-ServiceWindow -title "BE: $($svc.Name)" -command $cmd -workingDir $dir -envVars $envVars
  }
}

# ── Main execution ────────────────────────────────────────────────────────────
Write-Host "`n========================================" -ForegroundColor White
Write-Host "  Brokerage Services Startup Script" -ForegroundColor White
Write-Host "========================================" -ForegroundColor White

if (-not $BackendOnly) {
  Start-FrontendApps
}

if (-not $FrontendOnly) {
  Start-BffServices
  Start-BackendServices
}

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host "`n========================================" -ForegroundColor White
Write-Host "  Startup Summary" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor White

Write-Host "Frontend Apps:" -ForegroundColor Cyan
foreach ($app in $FrontendApps) {
  $status = if (Test-PortInUse $app.Port) { "RUNNING" } else { "NOT STARTED" }
  $color = if ($status -eq "RUNNING") { 'Green' } else { 'Red' }
  Write-Host "  $($app.Name.PadRight(30)) :$($app.Port)  $status" -ForegroundColor $color
}

if (-not $FrontendOnly) {
  Write-Host "`nBFF Services:" -ForegroundColor Cyan
  foreach ($svc in $BffServices) {
    $status = if (Test-PortInUse $svc.Port) { "RUNNING" } else { "NOT STARTED" }
    $color = if ($status -eq "RUNNING") { 'Green' } else { 'Red' }
    Write-Host "  $($svc.Name.PadRight(30)) :$($svc.Port)  $status" -ForegroundColor $color
  }

  Write-Host "`nBackend Services:" -ForegroundColor Cyan
  foreach ($svc in $BackendServices) {
    $status = if (Test-PortInUse $svc.Port) { "RUNNING" } else { "NOT STARTED" }
    $color = if ($status -eq "RUNNING") { 'Green' } else { 'Red' }
    Write-Host "  $($svc.Name.PadRight(30)) :$($svc.Port)  $status" -ForegroundColor $color
  }
}

Write-Host "`nTo stop all services: .\start-brokerage.ps1 -Stop`n" -ForegroundColor Yellow
