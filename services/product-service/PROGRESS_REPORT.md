# product-service Audit Remediation — Progress Report

**Audit source:** `doc/last audit/04-product-service-code-audit.md`
**Target service:** `services/product-service`
**Report date:** 2026-07-26 (session continuation)

## 1. Completed work

### Tenant isolation
- Added `tenantId` to `Product`, `Coverage`, `Deductible`, `PricingRule` and `ProductVersion` entities.
- Updated `1760000000620-add-tenant-and-product-versions.ts` to add `tenant_id` columns, tenant-scoped unique indexes and the `product_versions` table.
- Registered `ProductVersion` and `OutboxEvent` in `data-source.ts`.
- Added `tenantId` to all service method signatures and query builders.
- Updated `ProductController` to extract `tenantId` with `requireTenant(req)` and pass it to every service call.

### Transactional CRUD with outbox events
- Wrapped all create/update/delete operations in `dataSource.transaction`.
- Used `OutboxPublisher` inside transactions to publish domain events:
  - `ProductCreated`, `ProductUpdated`
  - `CoverageCreated`, `CoverageUpdated`, `CoverageArchived`
  - `DeductibleCreated`, `DeductibleUpdated`, `DeductibleArchived`
  - `PricingRuleCreated`, `PricingRuleUpdated`, `PricingRuleArchived`
  - `ProductVersionPublished`
- Added `correlationId` to all mutation methods.

### Canonical quote engine and money handling
- Created `src/money.ts` (`Money` decimal arithmetic, `toFiniteNumber`).
- Created `src/quote-engine.ts` (`QuoteEngine.compute`) enforcing:
  - product status and effective date
  - region and currency matching
  - priority-ordered rule evaluation with conditions
  - lower/upper bound validation
- Replaced legacy quote computation in `product.service.ts` with `QuoteEngine.compute`.

### Controller hardening
- Added `ForbiddenException` import and `requireTenant(req)` helper.
- Passed `tenantId`, `correlationId` and `currency` to service methods.
- Added `@Req()` to `evaluatePricingRules`.

### Guards and auth policy
- Hardened `TenantGuard` to require `tenantId` and reject `x-tenant-id` mismatches.
- Hardened `AbacGuard` to reject state-changing requests from users with no roles.
- Replaced `JwtAuthGuard` with JWKS RS256 validation plus issuer/audience/algorithm checks and HS256 fallback.
- Added `jwks-rsa` to `package.json`.

### Operations
- `main.ts` now `await`s `outboxWorker.start()` and stops the worker on application close.
- `health.controller.ts` checks DB and outbox backlog without exposing raw DB errors.
- Removed `NODE_TLS_REJECT_UNAUTHORIZED=0` from `Dockerfile`.
- Updated `TRUTH.md` to reflect actual capabilities and remaining gaps.

## 2. Verification

- `npx tsc --noEmit` was used during the session to confirm type correctness after controller/service signature alignment.

## 3. Remaining gaps (P1/P2)

- Immutable publish lifecycle with approval workflow and effective-date activation.
- Quote replay from historical `ProductVersion` snapshots.
- `RateTable` / `updateRateTable` implementation.
- Secure async export with signed download, rate/size limits and redaction.
- Dedicated regression tests for quote arithmetic, rule ordering, tenant isolation, export and migration.
- Automated JWKS key-rotation tests.
- Kafka/outbox freshness metric exposure beyond the pending-count check.

## 4. Files changed

- `src/entities/Product.ts`
- `src/entities/Coverage.ts`
- `src/entities/Deductible.ts`
- `src/entities/PricingRule.ts`
- `src/entities/ProductVersion.ts`
- `src/migrations/1760000000620-add-tenant-and-product-versions.ts`
- `src/data-source.ts`
- `src/money.ts` (new)
- `src/quote-engine.ts` (new)
- `src/product.service.ts`
- `src/product.controller.ts`
- `src/tenant.guard.ts`
- `src/abac.guard.ts`
- `src/jwt-auth.guard.ts`
- `src/main.ts`
- `src/health.controller.ts`
- `package.json`
- `Dockerfile`
- `TRUTH.md`
- `PROGRESS_REPORT.md` (this file)
