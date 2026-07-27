# Fraud Service Remediation Progress

**Source Audit:** `d:\CascadeProjects\old\insurance\doc\last audit\13-fraud-service-code-audit.md`  
**Started:** 2026-07-27  
**Status:** In Progress

---

## 1. Remediation Plan

### P0 (must fix before production)

1. **Migrations** — Create missing table migrations for `fraud_cases`, `fraud_ml_models`, `fraud_graph_entities`, `fraud_graph_relationships`, `fraud_irregularity_alerts`, and `outbox_events` to match TypeORM entities. Align `fraud_score_audit` types (UUID for `tenant_id`/`actor_user_id`).
2. **Tenant isolation in `FraudCase`** — Add `tenantId` column and pass `tenantId` into `openCase`, `escalateCase`, `closeCase`, `listCases`, `computeScore`, and `computeScoreWithML`.
3. **Controller tenant wiring** — Pass `tenantId` from `FraudController` to every `FraudService` call and include it in case list filters.
4. **Guard fixes** — `TenantGuard` must throw `ForbiddenException` and require `tenantId` for non-system users; `AbacGuard` must be removed/tightened so it does not override RBAC.
5. **Expose hidden domain methods** — Add REST endpoints for ML model lifecycle, graph/network analytics, and irregularity alerts.
6. **Truth alignment** — Update `TRUTH.md` to reflect actual `computeScore`, `computeScoreWithML`, and remove non-existent `recordFeedback` / `routeToOrchestrator` until implemented.
7. **JWKS / RS256 support** — Replace HS256-only `JwtAuthGuard` with JWKS-first validation + local HS256 fallback.
8. **`FraudCase` missing columns** — Add `claimantId` and align `claimAmount` / `amount`; fix irregularity detection queries that reference missing columns.
9. **ML server authentication** — Add API-key / bearer header for `/train` and `/predict` calls.
10. **Search path** — Set `search_path` in `main.ts` for non-public schemas.

### P1 (high priority)

11. Externalize fraud rule weights instead of hardcoded values.
12. Expand `HealthController` to check ML server and Kafka connectivity.
13. Add `FraudCase` status Postgres enum and align entity to use `enum` type.
14. Add regression/unit tests for scoring, case lifecycle, and tenant isolation.
15. Fix `deployMLModel` null-tenant update condition to avoid cross-tenant impact.
16. Tenant-scope `predictWithML` model lookup.

---

## 2. Progress Log

| # | Item | Status | Commit / Notes |
|---|------|--------|----------------|
| 1 | Core table migrations | Done | `src/migrations/1700000000304-create-fraud-core-tables.ts` creates `fraud_cases`, `fraud_ml_models`, `fraud_graph_entities`, `fraud_graph_relationships`, `fraud_irregularity_alerts`, `outbox_events` with enums and indexes. |
| 2 | `FraudCase` entity columns | Done | Added `tenantId`, `claimantId`, `lossType`, `claimAmount` and kept `amount`. |
| 3 | Tenant isolation in service | Done | `openCase`, `escalateCase`, `closeCase`, `listCases`, `predictWithML`, `deployMLModel` now accept and enforce `tenantId`. |
| 4 | Controller tenant wiring | Done | `FraudController` extracts `tenantId` via `TenantGuard` and passes it to every `FraudService` call. |
| 5 | New controller endpoints | Done | Added endpoints for case escalation, ML train/deploy/predict/list, graph entity/relationship/suspicious-network, and irregularity detect/list/update. |
| 6 | Guard fixes | Done | `TenantGuard` throws `ForbiddenException` and requires `tenantId` for non-system users; `AbacGuard` removed from guard chain. |
| 7 | JWKS / RS256 support | Done | `JwtAuthGuard` now validates RS256 via JWKS and falls back to local HS256. `jwks-rsa` added to `package.json`. |
| 8 | `TRUTH.md` | Done | Aligned capabilities with actual code; marked `recordFeedback` and `routeToOrchestrator` as not implemented. |
| 9 | ML auth headers | Done | `callMLTraining` and `callMLInference` add `Authorization: Bearer <ML_API_KEY>` when configured. |
| 10 | `search_path` in `main.ts` | Done | `DataSource` query sets PostgreSQL `search_path` to `DB_SCHEMA, public` at bootstrap. |
| 11 | Health checks | Done | `HealthController` now checks DB and ML server, reports Kafka configuration. |
| 12 | Irregularity detection queries | Done | `detectMultipleClaimsShortPeriod`, `detectUnusualClaimAmount`, `detectRapidPolicyIssuanceClaim`, `detectRepeatedLossType` tenant-scoped and use existing columns. |
| 13 | Graph scoping | Done | `detectSuspiciousNetworks` query precedence fixed and `detectSuspiciousClusters` tenant-scoped. |
| 14 | `tsconfig.json` | Done | Include all `src/**/*` so guards, health, and ml-training modules compile. |
| 15 | Externalize rule weights | Done | `computeScore` now reads `FRAUD_LOSS_TYPE_*_SCORE`, `FRAUD_CLAIM_NUMBER_FORMAT_ANOMALY_SCORE`, `FRAUD_POLICY_LINKED_SCORE` with safe defaults. |

## 3. Verification

Run the verification commands in the fraud-service directory:

```powershell
# Type check the service
cd d:\CascadeProjects\old\insurance\services\fraud-service
bun run build
```

```powershell
# Run migrations (requires DB env)
cp .env.template .env  # if needed
bun run dist/migrate.js
```

```powershell
# Start the service
bun run dist/main.js
```

## 4. Remaining P1 Work

- Externalize fraud rule weights from `computeScore` (lossType, claimNumber, policy linkage) into per-tenant configuration or database.
- Add regression/unit tests covering scoring, case lifecycle, and tenant isolation.
- Implement `recordFeedback` and `routeToOrchestrator` or keep marked as not implemented until a real orchestrator contract exists.
- Align `fraud_score_audit` `tenant_id` / `actor_user_id` types to UUID if downstream consumers can migrate data.
