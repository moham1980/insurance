# Start all insurance services locally
$ErrorActionPreference = "SilentlyContinue"

# Kill any existing node processes from previous runs
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Base environment variables
$baseEnv = @{
  DB_HOST = 'localhost'
  DB_PORT = '5435'
  DB_USERNAME = 'insurance'
  DB_PASSWORD = 'insurance123'
  DB_DATABASE = 'insurance_platform'
  JWT_SECRET = 'your-super-secret-jwt-key-change-in-production'
  KAFKA_BROKERS = 'localhost:9093'
  LOG_LEVEL = 'info'
  NODE_ENV = 'development'
}

# Service definitions: name, schema, port, main file
$services = @(
  @{name='auth-service'; schema='public'; port=18001}
  @{name='party-kyc-service'; schema='party'; port=18006}
  @{name='policy-service'; schema='policy'; port=18007}
  @{name='claims-service'; schema='claims'; port=18002}
  @{name='payments-service'; schema='payments'; port=18004}
  @{name='orchestrator-service'; schema='orchestrator'; port=18010}
  @{name='document-service'; schema='documents'; port=18008}
  @{name='fraud-service'; schema='fraud'; port=18009}
  @{name='feature-flags-service'; schema='flags'; port=18011}
  @{name='complaints-service'; schema='complaints'; port=18013}
  @{name='claims-readmodel-service'; schema='claims_rm'; port=18012}
  @{name='reporting-service'; schema='reporting'; port=18014}
  @{name='regulatory-gateway-service'; schema='regulatory'; port=18024}
  @{name='aml-service'; schema='aml'; port=18016}
  @{name='reinsurance-service'; schema='reinsurance'; port=18017}
  @{name='product-service'; schema='product'; port=18018}
  @{name='monitoring-service'; schema='monitoring'; port=18020}
  @{name='underwriting-service'; schema='underwriting'; port=18032}
  @{name='notification-service'; schema='notification'; port=18037}
  @{name='customer-portal-service'; schema='customer_portal'; port=18027}
  @{name='agent-portal-service'; schema='agent_portal'; port=18031}
  @{name='workflow-service'; schema='workflow'; port=18028}
  @{name='rule-engine-service'; schema='rule_engine'; port=18038}
  @{name='document-ai-service'; schema='document_ai'; port=18021}
  @{name='collections-service'; schema='collections'; port=18025}
  @{name='copilot-service'; schema='copilot'; port=18030}
  @{name='sales-network-service'; schema='sales'; port=18022}
  @{name='api-gateway'; schema='public'; port=18000}
)

# Set base env vars
foreach ($key in $baseEnv.Keys) {
  Set-Item -Path "Env:$key" -Value $baseEnv[$key]
}

# Additional env vars for api-gateway
$apiGatewayEnv = @{
  AUTH_SERVICE_URL = 'http://localhost:18001'
  CLAIMS_SERVICE_URL = 'http://localhost:18002'
  CLAIMS_READMODEL_URL = 'http://localhost:18012/rm'
  PAYMENTS_URL = 'http://localhost:18004'
  ORCHESTRATOR_URL = 'http://localhost:18010'
  PARTY_KYC_URL = 'http://localhost:18006'
  POLICY_SERVICE_URL = 'http://localhost:18007'
  DOCUMENT_SERVICE_URL = 'http://localhost:18008'
  FRAUD_SERVICE_URL = 'http://localhost:18009'
  FEATURE_FLAGS_URL = 'http://localhost:18011'
  COMPLAINTS_SERVICE_URL = 'http://localhost:18013'
  REGULATORY_GATEWAY_URL = 'http://localhost:18024'
  AML_SERVICE_URL = 'http://localhost:18016'
  REINSURANCE_SERVICE_URL = 'http://localhost:18017'
  PRODUCT_SERVICE_URL = 'http://localhost:18018'
  MONITORING_SERVICE_URL = 'http://localhost:18020'
  DOCUMENT_AI_URL = 'http://localhost:18021'
  REPORTING_URL = 'http://localhost:18014/reporting'
  SALES_NETWORK_URL = 'http://localhost:18022/sales-network'
  UNDERWRITING_SERVICE_URL = 'http://localhost:18032'
  NOTIFICATION_SERVICE_URL = 'http://localhost:18037'
  CUSTOMER_PORTAL_URL = 'http://localhost:18027'
  AGENT_PORTAL_URL = 'http://localhost:18031'
  WORKFLOW_SERVICE_URL = 'http://localhost:18028'
  RULE_ENGINE_URL = 'http://localhost:18038'
  COLLECTIONS_SERVICE_URL = 'http://localhost:18025'
  COPILOT_SERVICE_URL = 'http://localhost:18030'
  CUSTOMER_360_URL = 'http://localhost:18026'
  RATE_LIMIT_MAX = '100000'
  RATE_LIMIT_MAX_PER_TENANT = '100000'
}

