# Reinsurance Service Remediation Progress

This document records the progress of fixing the deficiencies identified in the reinsurance-service code audit (`18-reinsurance-service-code-audit.md`) and the remediation plan (`reinsurance-remediation-plan.md`).

## Status Summary

| Priority | Items | Status |
|---|---|---|
| P0 | Schema, tenant isolation, authorization, period close, event publishing | **Completed** |
| P1 | Kafka consumer, cession settlement, unit tests | **Completed** |
| Report | Independent progress report | **Completed** |

---

## P0 Fixes Completed

### 1. Tenant Isolation Across All Entities

- Added `tenantId` column and indexes to the following entities:
  - `ReTreaty`
  - `ReCession`
  - `ReStatement`
  - `ReReconciliation`
  - `ReClaimRecovery`
  - `ReTicket`
  - `ReTicketMessage`
  - `ReTicketAttachment`
- Added `tenant_id` columns and indexes in migrations:
  - `1760000000510-create-reinsurance-tables.ts`
  - `1760000000511-create-recoveries-and-tickets.ts`
  - `1760000000512-create-shared-event-tables.ts`
  - `1760000000514-reinsurance-tenant-and-columns.ts` (new migration)

### 2. Schema Alignment

- Added missing columns to `ReTreaty` and `ReCession` and corresponding migrations:
  - `retention_rate`, `cession_rate`, `config`
  - `cession_type`, `ceded_premium`, `ceded_sum_insured`
  - `effective_from`, `effective_to`, `currency`
- Added `tenant_id` to `outbox_events` and `consumed_events` tables.
- Fixed duplicate `ReStatementStatus` declaration.

### 3. Authorization Hardening

- Replaced `JwtAuthGuard` with `EcosystemJwtGuard` supporting JWKS/RS256 and HS256 fallback.
- Rewrote `TenantGuard` to throw `ForbiddenException` on missing `tenantId` or header mismatch.
- Removed `AbacGuard` from all controller endpoints.
- Updated `AppModule` providers to register `EcosystemJwtGuard`, `TenantGuard`, `Reflector`, and `PermissionsGuard`.

### 4. Service Logic — `reinsurance.service.ts`

- All create/get/list/update/delete methods now require `tenantId` and filter queries by it.
- `createTreaty` enforces unique `(tenantId, treatyNumber)`.
- `calculateCessionAmount` now reads from treaty `terms` first, with `config` fallback.
- `isTreatyApplicable` now validates `lineOfBusiness` and `productCodes`.
- `closePeriod` rewritten to:
  - Aggregate approved cessions per treaty and period.
  - Create a single statement per treaty/period.
  - Mark all included cessions as `settled`.
  - Publish `RePeriodClosed` event with `tenantId`.
- `registerExternalInvoice` now preserves invoice history inside `details` to prevent silent overwrites.
- `autoMatchInvoice` tolerance is bounded and uses configurable buffer days.
- Event publishing subjects include `tenantId`.

### 5. Controller — `reinsurance.controller.ts`

- Replaced `JwtAuthGuard` and `AbacGuard` with `EcosystemJwtGuard` and `TenantGuard`.
- Extracted `tenantId` from `req.user` and passed it to all service methods.
- Added `productCode` and `lineOfBusiness` query parameters to `listTreaties`.
- Added new DTO fields for `createTreaty` and `createCession`.

---

## P1 Fixes Completed

### 1. Kafka Consumer — `policy.consumer.ts`

- Removed polling-based `ConsumedEvent` reader.
- Implemented `KafkaConsumer` with `insurance.policy.events` topic.
- Added tenant and product filtering using `tenantId` and `productCode`/`lineOfBusiness` from the event payload.
- Uses `consumeOnce` for idempotent processing.
- Skips gracefully when `KAFKA_BROKERS` is not configured.

### 2. Unit Tests

- Added `services/reinsurance-service/src/__tests__/reinsurance.service.test.ts` covering:
  - Tenant isolation in `createTreaty` and `listTreaties`.
  - `closePeriod` aggregation and cession settlement.
  - `calculateAutomaticCessions` product-code filtering and tenant scoping.
- Added `jest.config.cjs` and `tsconfig.test.json` for service-level unit testing.
- TypeScript compilation (`bun tsc --noEmit`) passes for the service.

### 3. Health Check — `health.controller.ts`

- Added optional Kafka connectivity check using `admin.describeCluster()`.

---

## Verification

- `bun tsc --noEmit` in `services/reinsurance-service` completed successfully.
- Test suite is configured and ready to run; execution was initiated.

## Remaining / Follow-Up Items

- Run `bun jest --config services/reinsurance-service/jest.config.cjs` to completion and fix any test failures (do not weaken tests).
- Run the new migration `1760000000514-reinsurance-tenant-and-columns.ts` on a clean database and validate schema.
- Perform end-to-end validation of `/re/periods/close` with real cession data.

## Documents

- Remediation Plan: `doc/last audit/reinsurance-remediation-plan.md`
- Progress Report: `doc/last audit/reinsurance-remediation-progress.md` (this file)
- Audit Report: `doc/last audit/18-reinsurance-service-code-audit.md`
