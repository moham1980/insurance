# Claims Service — Capability Truth Registry

This document records the runtime truth of claims capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Claim Registration | **REAL** | `createClaim` with `tenantId`, idempotency key + payload hash, duplicate detection | None | Production-ready
| Claim Assessment | **REAL** | `assessClaim` with amount validation, pessimistic lock, tenant filter | None | Production-ready
| Claim Approval | **REAL** | `approveClaim` with SoD check, policy validation gate, payment saga start | None | Production-ready
| Claim Payment | **REAL** | `payClaim` enforces `paidAmount == approvedAmount`, payment reference uniqueness | None | Production-ready
| Policy Validation | **REAL** | `validatePolicyForClaim` calls policy-service and stores real validation result (fail-closed) | None | Production-ready
| FNOL Form Defaults | **REAL** | `getFnolFormDefaults` calls policy-service and party-kyc-service without synthetic active/coverage fallbacks | None | Production-ready
| Adjuster Referral | **REAL** | `referToAdjuster` creates orchestrator work items | Needs real `ORCHESTRATOR_URL` | P1
| Workload Balancing | **REAL** | `getAdjusterPool` fetches from adjuster service with skill/location scoring | None | Production-ready
| Fraud/Payment Event Consumption | **REAL** | `ClaimsEventsConsumer` uses atomic consumed-event + claim update transaction, tenant/amount/state verification | None | Production-ready
| Outbox Integration | **REAL** | `OutboxPublisher` inside service transactions for lifecycle events | None | Production-ready
| Audit Logging | **REAL** | `auditLogger` and actor metadata for all status changes | None | Production-ready

## Environment Variable Requirements

```bash
PORT=3002                            # Canonical runtime port, matching Dockerfile EXPOSE
DB_SCHEMA=claims                     # Canonical DB schema; data-source and app.module aligned
KAFKA_BROKERS=                       # e.g., kafka-1:29092,kafka-2:29092
KAFKA_CONSUMER_GROUP=claims-events-v1
POLICY_SERVICE_URL=                  # e.g., http://policy-service:3003
PARTY_KYC_SERVICE_URL=               # e.g., http://party-kyc-service:3007
ORCHESTRATOR_URL=                    # e.g., http://orchestrator-service:3010
AUTH_SERVICE_URL=                    # For service-to-service token exchange
SERVICE_TOKEN_ISSUER_KEY=            # Auth-service credential
SERVICE_ID=claims-service
ADJUSTER_SERVICE_URL=                # e.g., http://adjuster-service:3024 (fallback to SALES_NETWORK_URL)
SALES_NETWORK_URL=                   # Fallback for adjuster lookups
```

## Decision Log

- **2026-06-11**: Replaced simulated policy validation in `validatePolicyForClaim` with real HTTP call to policy-service.
- **2026-06-11**: Replaced simulated FNOL defaults in `getFnolFormDefaults` with real calls to policy-service and party-kyc-service.
- **2026-07-27**: Aligned runtime default port to `3002` and DB schema to `claims` across `main.ts`, `app.module.ts`, `data-source.ts`, and `Dockerfile`.
- **2026-07-27**: Rewrote `ClaimsService` with tenant context, amount validation, idempotency payload hash, SoD checks, pessimistic locking, and atomic outbox events.
- **2026-07-27**: Rewrote `ClaimsController` to extract `tenantId`, `actorUserId`, `idempotencyKey`, and `authorization` from request context.
- **2026-07-27**: Rewrote `ClaimsEventsConsumer` with atomic consumed-event insertion and verified payment/fraud event handling (tenant, state, amount, currency, payment reference).
- **2026-07-27**: Updated `TenantGuard`, `AbacGuard`, and `PiiMaskingMiddleware` for Fastify-compatible request/response handling.
