# API Gateway — Capability Truth Registry

This document records the runtime truth of api-gateway capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Routing Table | **REAL** | 34 routes in `gateway.config.ts` | None | Production-ready
| Correlation ID Propagation | **REAL** | Generated in `onRequest`, propagated to upstream as `x-correlation-id` | None | Production-ready
| Tenant ID Propagation | **REAL** | Extracted from verified JWT, authoritative over inbound `x-tenant-id` | None | Production-ready
| User ID Propagation | **REAL** | Extracted from verified JWT `sub`/`userId` | None | Production-ready
| JWT/JWKS Verification | **REAL** | RS256 via JWKS + HS256 fallback in `jwt-verifier.ts` | None | Production-ready
| AI-Enabled Header | **REAL** | Extracted and propagated as `x-ai-enabled` | None | Production-ready
| Traceparent (OpenTelemetry) | **REAL** | Extracted and propagated | None | Production-ready
| Rate Limiting | **REAL** | Per-tenant/user + per-endpoint; Redis-backed sliding window with in-memory fallback | None | Production-ready
| Circuit Breaker | **REAL** | Per-service `CLOSED/OPEN/HALF_OPEN` with Redis-backed distributed state | None | Production-ready
| Upstream Health Checks | **REAL** | Periodic `/health` probes with failure tracking and real Kafka TCP checks | None | Production-ready
| CORS/Helmet | **REAL** | Fastify plugins registered with origin allow-list | None | Production-ready

## Canonical Route Map

| Gateway Path | Service | Upstream Env Var | Default Port | Status |
|---|---|---|---|---|
| `/auth` | auth-service | `AUTH_SERVICE_URL` | 18001 | ACTIVE |
| `/claims` | claims-service | `CLAIMS_SERVICE_URL` | 18002 | ACTIVE |
| `/rm` | claims-readmodel-service | `CLAIMS_READMODEL_URL` | 18012/rm | CONDITIONAL |
| `/fraud` | fraud-service | `FRAUD_SERVICE_URL` | 18009 | ACTIVE |
| `/documents` | document-service | `DOCUMENT_SERVICE_URL` | 18008 | ACTIVE |
| `/copilot` | copilot-service | `COPILOT_SERVICE_URL` | 18030 | CONDITIONAL |
| `/orchestrations` | orchestrator-service | `ORCHESTRATOR_URL` | 18010 | ACTIVE |
| `/workflows` | orchestrator-service | `ORCHESTRATOR_URL` | 18010 | ACTIVE (alias) |
| `/work-items` | orchestrator-service | `ORCHESTRATOR_URL` | 18010 | ACTIVE (alias) |
| `/dlq` | orchestrator-service | `ORCHESTRATOR_URL` | 18010 | ACTIVE (alias) |
| `/reg` | regulatory-gateway-service | `REGULATORY_GATEWAY_URL` | 18024 | ACTIVE |
| `/flags` | feature-flags-service | `FEATURE_FLAGS_URL` | 18011 | ACTIVE |
| `/party` | party-kyc-service | `PARTY_KYC_URL` | 18006 | ACTIVE |
| `/complaints` | complaints-service | `COMPLAINTS_SERVICE_URL` | 18013 | ACTIVE |
| `/policies` | policy-service | `POLICY_SERVICE_URL` | 18007 | ACTIVE |
| `/payments` | payments-service | `PAYMENTS_URL` | 18004 | ACTIVE |
| `/collections` | collections-service | `COLLECTIONS_URL` | 18025 | CONDITIONAL |
| `/aml` | aml-service | `AML_SERVICE_URL` | 18016 | ACTIVE |
| `/re` | reinsurance-service | `REINSURANCE_SERVICE_URL` | 18017 | ACTIVE |
| `/product` | product-service | `PRODUCT_SERVICE_URL` | 18018 | ACTIVE |
| `/underwriting` | underwriting-service | `UNDERWRITING_SERVICE_URL` | 18032 | ACTIVE |
| `/reporting` | reporting-service | `REPORTING_URL` | 18014/reporting | CONDITIONAL |
| `/monitoring` | monitoring-service | `MONITORING_SERVICE_URL` | 18020 | ACTIVE |
| `/document-ai` | document-ai-service | `DOCUMENT_AI_URL` | 18021 | CONDITIONAL |
| `/sales-network` | sales-network-service | `SALES_NETWORK_URL` | 18022/sales-network | CONDITIONAL |
| `/notifications` | notification-service | `NOTIFICATION_SERVICE_URL` | 18037 | ACTIVE |
| `/customer-portal` | customer-portal-service | `CUSTOMER_PORTAL_URL` | 18027 | ACTIVE |
| `/agent-portal` | agent-portal-service | `AGENT_PORTAL_URL` | 18031 | ACTIVE |
| `/workflow` | workflow-service | `WORKFLOW_SERVICE_URL` | 18028 | ACTIVE |
| `/rule-engine` | rule-engine-service | `RULE_ENGINE_URL` | 18038 | ACTIVE |
| `/knowledge` | knowledge-service | `KNOWLEDGE_SERVICE_URL` | 18033 | ACTIVE |
| `/model-switchboard` | model-switchboard-service | `MODEL_SWITCHBOARD_URL` | 18035 | ACTIVE |
| `/billing` | billing-service | `BILLING_SERVICE_URL` | 18039 | ACTIVE |
| `/customer-360` | customer-360-service | `CUSTOMER_360_URL` | 18026 | CONDITIONAL |
| `/outbox` | outbox-relay | `OUTBOX_RELAY_URL` | 18041 | CONDITIONAL |
| `/ai-governance` | ai-governance-service | `AI_GOVERNANCE_URL` | 18036 | CONDITIONAL |

## Decision Log

- **2024-06-11**: Fixed `regulatory` default URL from `localhost:3009` (fraud) to `localhost:18024` (regulatory-gateway).
- **2024-06-11**: `monitoring` default port set to `18020`; `underwriting` default port set to `18032` to avoid port conflicts.
- **2024-06-11**: `workflow` (`/workflow`) proxies to workflow-service; `workflows` (`/workflows`) proxies to orchestrator. Both are intentionally distinct.
- **2026-07-26**: Reconciled all service ports to the `18000` range, aligned `.env.example`/`.env.template`/docker-compose with `gateway.config.ts`, added `/customer-360`, `/outbox` and `/ai-governance` conditional routes, and moved rate limiting + circuit breaker state to Redis.
