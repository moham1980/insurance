$ErrorActionPreference = 'Stop'

$required = @(
  'insurance-postgres',
  'insurance-kafka',
  'securecard-redis'
)

Write-Host "Checking required infra containers..." -ForegroundColor Cyan

$all = docker ps -a --format "{{.Names}}" | ForEach-Object { $_.Trim() }

foreach ($name in $required) {
  if (-not ($all -contains $name)) {
    Write-Host "[MISSING] $name (container not found)" -ForegroundColor Yellow
    continue
  }

  $running = docker ps --format "{{.Names}}" | ForEach-Object { $_.Trim() }
  if ($running -contains $name) {
    Write-Host "[OK] $name is running" -ForegroundColor Green
  } else {
    Write-Host "[START] $name" -ForegroundColor Cyan
    $output = docker start $name 2>&1
    if ($LASTEXITCODE -ne 0) {
      Write-Host "[FAIL] Could not start $name" -ForegroundColor Red
      Write-Host $output -ForegroundColor Red
      if ($name -eq 'insurance-postgres') {
        Write-Host "Hint: host port 5432 may already be in use, or reserved/excluded by Windows." -ForegroundColor Yellow
        Write-Host "- netstat -ano | findstr :5432" -ForegroundColor Yellow
        Write-Host "- netsh interface ipv4 show excludedportrange protocol=tcp" -ForegroundColor Yellow
      }
      exit 1
    }
    Write-Host "[OK] $name started" -ForegroundColor Green
  }
}

Write-Host "\nInfra container status:" -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Out-Host
