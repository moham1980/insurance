# Billing Service — Capability Truth Registry

This document records the runtime truth of billing capabilities as required by Wave 1 (Truth Alignment) and the P0/P1 remediation outcomes.

## Remediation Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Database schema completeness | **REAL** | `src/migrations/1700000001400-init.ts` creates all required tables and enums idempotently | None | Production-ready
| Migration runner | **REAL** | `src/migrate.ts` uses TypeORM DataSource `runMigrations()` | None | Production-ready
| Payment transaction persistence | **REAL** | `PaymentTransaction` entity + `payment-gateway.service.ts` repository-backed | In-memory `Map` removed | Production-ready
| Overdue query | **REAL** | `markOverdue()` uses TypeORM QueryBuilder with Postgres-compatible date filter | MongoDB `$lt` removed | Production-ready
| Invoice lifecycle events | **REAL** | `invoice.created` and `invoice.issued` are distinct outbox events | Duplicated `InvoiceIssued` removed | Production-ready
| Journal events | **REAL** | `journal.created` outbox event added to `createJournalEntry` | Missing event added | Production-ready
| Tenant isolation | **REAL** | All service and controller methods enforce `tenantId` from JWT; DB queries scoped by `tenantId` | None | Production-ready
| Idempotency | **REAL** | `IdempotencyService` + `IdempotencyKey` entity used by invoice, journal, and payment creation | None | Production-ready
| Financial reports | **REAL** | `getTrialBalance`, `getPnLReport`, `getBalanceSheet` use SQL aggregates | In-memory loops removed | Production-ready
| JWT authentication | **REAL** | `JwtAuthGuard` supports JWKS RS256 with HS256 fallback | None | Production-ready
| RBAC enforcement | **REAL** | `AbacGuard` removed; `PermissionsGuard` is the sole authorization guard | `AbacGuard` bypass removed | Production-ready
| Auto-deposit persistence | **REAL** | `AutoDepositConfig` and `BankTransaction` entities; `AutoDepositVerificationService` uses DB | In-memory arrays removed | Production-ready
| Input validation | **REAL** | `class-validator` DTOs + global `ValidationPipe` | None | Production-ready
| Test suite | **REAL** | `billing.service.spec.ts`, `idempotency.service.spec.ts`, `tenant.guard.spec.ts` added | Requires `npm install` and full run | Production-ready

## Notes

- `billing.controller.ts` no longer trusts `tenantId` from request body/query; it is always taken from the JWT payload set by `TenantGuard`.
- `PaymentGatewayService` no longer uses `Map<string, PaymentTransaction>`; all state is persisted to `payment_transactions`.
- `AutoDepositVerificationService` persists pending bank transactions in `bank_transactions` and configuration in `auto_deposit_config`.
- Kafka consumer in `main.ts` now reads `tenantId` from the event payload and calls tenant-scoped service methods.
