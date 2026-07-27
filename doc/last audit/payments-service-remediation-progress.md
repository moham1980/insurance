# Payments-Service Remediation Progress

**Started:** 2026-07-27
**Scope:** `services/payments-service`
**Goal:** Close all P0/P1 findings from `11-payments-service-code-audit.md` and bring the service to production readiness.

## 1. Remediation Plan

### P0 — Must fix before production

1. **Tenant isolation**
   - Add `tenant_id` to `payment_intents` and `payments`.
   - Replace global queries in `PaymentsService` with tenant-scoped lookups.
   - Update all controller endpoints to pass `tenantId` from JWT.
2. **TenantGuard fix**
   - Set `req.tenantId`.
   - Reject non-system requests with missing `tenantId`.
3. **Authorization simplification**
   - Remove `AbacGuard` (or make it a no-op wrapper around `PermissionsGuard`).
   - Rely exclusively on `PermissionsGuard` for role/permission checks.
4. **JWT algorithm upgrade**
   - Replace local HS256-only `JwtAuthGuard` with JWKS/RS256 support and HS256 fallback.
5. **Gateway callback security**
   - Add `JwtAuthGuard` + `PermissionsGuard` + `TenantGuard`.
   - Make HMAC signature mandatory when `PSP_CALLBACK_SECRET` is set.
   - Validate `gatewayPaymentId`/`amount`/`claimId`/`tenantId` against stored intent.
6. **Gateway status alignment**
   - Add `gateway_payment_id` column.
   - `initiateGatewayPayment` sets `gatewayPaymentId` and stores status `gateway_initiated`.
   - `handleGatewayCallback` queries by `gatewayPaymentId`, supports only `success`/`failed`, removes `paymentIntentId` fallback.
7. **BankPaymentProvider endpoint alignment**
   - Use `/api/v1/ecosystem/payments/initiate`, `/{paymentId}`, `/verify-account`.
   - Send `payments:write` JWT, `X-Idempotency-Key`, `fromAccountId`, `toAccountId`, `paymentType`, `rail`.
8. **Separation of duties**
   - Add `prepared_by_user_id` to `payment_intents`.
   - `financeApprove` rejects when `approverUserId === preparedByUserId`.

### P1 — High priority

9. Make `execute` invoke PSP/bank provider and only create `Payment` on confirmed success.
10. Scope idempotency by `(tenant_id, idempotency_key)`.
11. Tenant-scope `reconcilePayments`.
12. Validate `bank.payment.completed` event schema and `tenantId`/`currency` in Kafka consumer.
13. Add regression tests.

### P2 — Medium priority

14. Align `PORT` default (`3015` → `3004`) with `Dockerfile`.
15. Add `updated_at` to `payments` and proper indexes.
16. Register `IranPspProvider` and `BankPaymentProvider` as Nest providers via a factory.
17. Create `PaymentDispute` entity and migrate `createDispute`.

## 2. Progress Log

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Plan created | Completed | This file initialized. |
| 2 | Tenant isolation | Completed | Added `tenantId` to `PaymentIntent`, `Payment`, `PaymentDispute`; scoping in all repo queries and service methods. |
| 3 | TenantGuard fix | Completed | `tenant.guard.ts` now sets `req.tenantId`, rejects missing tenant, treats system users specially, and validates header/user consistency. |
| 4 | Authorization simplification | Completed | `AbacGuard` removed from `app.module.ts` and `payments.controller.ts`; all endpoints use `JwtAuthGuard` + `PermissionsGuard` + `TenantGuard` with `RequirePermissions`. |
| 5 | JWT algorithm upgrade | Completed | `jwt-auth.guard.ts` now supports RS256 via JWKS (with caching) and falls back to HS256 using `JWT_SECRET`. Normalizes `tenantId`/`userId`/`roles`/`permissions`. |
| 6 | Gateway callback security | Completed | `gateway-callback.controller.ts` applies guards, enforces HMAC when `PSP_CALLBACK_SECRET` is set, validates `status`, and delegates to tenant-scoped `handleGatewayCallback`. |
| 7 | Gateway status alignment | Completed | Added `gatewayPaymentId` and `preparedByUserId` to `PaymentIntent`; `initiateGatewayPayment` stores `gatewayPaymentId` and `gateway_initiated`; `handleGatewayCallback` queries by `gatewayPaymentId` and supports only `success`/`failed` (pending is a no-op). |
| 8 | BankPaymentProvider alignment | Completed | Rewrote `psp/bank-payment.provider.ts` to call `/api/v1/ecosystem/payments/initiate` and `/{paymentId}` with `payments:write` JWT, `X-Idempotency-Key`, rail/payment-type, and source/target account support. |
| 9 | Separation of duties | Completed | `financeApprove` rejects when `approverUserId === preparedByUserId`. |
| 10 | Execute verifies PSP/bank | Completed | `execute` calls `pspProvider.executePayment` and only creates a `Payment` on success; supports manual `providerRef` fallback only when no provider is configured. |
| 11 | Idempotency scoping | Completed | `preparePayment` now looks up by `(tenantId, idempotencyKey)`; composite unique index. |
| 12 | Reconcile scoping | Completed | `reconcilePayments` filters internal payments by `tenantId` and date range. |
| 13 | Kafka consumer validation | Completed | `main.ts` extracts `tenantId`/`currency`/`amount` from `bank.payment.completed` and `insurance.claim.payment_requested`; validates amount and tenant before processing. |
| 14 | PORT alignment | Completed | `main.ts` defaults to `3004` matching `Dockerfile` `EXPOSE 3004`. |
| 15 | Indexes & timestamps | Completed | Added `tenantId` and `updatedAt` indexes on `payment_intents` and `payments`; added `updatedAt` to `Payment`. |
| 16 | PSP provider registration | Completed | `app.module.ts` registers `BankPaymentProvider`, `IranPspProvider`, and a factory-bound `PSP_PROVIDER` token; `payments.service.ts` injects it. |
| 17 | PaymentDispute entity | Completed | Created `entities/PaymentDispute.ts` and migration `1700000000505`; `createDispute` now inserts a dispute row. |
| 18 | Regression tests | Completed | Added `test/tenant-guard.test.ts` and `test/jwt-auth-guard.test.ts` covering tenant isolation, JWKS/HS256 validation, and missing-token rejection. |
| 19 | Build & unit tests | Completed | `bun run build` passes; `bun test` passes (10/10). |

