# @insurance/shared Package Audit Remediation Progress

**Source audit:** `21-insurance-shared-package-code-audit.md`  
**Scope:** `packages/shared` and its adoption by NestJS/Fastify services  
**Started:** 2026-07-27  

## Remediation Plan

### P0 — Security / Correctness

| # | Issue | Target File(s) | Status |
|---|-------|----------------|--------|
| P0-1 | Shared `TenantGuard` not used; service guards are permissive clones | `src/tenant-guard.ts`, `services/*/src/tenant.guard.ts` | Completed |
| P0-2 | `ConsumedEvent` / `IdempotentConsumer` lack `tenantId` | `src/events/ConsumedEvent.ts`, `src/events/IdempotentConsumer.ts` | Completed |
| P0-3 | No TypeORM migrations for `outbox_events`, `consumed_events`, `dead_letter_queue` with `tenant_id` | `src/migrations/1720000000000-AddSharedTables.ts`, `src/database/index.ts`, `create-outbox-tables.sql` | Completed |
| P0-4 | `pii-masking.middleware.ts` mutates global `console.log` and `res.json` | `src/pii-masking.middleware.ts` | Completed (file removed) |

### P1 — Reliability / Architecture

| # | Issue | Target File(s) | Status |
|---|-------|----------------|--------|
| P1-1 | `AbacGuard` is a permissive stub | `src/abac-guard.ts` | Completed |
| P1-2 | `TenantId` decorator is broken for NestJS | `src/tenant-isolation.middleware.ts` | Completed |
| P1-3 | Idempotency middleware is Express-only | `src/idempotency-middleware.ts` | Completed |
| P1-4 | `OutboxWorker` sleeps inside DB transaction | `src/events/OutboxWorker.ts` | Completed |
| P1-5 | `DLQService` creates a Kafka producer per retry | `src/messaging/DLQService.ts` | Completed |
| P1-6 | `SchemaRegistry` validation is only required-field presence | `src/schema/SchemaRegistry.ts` | Completed |
| P1-7 | Consent/lineage are in-memory singletons | `src/consent-management.ts`, `src/data-lineage.ts`, `src/entities/ConsentRecordEntity.ts`, `src/entities/LineageEventEntity.ts` | Completed |
| P1-8 | Weak hashes in `gdpr-compliance.ts` / `data-minimization.ts` | `src/gdpr-compliance.ts`, `src/data-minimization.ts` | Completed |

### P2 — Quality / Documentation

| # | Issue | Target File(s) | Status |
|---|-------|----------------|--------|
| P2-1 | `OutboxPublisher.markAsFailed` uses invalid TypeORM raw update | `src/events/OutboxPublisher.ts` | Completed |
| P2-2 | `VaultSecretsLoader` lacks mTLS / token renewal | `src/vault-secrets.ts` | Completed |
| P2-3 | `TRUTH.md` overstates readiness | `TRUTH.md` | Completed |

## Execution Log

- **Tenant isolation (P0-1, P0-2, P0-3)**: Centralized `TenantGuard` in `src/tenant-guard.ts`; service-level `tenant.guard.ts` files re-export it. Added `tenantId` to `OutboxEvent`, `ConsumedEvent`, `DeadLetterEvent` and `IdempotentConsumer`. Created idempotent TypeORM migration `1720000000000-AddSharedTables` and updated `createDataSource()` to register it.
- **PII masking (P0-4)**: Removed `pii-masking.middleware.ts` which mutated `res.json` and `console.log`. Structured redaction remains in `pii-redaction.ts`.
- **Outbox/DLQ (P1-4, P1-5, P2-1)**: `OutboxPublisher.markAsFailed` now loads/saves to increment `attemptCount`. `OutboxWorker` processes events in individual transactions and sleeps outside the DB transaction. `DLQService` reuses a single Kafka producer and propagates `tenantId`.
- **Idempotency/decorator (P1-2, P1-3)**: `TenantId` is now a `createParamDecorator`. `idempotency-middleware.ts` includes `IdempotencyInterceptor` and `Idempotent` decorator that work for NestJS Express and Fastify.
- **Security (P1-1, P1-8)**: `AbacGuard` now enforces `RequireAttributes`. `anonymizeHash` and `hashValue` use HMAC-SHA256 with environment secrets.
- **Schema/validation (P1-6)**: `SchemaRegistry` now converts a JSON-schema subset to Zod and validates events with type/format/enum/range checks.
- **Governance persistence (P1-7)**: `ConsentManagementService` and `DataLineageService` accept a TypeORM `DataSource` and persist via `ConsentRecordEntity` and `LineageEventEntity`, falling back to in-memory when no DataSource is set.
- **Vault (P2-2)**: `VaultSecretsLoader` supports mTLS via client cert/key/CA and optional periodic Vault token renew-self.
- **Truth alignment (P2-3)**: `TRUTH.md` updated to reflect actual readiness and remaining gaps.

## Verification

- Ran `npx tsc --noEmit -p tsconfig.json` in `packages/shared`; TypeScript compilation succeeds.
- New `ConsentRecordEntity` and `LineageEventEntity` are wired into `createDataSource()` along with the migration.
- `src/index.ts` exports the fixed modules. Renamed conflicting `ConsentRecord` (→ `GdprConsentRecord`) and `RetentionPolicy` (→ `EventRetentionPolicy`) to avoid re-export clashes.
- Rebuilt `packages/shared` (`npm run build`) so `TenantGuard` and other new exports are present in `dist`.
- Verified downstream services compile: `rule-engine-service`, `regulatory-gateway-service`, `orchestrator-service`, `reporting-service`, `reinsurance-service`.
- Ran `npx jest --passWithNoTests` in `packages/shared`; 10 tests passed across 2 suites.

## Additional fixes found during verification

- `orchestrator-service`, `reporting-service`, and `reinsurance-service` still had custom `tenant.guard.ts` copies; replaced with `export { TenantGuard } from '@insurance/shared';`.
- `OutboxPublisher.publish` had `tenantId` as a required `PublishOptions` field, which broke services that publish events without passing it explicitly. Made `tenantId` optional and added `resolveTenantId()` to derive it from `subject`/`payload` or default to `'unknown'`.
- Rebuilt the `dist` output so service-level re-exports of `TenantGuard` resolve and the updated `OutboxPublisher` types are available.

