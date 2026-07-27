# .\scripts\stop-services-local.ps1
# Stops all locally-running service processes and Docker infrastructure

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$pidFile = "$root\scripts\.service-pids.json"

Write-Host "=== Stopping local service processes ===" -ForegroundColor Cyan
if (Test-Path $pidFile) {
    $pidData = Get-Content $pidFile | ConvertFrom-Json
    foreach ($pid in $pidData.pids) {
        try {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                $proc.Kill()
                Write-Host "Killed PID $pid ($($proc.ProcessName))" -ForegroundColor Green
            }
        } catch {
            Write-Host "Could not kill PID $pid : $_" -ForegroundColor Yellow
        }
    }
    Remove-Item $pidFile -Force
} else {
    Write-Host "No PID file found; attempting to stop all bun processes..." -ForegroundColor Yellow
    Get-Process -Name "bun" -ErrorAction SilentlyContinue | ForEach-Object {
        try { $_.Kill(); Write-Host "Killed bun PID $($_.Id)" -ForegroundColor Green } catch {}
    }
}
Write-Host "Local processes stopped." -ForegroundColor Green

Write-Host "=== Stopping Docker infrastructure ===" -ForegroundColor Cyan
docker compose -f "$root\docker-compose.e2e.yml" down
Write-Host "Infrastructure stopped." -ForegroundColor Green
