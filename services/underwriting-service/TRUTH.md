# Underwriting Service — Capability Truth Registry

This document records the runtime truth of underwriting capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Risk Assessment | **REAL** | `assessRisk` with configurable, externalized scoring and history | None | Production-ready
| UW Decision | **REAL** | `decide` with approved/rejected/escalated outcomes | None | Production-ready
| Rating Engine | **NOT IMPLEMENTED** | `calculatePremium` does not exist | No premium calculation module | P2
| Referral Queue | **REAL** | Work item creation via `ORCHESTRATOR_URL` during `createRequest` | Needs real `ORCHESTRATOR_URL` | P0
| Outbox Integration | **REAL** | `OutboxPublisher` for underwriting and appetite-rule events | None | Production-ready
| Tenant Isolation | **REAL** | `tenantId` column + `TenantGuard` enforcing per-tenant scoping on all queries | None | Production-ready
| Idempotency | **REAL** | `IdempotencyService` + `IdempotencyInterceptor` keyed by `x-idempotency-key` | Redis recommended for multi-replica | P1
| PII Masking | **REAL** | `PiiRedactionInterceptor` using `@insurance/shared` redaction utilities | None | Production-ready
| JWKS/OIDC Auth | **REAL** | `EcosystemJwtGuard` supports RS256/JWKS with HS256 fallback | Needs `JWKS_URI`/`IAM_ISSUER` in production | P1
| SLA Metrics | **REAL** | `getSlaMetrics` and `checkSlaBreaches` are tenant-scoped and use SQL aggregates | None | Production-ready

## Environment Variable Requirements

```bash
# Required at runtime
PORT=3020
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=postgres
DB_SCHEMA=public
KAFKA_BROKERS=                         # Optional; if empty, outbox events are persisted but not published

# JWT / Auth
JWT_SECRET=                            # HS256 fallback
JWKS_URI=                              # e.g. http://localhost:8080/.well-known/jwks.json
IAM_ISSUER=                             # e.g. http://localhost:8080
JWT_AUDIENCES=                          # e.g. insurance-platform

# External service URLs
ORCHESTRATOR_URL=                       # For referral work items
POLICY_SERVICE_URL=                       # For policy-service decision callback
API_GATEWAY_URL=                        # Fallback for policy-service

# Optional overrides
RISK_SCORING_CONFIG=                    # Path to a JSON file for per-tenant/product risk weights
IDEMPOTENCY_TTL_SECONDS=86400
REDIS_URL=                              # If set, idempotency store uses Redis instead of in-memory
```
