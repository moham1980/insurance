# Start brokerage services locally (hybrid mode - infra in Docker, services local)
# Infrastructure (Postgres, Redis, Kafka, Auth, Policy, Claims, Payments, Product, etc.) stays in Docker

$rootDir = "d:\CascadeProjects\old\insurance"

# Common env vars for all services
$commonEnv = @{
    "NODE_ENV" = "development"
    "DB_HOST" = "localhost"
    "DB_PORT" = "5435"
    "DB_USERNAME" = "insurance"
    "DB_PASSWORD" = "insurance123"
    "DB_DATABASE" = "insurance_platform"
    "KAFKA_BROKERS" = "localhost:9093"
    "JWT_SECRET" = "your-super-secret-jwt-key-change-in-production"
}

# Service definitions: name, port, dir, extra env vars
$services = @(
    @{
        Name = "billing-service"
        Port = 18039
        Dir = "$rootDir\services\billing-service"
        ExtraEnv = @{
            "DB_SCHEMA" = "billing"
            "DB_SYNC" = "false"
            "POLICY_SERVICE_URL" = "http://localhost:18007"
            "PAYMENT_SERVICE_URL" = "http://localhost:18004"
        }
    },
    @{
        Name = "collections-service"
        Port = 18025
        Dir = "$rootDir\services\collections-service"
        ExtraEnv = @{
            "DB_SCHEMA" = "collections"
            "DB_SYNC" = "false"
            "KAFKA_CLIENT_ID" = "collections-service"
        }
    },
    @{
        Name = "copilot-service"
        Port = 18030
        Dir = "$rootDir\services\copilot-service"
        ExtraEnv = @{
            "DB_SCHEMA" = "copilot"
            "DB_SYNC" = "false"
            "ECOSYSTEM_AI_ENABLED" = "false"
        }
    },
    @{
        Name = "reporting-service"
        Port = 18014
        Dir = "$rootDir\services\reporting-service"
        ExtraEnv = @{
            "DB_SCHEMA" = "reporting"
            "KAFKA_CONSUMER_GROUP" = "reporting-kpi-v1"
        }
    },
    @{
        Name = "underwriting-service"
        Port = 18020
        Dir = "$rootDir\services\underwriting-service"
        ExtraEnv = @{
            "DB_SCHEMA" = "underwriting"
            "ORCHESTRATOR_URL" = "http://localhost:18010"
            "POLICY_SERVICE_URL" = "http://localhost:18007"
        }
    },
    @{
        Name = "sales-network-service"
        Port = 18022
        Dir = "$rootDir\services\sales-network-service"
        ExtraEnv = @{
            "DB_SCHEMA" = "sales"
            "DB_SYNC" = "false"
            "KAFKA_CLIENT_ID" = "sales-network-service"
        }
    },
    @{
        Name = "broker-portal-bff"
        Port = 3030
        Dir = "$rootDir\services\broker-portal-bff"
        ExtraEnv = @{
            "AUTH_SERVICE_URL" = "http://localhost:18001"
            "CLAIMS_SERVICE_URL" = "http://localhost:18002"
            "POLICY_SERVICE_URL" = "http://localhost:18007"
            "BILLING_SERVICE_URL" = "http://localhost:18039"
            "SALES_NETWORK_SERVICE_URL" = "http://localhost:18022/sales-network"
            "PRODUCT_SERVICE_URL" = "http://localhost:18018"
            "SUBMISSION_PLACEMENT_SERVICE_URL" = "http://localhost:18025"
            "REPORTING_SERVICE_URL" = "http://localhost:18014/reporting"
            "PARTY_KYC_SERVICE_URL" = "http://localhost:18006"
            "REGULATORY_GATEWAY_SERVICE_URL" = "http://localhost:18024"
            "PAYMENTS_SERVICE_URL" = "http://localhost:18004"
            "COLLECTIONS_SERVICE_URL" = "http://localhost:18025"
            "UNDERWRITING_SERVICE_URL" = "http://localhost:18020"
            "COPILOT_SERVICE_URL" = "http://localhost:18030"
        }
    },
    @{
        Name = "channel-workspace-bff"
        Port = 3020
        Dir = "$rootDir\services\channel-workspace-bff"
        ExtraEnv = @{
            "AUTH_SERVICE_URL" = "http://localhost:18001"
            "POLICY_SERVICE_URL" = "http://localhost:18007"
            "CLAIM_SERVICE_URL" = "http://localhost:18002"
            "BILLING_SERVICE_URL" = "http://localhost:18039"
            "SALES_NETWORK_SERVICE_URL" = "http://localhost:18022/sales-network"
            "PRODUCT_SERVICE_URL" = "http://localhost:18018"
            "SUBMISSION_PLACEMENT_SERVICE_URL" = "http://localhost:18025"
            "COPILOT_SERVICE_URL" = "http://localhost:18030"
        }
    }
)

# Start each service in a new terminal window
foreach ($svc in $services) {
    $envVars = $commonEnv.Clone()
    $envVars["PORT"] = $svc.Port
    foreach ($key in $svc.ExtraEnv.Keys) {
        $envVars[$key] = $svc.ExtraEnv[$key]
    }

    $envStr = ""
    foreach ($key in $envVars.Keys) {
        $envStr += "`$env:$key='$($envVars[$key])'; "
    }

    $cmd = "$envStr Set-Location '$($svc.Dir)'; bun run src/main.ts"
    Write-Host "Starting $($svc.Name) on port $($svc.Port)..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd
    Start-Sleep -Seconds 2
}

Write-Host "`nAll 8 brokerage services started in separate terminal windows."
Write-Host "Waiting 10 seconds for services to initialize..."
Start-Sleep -Seconds 10
Write-Host "Done. Check each terminal window for startup logs."
