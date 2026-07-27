# Fraud Service — Capability Truth Registry

This document records the runtime truth of fraud capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Rule-Based Scoring | **REAL** | `FraudService.computeScore` with rule weights (lossType, claimNumber format, policy linkage) | Rule weights are currently hardcoded in code | Externalize to config/database per tenant
| ML Model Training | **REAL** | `FraudService.trainMLModel` POSTs to `ML_MODEL_SERVER_URL/train` | Requires `ML_MODEL_SERVER_URL` and `ML_API_KEY` | P0
| ML Model Inference | **REAL** | `FraudService.predictWithML` POSTs to `ML_MODEL_SERVER_URL/predict` | Requires `ML_MODEL_SERVER_URL` and `ML_API_KEY` | P0
| Case Management | **REAL** | `FraudService.openCase`, `escalateCase`, `closeCase`, `listCases` with outbox audit | All fraud cases now include `tenantId`; controller exposes lifecycle endpoints | Production-ready
| Feedback Loop | **NOT_IMPLEMENTED** | `recordFeedback` method does not exist | Implement model feedback capture or route via outbox events | P1
| Explainability | **REAL** | `FraudMLExplainabilityService` provides SHAP-like, counterfactual and global interpretability summaries | Uses local simplified models if `ML_MODEL_SERVER_URL` unavailable | P1 for real SHAP backend
| Outbox Integration | **REAL** | `OutboxPublisher` publishes `FraudScoreComputed`, `FraudCaseOpened`, `FraudCaseClosed`, `FraudCaseEscalated` | Requires `outbox_events` table (created by migration) | Production-ready
| Orchestrator Integration | **NOT_IMPLEMENTED** | `routeToOrchestrator` method does not exist | Implement orchestrator work-item creation for high-risk cases | P1
| Graph / Network Analytics | **REAL** | `FraudService` methods for entities, relationships, suspicious networks and cluster detection | Exposed via new controller endpoints | Production-ready
| Irregularity Alerts | **REAL** | `FraudService.detectIrregularities` with multiple pattern detection | Exposed via new controller endpoint | Production-ready

## Environment Variable Requirements

```bash
# Service
PORT=3003
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=postgres
DB_SCHEMA=public

# Auth (JWKS + local HS256 fallback)
JWT_SECRET=                         # Required for local HS256 tokens
IAM_ISSUER=http://localhost:18001   # JWKS issuer
JWT_AUDIENCES=insurance-platform     # Token audience
JWKS_URI=                            # Optional: defaults to ${IAM_ISSUER}/.well-known/jwks.json

# ML
ML_MODEL_SERVER_URL=                 # e.g., http://ml-model-server:8080
ML_API_KEY=                          # Optional bearer/API key sent to /train and /predict
ML_CIRCUIT_BREAKER_THRESHOLD=5
ML_CIRCUIT_BREAKER_RESET_MS=60000
ML_REQUEST_TIMEOUT_MS=30000

# Rules
FRAUD_HOLD_THRESHOLD=50

# Messaging
KAFKA_BROKERS=                       # e.g., localhost:19092
OUTBOX_POLL_INTERVAL_MS=1000
OUTBOX_BATCH_SIZE=50
OUTBOX_MAX_ATTEMPTS=10

# Observability
LOG_LEVEL=info
```

## Decision Log

- **2026-06-11**: Replaced `simulateMLTraining` (random-based mock) with real HTTP call to `ML_MODEL_SERVER_URL/train`.
- **2026-06-11**: Replaced `simulateMLPrediction` (random-based mock) with real HTTP call to `ML_MODEL_SERVER_URL/predict`.
- **2026-06-11**: Feature vector and model configuration now passed to inference endpoint for explainability.
- **2026-07-27**: Added `tenantId` to `FraudCase` and all case queries; fixed `TenantGuard` to throw `ForbiddenException` and require tenant for non-system users.
- **2026-07-27**: Removed `AbacGuard` from guard chain so RBAC (`PermissionsGuard`) is authoritative.
- **2026-07-27**: Added JWKS/RS256 support with HS256 fallback in `JwtAuthGuard`.
- **2026-07-27**: Created missing migrations for `fraud_cases`, `fraud_ml_models`, `fraud_graph_entities`, `fraud_graph_relationships`, `fraud_irregularity_alerts`, and `outbox_events`.
