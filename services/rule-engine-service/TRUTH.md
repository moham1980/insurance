# Rule Engine Service — Capability Truth Registry

This document records the runtime truth of rule engine capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Rule Definition | **REAL** | `createRule` with condition/action DSL; tenant-scoped; migration includes `version`, `tags`, `template_id`, `activated_at`, `deactivated_at` | None | Production-ready
| Rule Evaluation | **REAL** | `evaluateRules` with fact matching and execution; CONDITION/VALIDATION stop after first match; CALCULATION chains unless `stopAfterFirstMatch` set; regex evaluated via sandboxed helper; side effects (`call`/`emit`) published to outbox | None | Production-ready
| Rule Versioning | **REAL** | Auto-incremented `version` per `(tenantId, ruleSetKey, name)` | Previously claimed `publishRuleSet` does not exist; versioning is per-name automatic | Production-ready
| Rule Templates | **REAL** | `createTemplate`, `listTemplates`, `createRuleFromTemplate`; tenant-scoped | No `rule_templates` table was created before audit fix | Production-ready
| Tenant Isolation | **REAL** | All single-resource reads/writes/deletes filter by `tenantId`; controller derives tenant only from JWT | Previously accepted `tenantId` from body/query | Production-ready
| Authorization | **REAL** | `@RequirePermissions` on every endpoint; `PermissionsGuard` enforces; permissive `AbacGuard` removed; `TenantGuard` throws on mismatch; JWT guard supports JWKS RS256 + HS256 fallback | None | Production-ready
| Performance Metrics | **REAL** | `getExecutionMetrics` with execution counts, success rate, average execution time, and top matched rules | Previously claimed `getMetrics` with hit/miss timing does not exist | Production-ready
| Health Checks | **REAL** | `/health` checks database, outbox pending/failed events, and Kafka broker connectivity | Previously only checked DB | Production-ready
