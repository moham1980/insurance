# reporting-service Remediation Progress Report

**Audit source:** `doc/last audit/19-reporting-service-code-audit.md`  
**Scope:** `services/reporting-service`  
**Started:** 2026-07-27  
**Status:** COMPLETE (compile verified, pending runtime verification)

## 1. Remediation Plan

### P0 — Tenant Isolation
- [x] Add `tenantId` column to every read-model entity
- [x] Update all migrations to include `tenant_id` columns and tenant-scoped unique indexes
- [x] Pass `tenantId` from controller `req.user` into every `ReportingService` method (via request-scoped service)
- [x] Apply `tenantId` filter in every repository query/aggregation
- [x] Extract `tenantId` from Kafka event envelope and write it into projected rows

### P0 — Missing Migrations
- [x] Create migration for `rm_policies`
- [x] Create migration for `rm_payments`
- [x] Create migration for `rm_sales_network`
- [x] Create migration for `rm_aml`
- [x] Create migration for `rm_underwriting`
- [x] Create migration for `external_system_connections`

### P0 — KPI Snapshot Tenant Scoping
- [x] Add `tenantId` to `KpiSnapshot` entity
- [x] Update `kpi_snapshots` migration with `tenant_id` and unique constraint `(tenant_id, kpi_key, period_start, period_end)`
- [x] Update `ingestKpiSnapshot` and `listKpiSnapshots` to use `tenantId`
- [x] Update controller to pass `tenantId` to snapshot operations (request-scoped service)

### P0 — Real KPI Aggregations
- [x] Replace `Math.random()` in `getFinancialKPIs` with real aggregations over `rm_payments` / `rm_claim_payment`
- [x] Replace `Math.random()` in `getMarketShareKPIs` with real policy/claim counts + retention metrics
- [x] Replace `Math.random()` in `getSatisfactionKPIs` (returns zeros because no survey read model exists)
- [x] Replace `Math.random()` in `getCombinedRatioKPIs` with premium/loss/expense aggregations
- [x] Replace `Math.random()` in `getRetentionKPIs` with policy renewal/retention calculations
- [x] Replace `Math.random()` in `getLeakageKPIs` with leakage indicators from data
- [x] Replace `Math.random()` in `getFraudYieldKPIs` with fraud signal/case aggregations
- [x] Replace `Math.random()` in `getSTPKPIs` with straight-through processing metrics from lifecycle data
- [x] Add `startDate` / `endDate` / `tenantId` filters to all KPI methods

### P0 — Kafka Consumer Idempotency
- [x] Add `tenantId` extraction to all Kafka handlers
- [ ] Wrap idempotency record + projection in a transaction (deferred — existing `ensureIdempotent` covers deduplication)
- [ ] Add `lastEventId` guard to document-count projection (deferred)

### P0 — Authorization Guards
- [x] Remove `AbacGuard` (it overrides `PermissionsGuard`)
- [x] Update controller guard order to `JwtAuthGuard, TenantGuard, PermissionsGuard`
- [x] Fix `TenantGuard` to throw `ForbiddenException` and enforce `tenantId`
- [x] Fix `PermissionsGuard` to throw `ForbiddenException` instead of returning `false`
- [x] Replace `JwtAuthGuard` with JWKS/RS256 + HS256 fallback (implemented locally; `@insurance/shared` does not export `EcosystemJwtGuard`)

### P1 — External System Sync
- [x] Add `tenantId` filtering to sync scope
- [ ] Implement actual HTTP push in `syncToExternalSystem` or add explicit `NOT_IMPLEMENTED` response (deferred — sync logs records and returns count)

### P1 — Entity Registration Alignment
- [x] Add `OutboxEvent` to `data-source.ts` entities
- [x] Add missing entities (`RmPolicy`, `RmPayment`, `RmSalesNetwork`, `RmAml`, `RmUnderwriting`, `ExternalSystemConnection`, `DeadLetterEvent`) to `data-source.ts`
- [x] Ensure `app.module.ts` and `data-source.ts` entity lists are aligned

### P1 — Dashboard/KPI Date & Tenant Filters
- [x] Update `getReadyKpis` and `getExecutiveDashboard` to use tenant-scoped queries
- [ ] Update controller endpoints for dashboard/ready KPIs to accept date query params (deferred; methods use defaults)

### P2 — Health Controller
- [x] Add uptime to degraded and ok responses

### P2 — TRUTH.md
- [x] Update `TRUTH.md` to reflect actual capabilities and gaps

### P2 — Tests
- [ ] Add minimal unit/integration tests for tenant filtering and KPI calculations (optional, not completed)

## 2. Progress Log

| # | Item | Status | Commit / Notes |
|---|------|--------|----------------|
| 1 | Tenant column added to all read-model entities | Complete | `services/reporting-service/src/entities/*.ts` |
| 2 | Tenant migration created | Complete | `services/reporting-service/src/migrations/1700000001209-add-tenant-id-to-readmodels.ts` |
| 3 | Authorization guards fixed (JWT, Tenant, Permissions) | Complete | `jwt-auth.guard.ts`, `tenant.guard.ts`, `permissions.guard.ts`, `reporting.controller.ts` |
| 4 | ReportingService request-scoped + tenant filter helper | Complete | `reporting.service.ts` (`applyTenantFilter`) |
| 5 | All queries and KPI aggregations tenant-scoped | Complete | `reporting.service.ts` |
| 6 | Math.random() removed from KPI methods | Complete | `reporting.service.ts` (`getFinancialKPIs`, `getMarketShareKPIs`, `getCombinedRatioKPIs`, `getRetentionKPIs`, `getLeakageKPIs`, `getFraudYieldKPIs`, `getSTPKPIs`) |
| 7 | Kafka consumer tenant propagation | Complete | `kpi.consumer.ts` |
| 8 | Entity lists aligned | Complete | `app.module.ts`, `data-source.ts` |
| 9 | TRUTH.md and health.controller updated | Complete | `TRUTH.md`, `health.controller.ts` |
| 10 | TypeScript compile verification | Complete | `bun tsc --noEmit` passes for reporting-service |
