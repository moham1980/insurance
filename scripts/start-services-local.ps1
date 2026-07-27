# .\scripts\start-services-local.ps1
# Infrastructure runs in Docker; all microservices run locally via bun
# Compatible with Windows PowerShell 5.1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$composeFile = "$root\docker-compose.e2e.yml"

function Write-Color($text, $color) {
    Write-Host $text -ForegroundColor $color
}

# --- 1) Start only infrastructure containers ---
Write-Color "=== Starting infrastructure containers (postgres, redis, kafka, zookeeper) ===" Cyan

docker compose -f $composeFile up -d insurance-postgres insurance-redis insurance-zookeeper insurance-kafka

# --- 2) Wait for infrastructure health ---
Write-Color "=== Waiting for Postgres to be ready ===" Cyan
$pgReady = $false
for ($i = 0; $i -lt 30; $i++) {
    docker exec insurance-postgres-1 pg_isready -U insurance -d insurance_platform >$null 2>&1
    if ($LASTEXITCODE -eq 0) { $pgReady = $true; break }
    Start-Sleep -Seconds 1
}
if (-not $pgReady) { throw "Postgres did not become ready in time" }
Write-Color "Postgres ready." Green

Write-Color "=== Waiting for Redis to be ready ===" Cyan
$redisReady = $false
for ($i = 0; $i -lt 30; $i++) {
    $r = docker exec insurance-redis-1 redis-cli ping 2>&1
    if ($r -match "PONG") { $redisReady = $true; break }
    Start-Sleep -Seconds 1
}
if (-not $redisReady) { throw "Redis did not become ready in time" }
Write-Color "Redis ready." Green

Write-Color "=== Waiting for Kafka (best-effort) ===" Cyan
Start-Sleep -Seconds 5
Write-Color "Continuing..." Yellow

# --- 3) Shared env vars pointing to localhost infrastructure ---
$env:DB_HOST = "localhost"
$env:DB_PORT = "5435"
$env:DB_USERNAME = "insurance"
$env:DB_PASSWORD = "insurance123"
$env:DB_DATABASE = "insurance_platform"
$env:DB_SCHEMA = "public"
$env:JWT_SECRET = "your-super-secret-jwt-key-change-in-production"
$env:REDIS_HOST = "localhost"
$env:REDIS_PORT = "6380"
$env:KAFKA_BROKER = "localhost:9093"
$env:NODE_ENV = "development"

# --- 4) Service definitions ---
$services = @(
    @{ Name = "auth-service";            Port = 18001 },
    @{ Name = "claims-service";          Port = 18002 },
    @{ Name = "payments-service";        Port = 18004 },
    @{ Name = "party-kyc-service";       Port = 18006 },
    @{ Name = "policy-service";          Port = 18007 },
    @{ Name = "document-service";        Port = 18008 },
    @{ Name = "fraud-service";           Port = 18009 },
    @{ Name = "orchestrator-service";    Port = 18010 },
    @{ Name = "feature-flags-service";   Port = 18011 },
    @{ Name = "claims-readmodel-service";Port = 18012 },
    @{ Name = "complaints-service";      Port = 18013 },
    @{ Name = "reporting-service";       Port = 18014 },
    @{ Name = "aml-service";             Port = 18016 },
    @{ Name = "reinsurance-service";     Port = 18017 },
    @{ Name = "product-service";         Port = 18018 },
    @{ Name = "monitoring-service";      Port = 18020 },
    @{ Name = "document-ai-service";     Port = 18021 },
    @{ Name = "sales-network-service";   Port = 18022 },
    @{ Name = "regulatory-gateway-service"; Port = 18024 },
    @{ Name = "collections-service";     Port = 18025 },
    @{ Name = "customer-360-service";    Port = 18026 },
    @{ Name = "customer-portal-service"; Port = 18027 },
    @{ Name = "workflow-service";        Port = 18028 },
    @{ Name = "workflow-engine-service"; Port = 18029 },
    @{ Name = "copilot-service";         Port = 18030 },
    @{ Name = "agent-portal-service";    Port = 18031 },
    @{ Name = "underwriting-service";    Port = 18032 },
    @{ Name = "knowledge-service";       Port = 18033 },
    @{ Name = "knowledge-layer-service"; Port = 18034 },
    @{ Name = "model-switchboard-service"; Port = 18035 },
    @{ Name = "ai-governance-service";   Port = 18036 },
    @{ Name = "notification-service";    Port = 18037 },
    @{ Name = "rule-engine-service";     Port = 18038 },
    @{ Name = "billing-service";         Port = 18039 }
)

