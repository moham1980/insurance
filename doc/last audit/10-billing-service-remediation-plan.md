# Billing Service Remediation Plan

**Source audit:** [10-billing-service-code-audit.md](./10-billing-service-code-audit.md)
**Scope:** `services/billing-service` in `d:\CascadeProjects\old\insurance`
**Goal:** Make billing-service production-ready by closing all P0 and high-priority P1 findings.

## Remediation methodology

- Fix root causes; do not weaken tests or expectations.
- All production state moves to PostgreSQL; no in-memory stores.
- Every read/write is tenant-scoped using `req.user.tenantId` from the verified JWT.
- All state-changing operations are wrapped in explicit transactions and publish outbox events for downstream consumers.
- Adopt the shared `EcosystemJwtGuard` (`@insurance/common`) for RS256/JWKS validation and keep HS256 only as a local fallback.

## Phase 1 — P0 Blockers (schema, durability, safety)

### 1.1 Database schema completeness
Create one combined migration that creates all missing tables and enums with `IF NOT EXISTS` guards and idempotent indexes.
New entities/tables:
- `journal_entries` (with `entry_status` enum)
- `accounts` (with `account_type`, `account_category` enums)
- `financial_periods` (with `period_status` enum)
- `cost_centers` (add `tenant_id`)
- `reconciliation_results` (add `tenant_id` and `reconciliation_status` enum)
- `outbox_events` (match `OutboxEvent.ts` columns)
- `payment_transactions` (new entity for durable payment gateway state)
- `idempotency_keys` (for command idempotency)
- `auto_deposit_config` (for persistent auto-deposit config)
- `bank_transactions` (for durable auto-deposit ingestion)

### 1.2 Replace `migrate.ts` runner
Rewrite `src/migrate.ts` to use `DataSource` from TypeORM 0.3.x, load all migrations from `migrations/*.{ts,js}`, and call `runMigrations({ transaction: 'all' })`.
Add `migrations` array to `app.module.ts` `TypeOrmModule.forRoot` so NestJS tracks applied migrations.

### 1.3 Durable payment transactions
Create `src/entities/PaymentTransaction.ts` mapped to `payment_transactions`.
Inject `PaymentTransaction` repository into `PaymentGatewayService`.
Replace `private transactions: Map<string, PaymentTransaction>` with repository reads/writes inside transactions.

### 1.4 Fix `markOverdue` PostgreSQL query
Replace `invoiceRepo.update({ status: ..., dueDate: { $lt: now } })` with `createQueryBuilder` using `LessThan` / raw `due_date < :now`.

### 1.5 Idempotency for invoices, payments, and journals
Read `x-idempotency-key` header in controllers and pass to services.
Create `IdempotencyService` backed by `idempotency_keys` table.
For each command (`createInvoice`, `issueInvoice`, `cancelInvoice`, `recordPayment`, `initiatePayment`, `verifyPayment`, `createJournalEntry`, `postJournalEntry`, `reverseJournalEntry`, `closeFinancialPeriod`) check the key before executing and store the result after success.

### 1.6 Tenant isolation
Pass `tenantId` (from `req.user.tenantId`) explicitly to all service methods.
Add `tenantId` to `CostCenter` and `ReconciliationResult` entities.
Reject body/query `tenantId` overrides in controllers; use JWT value only.
Scope all repository queries by `{ tenantId }` or `where: { tenantId, id }`.

## Phase 2 — P1 High-priority (security, events, reporting)

### 2.1 JWKS / RS256 JWT validation
Replace `JwtAuthGuard` with `EcosystemJwtGuard` from `@insurance/common`.
If the shared guard is not importable, copy/update the guard to:
- Try JWKS from `IAM_JWKS_URI` first.
- Fall back to `JWT_SECRET` HS256 for local tests.
- Validate `iss`, `aud`, `exp`.
Remove `JWT_SECRET` requirement when JWKS is configured.

### 2.2 ABAC / permissions guard
Either remove `AbacGuard` from the global `@UseGuards` chain or rewrite it to only allow `GET` for non-privileged roles and require the action permission for mutations.
Current implementation (`roles.length > 0`) bypasses `PermissionsGuard` and must be fixed.

### 2.3 Event semantics
- `createInvoice` emits `insurance.billing.invoice.created` (status `draft`).
- `issueInvoice` emits `insurance.billing.invoice.issued` (status `pending`).
- `createJournalEntry` emits `insurance.billing.journal.created` inside the transaction.
- `verifyPayment` / `recordPayment` emits `insurance.billing.payment.recorded` via outbox within a transaction.

