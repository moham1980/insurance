$env:DB_HOST="localhost"
$env:DB_PORT="5435"
$env:DB_USERNAME="insurance"
$env:DB_PASSWORD="insurance123"
$env:DB_DATABASE="insurance_platform"
$env:JWT_SECRET="your-super-secret-jwt-key-change-in-production"
$env:IAM_ISSUER="http://localhost:18001"
$env:KAFKA_BROKERS="localhost:9093"
$env:NODE_ENV="development"
$env:TS_NODE_TRANSPILE_ONLY="1"

$services = @(
    @{ Name="sales-network"; Dir="services\sales-network-service"; Port="18022"; Schema="sales_network"; Extra=@{} },
    @{ Name="submission-placement"; Dir="services\submission-placement-service"; Port="18005"; Schema="submission"; Extra=@{} },
    @{ Name="product"; Dir="services\product-service"; Port="18018"; Schema="product"; Extra=@{} },
    @{ Name="underwriting"; Dir="services\underwriting-service"; Port="18020"; Schema="underwriting"; Extra=@{} },
    @{ Name="collections"; Dir="services\collections-service"; Port="18025"; Schema="collections"; Extra=@{} },
    @{ Name="billing"; Dir="services\billing-service"; Port="18039"; Schema="billing"; Extra=@{} },
    @{ Name="claims"; Dir="services\claims-service"; Port="18002"; Schema="claims"; Extra=@{} },
    @{ Name="payments"; Dir="services\payments-service"; Port="18004"; Schema="payments"; Extra=@{ PSP_BASE_URL="http://localhost:9999"; PSP_MERCHANT_ID="test-merchant"; PSP_API_KEY="test-key" } }
)

foreach ($svc in $services) {
    $env:PORT = $svc.Port
    $env:DB_SCHEMA = $svc.Schema
    foreach ($key in $svc.Extra.Keys) {
        Set-Item -Path "Env:$key" -Value $svc.Extra[$key]
    }
    $fullDir = "d:\CascadeProjects\old\insurance\$($svc.Dir)"
    Write-Host "Starting $($svc.Name) on port $($svc.Port)..."
    Start-Process -FilePath "node" -ArgumentList "--require","ts-node/register/transpile-only","./src/main.ts" -WorkingDirectory $fullDir -NoNewWindow -RedirectStandardOutput "d:\CascadeProjects\old\insurance\logs-$($svc.Name).txt" -RedirectStandardError "d:\CascadeProjects\old\insurance\logs-$($svc.Name)-err.txt"
    Start-Sleep -Seconds 2
}

Write-Host "Waiting for services to start..."
Start-Sleep -Seconds 10

# Start BFF services
$env:JWT_ISSUER="http://localhost:18001"
$env:JWT_AUDIENCE="insurance-platform"

$bffs = @(
    @{ Name="broker-portal-bff"; Dir="services\broker-portal-bff"; Port="3030" },
    @{ Name="channel-workspace-bff"; Dir="services\channel-workspace-bff"; Port="3020" }
)

foreach ($bff in $bffs) {
    $env:PORT = $bff.Port
    $fullDir = "d:\CascadeProjects\old\insurance\$($bff.Dir)"
    Write-Host "Starting $($bff.Name) on port $($bff.Port)..."
    Start-Process -FilePath "node" -ArgumentList "--require","ts-node/register/transpile-only","./src/main.ts" -WorkingDirectory $fullDir -NoNewWindow -RedirectStandardOutput "d:\CascadeProjects\old\insurance\logs-$($bff.Name).txt" -RedirectStandardError "d:\CascadeProjects\old\insurance\logs-$($bff.Name)-err.txt"
    Start-Sleep -Seconds 2
}

Write-Host "All services started. Waiting 10s for BFFs..."
Start-Sleep -Seconds 10

# Verify
netstat -ano | findstr LISTENING | findstr "3030 3020 18005 18018 18020 18022 18025 18039 18002 18004"
