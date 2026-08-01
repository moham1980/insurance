# Brokerage E2E - Start All Services Script
# Usage: powershell -ExecutionPolicy Bypass -File start-brokerage-e2e.ps1
#
# Starts all Docker infrastructure + local backend services + BFF services
# for brokerage frontend e2e tests.

$ErrorActionPreference = "SilentlyContinue"
$ROOT = "d:\CascadeProjects\old\insurance"

function Write-Header($msg) { Write-Host "`n========================================" -ForegroundColor Cyan; Write-Host "  $msg" -ForegroundColor Cyan; Write-Host "========================================" -ForegroundColor Cyan }
function Write-OK($msg)    { Write-Host "  [OK]   $msg" -ForegroundColor Green }
function Write-Err($msg)   { Write-Host "  [FAIL] $msg" -ForegroundColor Red }
function Write-Info($msg)  { Write-Host "  [..]   $msg" -ForegroundColor Yellow }

# ---------- 1. Docker Infrastructure ----------
Write-Header "Step 1: Docker Infrastructure"

$dockerContainers = @(
    "insurance-insurance-postgres-1",
    "insurance-insurance-kafka-1",
    "insurance-insurance-zookeeper-1",
    "insurance-insurance-redis-1",
    "insurance-auth-service-1",
    "insurance-party-kyc-service-1",
    "insurance-policy-service-1",
    "insurance-complaints-service-1",
    "insurance-orchestrator-service-1",
    "insurance-regulatory-gateway-service-1"
)

foreach ($c in $dockerContainers) {
    $status = docker inspect -f '{{.State.Status}}' $c 2>&1
    if ($status -ne "running") {
        Write-Info "Starting $c..."
        docker start $c 2>&1 | Out-Null
        Start-Sleep -Seconds 1
        $status = docker inspect -f '{{.State.Status}}' $c 2>&1
    }
    if ($status -eq "running") { Write-OK "$c" }
    else { Write-Err "$c (status: $status)" }
}

Write-Info "Waiting 10s for infrastructure to stabilize..."
Start-Sleep -Seconds 10

# Verify PostgreSQL
$pgReady = docker exec insurance-insurance-postgres-1 pg_isready -U insurance 2>&1
if ($pgReady -match "accepting connections") { Write-OK "PostgreSQL ready on :5435" }
else { Write-Err "PostgreSQL not ready: $pgReady" }

# Verify Kafka
$kafkaPort = (docker port insurance-insurance-kafka-1 2>&1) -match "9093"
if ($kafkaPort) { Write-OK "Kafka ready on :9093" }
else { Write-Err "Kafka not ready" }

# ---------- 2. Ensure set_current_tenant function exists ----------
Write-Header "Step 2: Verify DB Functions"

$schemas = @("submission","product","sales_network","billing","collections","underwriting","claims","payments")
foreach ($schema in $schemas) {
    $check = docker exec insurance-insurance-postgres-1 psql -U insurance -d insurance_platform -t -c "SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE p.proname='set_current_tenant' AND n.nspname='$schema'" 2>&1
    if ($check -match "1") { Write-OK "set_current_tenant in schema '$schema'" }
    else {
        Write-Info "Creating set_current_tenant in schema '$schema'..."
        docker exec insurance-insurance-postgres-1 psql -U insurance -d insurance_platform -c "CREATE OR REPLACE FUNCTION $schema.set_current_tenant(p_tenant UUID) RETURNS VOID AS \$\$ BEGIN PERFORM set_config('app.current_tenant', p_tenant::text, true); END; \$\$ LANGUAGE plpgsql;" 2>&1 | Out-Null
        Write-OK "Created set_current_tenant in schema '$schema'"
    }
}

# ---------- 3. Kill any existing local services ----------
Write-Header "Step 3: Kill Existing Local Services"

$servicePorts = @("18022","18005","18018","18020","18025","18039","18002","18004","3030","3020")
foreach ($port in $servicePorts) {
    $lines = netstat -ano | findstr LISTENING | findstr " $port "
    if ($lines) {
        foreach ($line in $lines) {
            $procId = ($line -split '\s+')[-1].Trim()
            if ($procId -match '^\d+$') {
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                Write-Info "Killed port $port (PID $procId)"
            }
        }
    }
}
Start-Sleep -Seconds 2

# ---------- 4. Start Local Backend Services ----------
Write-Header "Step 4: Start Local Backend Services"

$backendServices = @(
    @{ Name="sales-network";        Dir="services\sales-network-service";        Port="18022"; Schema="sales_network";  Extra=$null },
    @{ Name="submission-placement"; Dir="services\submission-placement-service"; Port="18005"; Schema="submission";    Extra=$null },
    @{ Name="product";              Dir="services\product-service";              Port="18018"; Schema="product";       Extra=$null },
    @{ Name="underwriting";         Dir="services\underwriting-service";         Port="18020"; Schema="underwriting";   Extra=$null },
    @{ Name="collections";          Dir="services\collections-service";          Port="18025"; Schema="collections";    Extra=$null },
    @{ Name="billing";              Dir="services\billing-service";              Port="18039"; Schema="billing";        Extra=$null },
    @{ Name="claims";               Dir="services\claims-service";               Port="18002"; Schema="claims";         Extra=$null },
    @{ Name="payments";             Dir="services\payments-service";             Port="18004"; Schema="payments";       Extra="PSP" }
)

$processes = @()

