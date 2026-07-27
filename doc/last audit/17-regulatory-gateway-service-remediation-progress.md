# Regulatory-Gateway-Service Remediation Progress

**Start date:** 2026-07-27 22:28 +03:30  
**Scope:** `d:\CascadeProjects\old\insurance\services\regulatory-gateway-service`  
**Status:** In Progress — P0 fixes in flight

## 1. Findings Summary (from 17-regulatory-gateway-service-code-audit.md)

| # | Severity | Finding | Evidence | Fix Target |
|---|----------|---------|----------|------------|
| 1 | P0 | `SanhabEvent` has no `tenantId`; `listEvents` not tenant-scoped | `entities/SanhabEvent.ts`, `regulatory.service.ts:159-288` | Add `tenantId` column + filter all events |
| 2 | P0 | No `@RequirePermissions` on controller methods | `regulatory.controller.ts` | Add decorators to every endpoint |
| 3 | P0 | `AbacGuard` allows any authenticated role to mutate | `abac.guard.ts` | Replace/tighten guard |
| 4 | P0 | `TenantGuard` returns `false` instead of throwing exception | `tenant.guard.ts` | Throw `ForbiddenException` |
| 5 | P0 | `jwt-auth.guard.ts` only supports HS256 | `jwt-auth.guard.ts` | Adopt shared `EcosystemJwtGuard` with JWKS fallback |
| 6 | P0 | `sanhab_events` migration lacks `tenantId` + no `outbox_events` migration | `migrations/1700000000602-create-sanhab-events.ts` | New migration for `tenantId` + `outbox_events` table |
| 7 | P0 | Warehouse-fire and SMS inquiries are mock-only / in-memory | `warehouse-fire/*.ts`, `sanhab-sms/*.ts` | Persist state; wire real HTTP providers with safe fallback |
| 8 | P0 | `RealSanhabClient` passes wrong `request` object to `soap` | `sanhab-clients/real-sanhab.client.ts:127-151` | Use `https.Agent` and proper soap options |
| 9 | P0 | Webhook has no HMAC/signature verification | `regulatory.service.ts:159-220` | Add configurable webhook signature check |
| 10 | P1 | Circuit breaker state is in-memory per pod | `circuit-breaker.ts` | Persist state in Redis/DB |
| 11 | P1 | `RegulatoryFailureLog` missing tenant index | `entities/RegulatoryFailureLog.ts` | Add `@Index(['tenantId', 'createdAt'])` + migration |
| 12 | P1 | `listEvents` returns raw entity with `payload`/`headers` | `regulatory.service.ts:269-288` | Map to DTO, exclude sensitive fields |
| 13 | P2 | `health.controller.ts` only checks DB | `health.controller.ts` | Add Sanhab/Kafka health checks |
| 14 | P2 | `main.ts` no `search_path` set | `main.ts` | Set `search_path` on connection |

## 2. Remediation Order

### Wave A — Security & Isolation (P0, core blockers)
1. Add `tenantId` to `SanhabEvent` entity and `regulatory.service.ts` writes/queries.
2. Replace `jwt-auth.guard.ts` with shared `EcosystemJwtGuard` and add `jwks-rsa` dependency.
3. Fix `TenantGuard` to throw `ForbiddenException`.
4. Replace permissive `AbacGuard` with a stricter variant.
5. Add `@RequirePermissions(...)` to all `RegulatoryController` methods.
6. Add migration `1700000000603-add-tenantid-to-sanhab-events`.
7. Add migration `1700000000604-create-outbox-events`.
8. Add migration `1700000000605-add-tenant-index-to-failure-log`.

### Wave B — Real Integrations (P0)
9. Fix `RealSanhabClient` SOAP options using `https.Agent`.
10. Wire `WarehouseFireInquiryService` to a real HTTP client (with mock fallback when env not configured).
11. Persist SMS pending inquiries to DB (new `SanhabSmsInquiry` entity) and wire real SMS providers.
12. Add webhook HMAC signature verification with env-provided secret.

### Wave C — Resilience & Observability (P1/P2)
13. Replace in-memory circuit breaker with Redis-backed implementation (from `@insurance/shared` or new).
14. Map `listEvents` to a DTO that omits `headers` and raw `payload`.
15. Extend `HealthController` with Sanhab + Kafka checks.
16. Set `search_path` in `main.ts` or TypeOrm config.

## 3. Progress Log

| # | Date | Item | Status |
|---|------|------|--------|
| - | 2026-07-27 | Created remediation plan and started Wave A | Done |