## 3. Files Changed

- `services/payments-service/src/app.module.ts`
- `services/payments-service/src/main.ts`
- `services/payments-service/src/payments.controller.ts`
- `services/payments-service/src/payments.service.ts`
- `services/payments-service/src/jwt-auth.guard.ts`
- `services/payments-service/src/tenant.guard.ts`
- `services/payments-service/src/permissions.ts`
- `services/payments-service/src/gateway-callback.controller.ts`
- `services/payments-service/src/data-source.ts`
- `services/payments-service/src/entities/PaymentIntent.ts`
- `services/payments-service/src/entities/Payment.ts`
- `services/payments-service/src/entities/PaymentDispute.ts` (new)
- `services/payments-service/src/migrations/1700000000504-add-tenant-and-gateway-columns.ts` (new)
- `services/payments-service/src/migrations/1700000000505-add-payment-disputes.ts` (new)
- `services/payments-service/src/psp/psp.interface.ts`
- `services/payments-service/src/psp/psp.provider.token.ts` (new)
- `services/payments-service/src/psp/bank-payment.provider.ts`
- `services/payments-service/src/psp/iran-psp.provider.ts`
- `services/payments-service/package.json`
- `services/payments-service/test/tenant-guard.test.ts` (new)
- `services/payments-service/test/jwt-auth-guard.test.ts` (new)
- `doc/last audit/payments-service-remediation-progress.md` (this file)

## 4. Verification Commands

```bash
cd services/payments-service
bun run build
bun test
```

Result: `bun run build` completed successfully; `bun test` ran 10 tests with 0 failures.

## 5. Remaining / Follow-up Items

- **Integration tests** against a real PostgreSQL + Kafka + Redis stack (currently out of scope of this focused remediation; unit tests and build pass). Integration harness can be added in `tests/integration/payments.test.ts` using existing platform helpers (`JwtFactory`, `ApiClient`, `db-helper`).
- **Runtime smoke test** inside the Docker compose stack to confirm migrations run and `/health` returns `UP`.
- **IAM JWKS endpoint** must be reachable when `PAYMENT_PROVIDER=bank` and ecosystem tokens are RS256.
- **Bank payment-service** at `BANK_PAYMENT_SERVICE_URL` must expose `/api/v1/ecosystem/payments/initiate` and `/{paymentId}` and accept `scope=payments:write`.

## 6. Design Decisions

- `JwtAuthGuard` implements JWKS locally using Node's `crypto.createPublicKey` and `fetch`, avoiding an extra `jwks-rsa` dependency for this service.
- `Payment` duplicate execution protection uses a partial unique index on `(tenant_id, payment_intent_id, COALESCE(provider_ref, ''), status)` for `executed` status, in addition to service-level idempotency checks.
- `execute` returns the provider's `providerRef`/`railReference` and creates the `Payment` record in the same transaction so the ledger event and payment row are never out of sync.
- `GatewayCallbackController` requires guards and validates HMAC when `PSP_CALLBACK_SECRET` is set; if the PSP callback cannot carry an ecosystem JWT, the calling gateway must forward the callback with a service token or rely on the shared-secret HMAC path.