### 2.4 Tenant-scoped Kafka consumer
In `main.ts`, validate `insurance.payment.completed` events for `tenantId` and currency/amount type.
Use `findInvoicesByClaimId(claimId, tenantId)` (to be added).
Use `(eventId, invoiceId)` idempotency before `recordPayment`.

### 2.5 SQL aggregate reporting
Rewrite `getTrialBalance`, `getAccountBalance`, `getPnLReport`, `getBalanceSheet` to use `SUM` / `COALESCE` in SQL with `CROSS JOIN LATERAL` on `jsonb` lines or normalize journal lines to a separate `journal_entry_lines` table for true aggregate queries.
For minimal correct fix without schema change, use a single SQL query per report that extracts lines and sums `debitAmount`/`creditAmount` by account.

### 2.6 Persistent auto-deposit config
Create `AutoDepositConfigEntity` and `auto_deposit_config` table keyed by `tenantId`.
Update `getConfig` / `updateConfig` to read/write the table.
Also persist ingested `BankTransaction` records to `bank_transactions` table instead of the in-memory array.

## Phase 3 — P2 Medium (validation, tests, docs)

### 3.1 DTOs and validation
Add `class-validator` and `class-transformer` dependencies.
Create DTOs for invoice, payment, journal, account, period, cost-center, reconciliation, auto-deposit inputs.
Enable `ValidationPipe` globally.
Enable `strict: true` in `tsconfig.json` and fix entity strictness (`!` assertions, `tenantId` on `CostCenter` / `ReconciliationResult`).

### 3.2 Health checks
Expand `health.controller.ts` to check:
- PostgreSQL (existing)
- Kafka producer connectivity
- Outbox worker liveness
- Payment gateway config / reachability

### 3.3 Tests
Add `jest` or `vitest` with PostgreSQL Testcontainers (or an in-memory fallback only if Testcontainers unavailable; the rule is real infra).
Cover:
- Invoice lifecycle (create → issue → mark-overdue → record-payment → paid)
- Payment gateway initiation/verify with durable transaction state
- Journal entry posting and reversal (balanced lines, posting validation)
- Tenant isolation
- Idempotency
- Trial balance / PnL aggregates
- Kafka consumer event handling

### 3.4 `TRUTH.md` alignment
Update `TRUTH.md` to accurately reflect implemented capabilities:
- Mark `Installment Scheduling`, `Payment Reminders`, `Overdue Handling` as `NOT_IMPLEMENTED` or implement them.
- Add `PaymentTransaction` persistence and idempotency as implemented.

## Execution checklist

| # | Finding | Priority | Implementation file(s) | Verification |
|---|---------|----------|------------------------|--------------|
| 1 | Combined schema migration | P0 | `src/migrations/1700000001400-init.ts` (split into numbered migrations or one combined) | Run `migrate` on clean DB and confirm all tables exist |
| 2 | `migrate.ts` runner | P0 | `src/migrate.ts` | Re-run succeeds and `migrations` table populated |
| 3 | `PaymentTransaction` entity | P0 | `src/entities/PaymentTransaction.ts`, `src/payment-gateway/payment-gateway.service.ts` | Restart service; payment state survives |
| 4 | `markOverdue` PG query | P0 | `src/billing.service.ts` | Test marks pending invoice overdue when due date passed |
| 5 | Idempotency | P0 | `src/entities/IdempotencyKey.ts`, `src/idempotency.service.ts`, controllers | Duplicate `x-idempotency-key` returns same result |
| 6 | Tenant isolation | P0 | All service methods + controllers | Cross-tenant read/write returns `NOT_FOUND` / `FORBIDDEN` |
| 7 | JWKS JWT | P1 | `src/jwt-auth.guard.ts` or use `@insurance/common` | RS256 token accepted |
| 8 | `AbacGuard` | P1 | `src/abac.guard.ts` / controller guards | Low-privilege role cannot mutate state |
| 9 | Invoice/journal event split | P1 | `src/billing.service.ts` | Topics `invoice.created` and `invoice.issued` are distinct |
| 10 | SQL aggregates | P1 | `src/billing.service.ts` | Reports work with 10k+ rows without timeout |
| 11 | Persistent auto-deposit config | P1 | `src/payment-gateway/auto-deposit-verification.service.ts` | Config survives restart |
| 12 | Tenant-scoped consumer | P1 | `src/main.ts` | Event with wrong tenant does not update invoice |
| 13 | DTOs / validation | P2 | `src/dtos/*.ts`, `src/main.ts` | Invalid payloads rejected before service layer |
| 14 | Tests | P1/P2 | `src/**/*.test.ts` | Suite passes |
| 15 | `TRUTH.md` | P2 | `TRUTH.md` | Matches code |

## Progress recording
All completed steps are recorded in `10-billing-service-remediation-progress.md` with timestamp, changed files, and verification notes.