foreach ($svc in $backendServices) {
    $svcDir = Join-Path $ROOT $svc.Dir
    $logFile = Join-Path $ROOT "logs-$($svc.Name).txt"
    Write-Info "Starting $($svc.Name) on port $($svc.Port)..."
    
    $errFile = Join-Path $ROOT "logs-$($svc.Name).err"
    $proc = Start-Process -FilePath "node" -ArgumentList "-r","dotenv/config","-r","ts-node/register/transpile-only","src/main.ts" -WorkingDirectory $svcDir -NoNewWindow -RedirectStandardOutput $logFile -RedirectStandardError $errFile -PassThru
    $processes += $proc
    Start-Sleep -Milliseconds 500
}

Write-Info "Waiting 20s for backend services to start..."
Start-Sleep -Seconds 20

# ---------- 5. Start BFF Services ----------
Write-Header "Step 5: Start BFF Services"

$bffServices = @(
    @{ Name="broker-portal-bff";     Dir="services\broker-portal-bff";     Port="3030" },
    @{ Name="channel-workspace-bff"; Dir="services\channel-workspace-bff"; Port="3020" }
)

foreach ($svc in $bffServices) {
    $svcDir = Join-Path $ROOT $svc.Dir
    $logFile = Join-Path $ROOT "logs-$($svc.Name).txt"
    Write-Info "Starting $($svc.Name) on port $($svc.Port)..."
    
    $errFile = Join-Path $ROOT "logs-$($svc.Name).err"
    $proc = Start-Process -FilePath "node" -ArgumentList "-r","dotenv/config","-r","ts-node/register/transpile-only","src/main.ts" -WorkingDirectory $svcDir -NoNewWindow -RedirectStandardOutput $logFile -RedirectStandardError $errFile -PassThru
    $processes += $proc
    Start-Sleep -Milliseconds 500
}

Write-Info "Waiting 10s for BFF services to start..."
Start-Sleep -Seconds 10

# ---------- 6. Verify All Services ----------
Write-Header "Step 6: Verify All Services"

$allPorts = [ordered]@{
    "18022" = "sales-network-service"
    "18005" = "submission-placement-service"
    "18018" = "product-service"
    "18020" = "underwriting-service"
    "18025" = "collections-service"
    "18039" = "billing-service"
    "18002" = "claims-service"
    "18004" = "payments-service"
    "3030"  = "broker-portal-bff"
    "3020"  = "channel-workspace-bff"
}

$allOk = $true
foreach ($port in $allPorts.Keys) {
    $name = $allPorts[$port]
    $listening = netstat -ano | findstr LISTENING | findstr " $port "
    if ($listening) { Write-OK "$name on :$port" }
    else { Write-Err "$name on :$port NOT LISTENING"; $allOk = $false }
}

# ---------- 7. Quick API Health Check ----------
Write-Header "Step 7: API Health Check"

$jwt = & node -e "
const jwt = require('jsonwebtoken');
const t = jwt.sign(
  { sub:'broker-user', tenantId:'a1b2c3d4-e5f6-7890-abcd-ef1234567890', roles:['broker_owner'], organizationId:'b1c2d3e4-f5a6-7890-abcd-ef1234567890', iss:'http://localhost:18001', aud:'insurance-platform' },
  'your-super-secret-jwt-key-change-in-production',
  { expiresIn:'1h' }
);
process.stdout.write(t);
" 2>&1

$apiTests = @(
    @{ Name="BFF Dashboard";       Url="http://localhost:3030/api/v1/broker/dashboard" },
    @{ Name="BFF Submissions";     Url="http://localhost:3030/api/v1/broker/submissions?limit=10&offset=0" },
    @{ Name="BFF Placements";      Url="http://localhost:3030/api/v1/broker/placements?limit=10&offset=0" },
    @{ Name="BFF Sub-agents";      Url="http://localhost:3030/api/v1/broker/sub-agents?limit=10&offset=0" },
    @{ Name="BFF Payments";        Url="http://localhost:3030/api/v1/broker/payments?limit=10&offset=0" },
    @{ Name="Channel Dashboard";   Url="http://localhost:3020/api/v1/channel/dashboard" },
    @{ Name="Channel Workspaces";  Url="http://localhost:3020/api/v1/channel/workspaces" }
)

$apiOk = 0
$apiFail = 0
foreach ($test in $apiTests) {
    try {
        $r = Invoke-WebRequest -Uri $test.Url -Headers @{ Authorization = "Bearer $jwt" } -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
        $body = $r.Content | ConvertFrom-Json
        if ($body.success) { Write-OK "$($test.Name)"; $apiOk++ }
        else { Write-Err "$($test.Name) - success:false"; $apiFail++ }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        Write-Err "$($test.Name) - HTTP $status"; $apiFail++
    }
}

# ---------- Summary ----------
Write-Header "Summary"
Write-Host "  Docker containers:  $($dockerContainers.Count) running" -ForegroundColor White
$listeningCount = 0
foreach ($port in $allPorts.Keys) {
    if (netstat -ano | findstr LISTENING | findstr " $port ") { $listeningCount++ }
}
Write-Host "  Services listening: $listeningCount/$($allPorts.Count)" -ForegroundColor $(if($listeningCount -eq $allPorts.Count){'Green'}else{'Red'})
Write-Host "  API health check:   $apiOk OK, $apiFail failed" -ForegroundColor $(if($apiFail -eq 0){'Green'}else{'Yellow'})
Write-Host ""

# Save PIDs for cleanup
$processes | Select-Object Id, ProcessName | Export-Csv -Path (Join-Path $ROOT "service-pids.csv") -NoTypeInformation

Write-Host "  To run e2e tests:" -ForegroundColor Cyan
Write-Host "    npx jest --config jest.config.e2e.cjs tests/e2e/broker-portal-bff.test.ts" -ForegroundColor White
Write-Host "    npx jest --config jest.config.e2e.cjs tests/e2e/channel-workspace-bff.test.ts" -ForegroundColor White
Write-Host ""