$started = @()
$failed = @()

if (!(Test-Path "logs")) { New-Item -ItemType Directory -Path "logs" | Out-Null }

foreach ($svc in $services) {
  $svcName = $svc.name
  $schema = $svc.schema
  $port = $svc.port

  $mainFile = "services\$svcName\dist\main.js"
  if (!(Test-Path $mainFile)) {
    Write-Host "[$svcName] SKIP - no dist/main.js" -ForegroundColor Yellow
    $failed += "$svcName (no main.js)"
    continue
  }

  # Set service-specific env
  $env:DB_SCHEMA = $schema
  $env:PORT = $port
  $env:SERVICE_ID = "svc-$svcName"
  $env:SERVICE_TOKEN_ISSUER_KEY = 'change-me-in-dev'

  # Set api-gateway specific env
  if ($svcName -eq 'api-gateway') {
    foreach ($key in $apiGatewayEnv.Keys) {
      Set-Item -Path "Env:$key" -Value $apiGatewayEnv[$key]
    }
  }

  # Set service URLs for inter-service communication
  $env:AUTH_SERVICE_URL = 'http://localhost:18001'
  $env:ORCHESTRATOR_URL = 'http://localhost:18010'
  $env:POLICY_SERVICE_URL = 'http://localhost:18007'
  $env:NOTIFICATION_SERVICE_URL = 'http://localhost:18037'

  $logFile = "logs\$svcName.log"
  $errFile = "logs\$svcName.err.log"
  $batFile = "logs\start-$svcName.cmd"

  # Build batch file content with all env vars
  $batContent = "@echo off`r`n"
  $batContent += "set DB_HOST=localhost`r`n"
  $batContent += "set DB_PORT=5435`r`n"
  $batContent += "set DB_USERNAME=insurance`r`n"
  $batContent += "set DB_PASSWORD=insurance123`r`n"
  $batContent += "set DB_DATABASE=insurance_platform`r`n"
  $batContent += "set DB_SCHEMA=$schema`r`n"
  $batContent += "set PORT=$port`r`n"
  $batContent += "set JWT_SECRET=your-super-secret-jwt-key-change-in-production`r`n"
  $batContent += "set KAFKA_BROKERS=localhost:9093`r`n"
  $batContent += "set LOG_LEVEL=info`r`n"
  $batContent += "set NODE_ENV=development`r`n"
  $batContent += "set SERVICE_ID=svc-$svcName`r`n"
  $batContent += "set SERVICE_TOKEN_ISSUER_KEY=change-me-in-dev`r`n"
  $batContent += "set AUTH_SERVICE_URL=http://localhost:18001`r`n"
  $batContent += "set ORCHESTRATOR_URL=http://localhost:18010`r`n"
  $batContent += "set POLICY_SERVICE_URL=http://localhost:18007`r`n"
  $batContent += "set NOTIFICATION_SERVICE_URL=http://localhost:18037`r`n"

  if ($svcName -eq 'api-gateway') {
    foreach ($key in $apiGatewayEnv.Keys) {
      $batContent += "set $key=$($apiGatewayEnv[$key])`r`n"
    }
  }

  $batContent += "node $mainFile > `"$logFile`" 2> `"$errFile`"`r`n"
  Set-Content -Path $batFile -Value $batContent -Encoding ASCII

  Write-Host "[$svcName] Starting on port $port (schema: $schema)..." -NoNewline

  $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $batFile -WindowStyle Hidden -PassThru

  Start-Sleep -Seconds 2

  if ($proc.HasExited) {
    Write-Host " FAILED (exit $($proc.ExitCode))" -ForegroundColor Red
    $failed += "$svcName (exit $($proc.ExitCode))"
  } else {
    Write-Host " STARTED (PID $($proc.Id))" -ForegroundColor Green
    $started += @{name=$svcName; pid=$proc.Id; port=$port}
  }
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Started: $($started.Count) services" -ForegroundColor Green
Write-Host "Failed: $($failed.Count) services" -ForegroundColor Red
if ($failed.Count -gt 0) {
  Write-Host "Failed services:" -ForegroundColor Red
  foreach ($f in $failed) { Write-Host "  - $f" }
}

# Save PIDs for later cleanup
$started | ConvertTo-Json | Out-File "logs\service-pids.json"
Write-Host "`nService PIDs saved to logs\service-pids.json"
Write-Host "Logs in logs\*.log"