# --- 5) API Gateway upstream URLs ---
$gatewayEnv = @{
    PORT = "18000"
    AUTH_SERVICE_URL         = "http://localhost:18001"
    CLAIMS_SERVICE_URL       = "http://localhost:18002"
    CLAIMS_READMODEL_URL     = "http://localhost:18012"
    POLICY_SERVICE_URL       = "http://localhost:18007"
    PAYMENTS_URL             = "http://localhost:18004"
    PARTY_KYC_URL            = "http://localhost:18006"
    FRAUD_SERVICE_URL        = "http://localhost:18009"
    DOCUMENT_SERVICE_URL     = "http://localhost:18008"
    ORCHESTRATOR_URL         = "http://localhost:18010"
    FEATURE_FLAGS_URL        = "http://localhost:18011"
    PRODUCT_SERVICE_URL      = "http://localhost:18018"
    REGULATORY_GATEWAY_URL   = "http://localhost:18024"
    AML_SERVICE_URL          = "http://localhost:18016"
    REINSURANCE_SERVICE_URL  = "http://localhost:18017"
    REPORTING_URL            = "http://localhost:18014"
    MONITORING_SERVICE_URL   = "http://localhost:18020"
    DOCUMENT_AI_URL          = "http://localhost:18021"
    SALES_NETWORK_URL        = "http://localhost:18022"
    RATE_LIMIT_MAX           = "100000"
    RATE_LIMIT_MAX_PER_TENANT = "100000"
}

# --- 6) Start each service as hidden window process ---
$started = @()

foreach ($svc in $services) {
    $name = $svc.Name
    $port = $svc.Port
    $svcDir = "$root\services\$name"

    if (-not (Test-Path $svcDir)) {
        Write-Color "Skipping $name (directory not found)" Yellow
        continue
    }

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "bun"
    $psi.Arguments = "run src/main.ts"
    $psi.WorkingDirectory = $svcDir
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.WindowStyle = 'Hidden'

    # Inject env vars
    $psi.EnvironmentVariables["DB_HOST"] = "localhost"
    $psi.EnvironmentVariables["DB_PORT"] = "5435"
    $psi.EnvironmentVariables["DB_USERNAME"] = "insurance"
    $psi.EnvironmentVariables["DB_PASSWORD"] = "insurance123"
    $psi.EnvironmentVariables["DB_DATABASE"] = "insurance_platform"
    $psi.EnvironmentVariables["DB_SCHEMA"] = "public"
    $psi.EnvironmentVariables["JWT_SECRET"] = "your-super-secret-jwt-key-change-in-production"
    $psi.EnvironmentVariables["REDIS_HOST"] = "localhost"
    $psi.EnvironmentVariables["REDIS_PORT"] = "6380"
    $psi.EnvironmentVariables["KAFKA_BROKER"] = "localhost:9093"
    $psi.EnvironmentVariables["NODE_ENV"] = "development"
    $psi.EnvironmentVariables["PORT"] = "$port"

    # Special env for API Gateway
    if ($name -eq "api-gateway") {
        foreach ($kv in $gatewayEnv.GetEnumerator()) {
            $psi.EnvironmentVariables[$kv.Key] = $kv.Value
        }
    }

    Write-Color "Starting $name on port $port ..." Cyan
    $proc = [System.Diagnostics.Process]::Start($psi)
    $started += @{ Name = $name; Process = $proc; Port = $port }
    Start-Sleep -Milliseconds 400
}

# Start API Gateway last
$gatewayDir = "$root\services\api-gateway"
if (Test-Path $gatewayDir) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "bun"
    $psi.Arguments = "run src/main.ts"
    $psi.WorkingDirectory = $gatewayDir
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.WindowStyle = 'Hidden'

    foreach ($kv in $gatewayEnv.GetEnumerator()) {
        $psi.EnvironmentVariables[$kv.Key] = $kv.Value
    }
    $psi.EnvironmentVariables["DB_HOST"] = "localhost"
    $psi.EnvironmentVariables["DB_PORT"] = "5435"
    $psi.EnvironmentVariables["DB_USERNAME"] = "insurance"
    $psi.EnvironmentVariables["DB_PASSWORD"] = "insurance123"
    $psi.EnvironmentVariables["DB_DATABASE"] = "insurance_platform"
    $psi.EnvironmentVariables["DB_SCHEMA"] = "public"
    $psi.EnvironmentVariables["JWT_SECRET"] = "your-super-secret-jwt-key-change-in-production"
    $psi.EnvironmentVariables["NODE_ENV"] = "development"

    Write-Color "Starting api-gateway on port 18000 ..." Cyan
    $proc = [System.Diagnostics.Process]::Start($psi)
    $started += @{ Name = "api-gateway"; Process = $proc; Port = 18000 }
}

# Save PIDs for stop script
$pidFile = "$root\scripts\.service-pids.json"
$pidData = @{ pids = @(); names = @() }
foreach ($s in $started) {
    $pidData.pids += $s.Process.Id
    $pidData.names += $s.Name
}
$pidData | ConvertTo-Json | Set-Content -Path $pidFile

Write-Color "" Green
Write-Color "=== All services started as background processes ===" Green
Write-Color "PID file saved to $pidFile" Yellow
Write-Color "Run .\scripts\stop-services-local.ps1 to stop all services and infrastructure." Yellow

# Keep script alive so infrastructure stays up
while ($true) {
    Start-Sleep -Seconds 10
    $alive = $started | Where-Object { -not $_.Process.HasExited }
    $exited = $started | Where-Object { $_.Process.HasExited }
    if ($exited.Count -gt 0) {
        Write-Color "Exited services: $($exited.Name -join ', ')" Red
    }
    if ($alive.Count -eq 0) {
        Write-Color "All service processes have exited." Red
        break
    }
}

