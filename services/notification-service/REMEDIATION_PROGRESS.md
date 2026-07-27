# Notification Service Remediation Progress

## Audit Source
- `d:\CascadeProjects\old\insurance\doc\last audit\12-notification-service-code-audit.md`
- Scope: `services/notification-service`

## Remediation Plan

### P0 — Must fix before production

| # | Finding | Planned Fix | File(s) | Status |
|---|---------|-------------|---------|--------|
| 1 | No permission requirements on controller | Add `@RequirePermissions` to every `NotificationController` route; remove overly permissive `AbacGuard` usage | `notification.controller.ts`, `permissions.ts` | **Completed** |
| 2 | `tenantId` from body, no enforcement | Always derive `tenantId` from JWT (`req.tenantId`); reject mismatched `body.tenantId` with `ForbiddenException` | `notification.controller.ts`, `tenant.guard.ts`, `notification.service.ts` | **Completed** |
| 3 | `TenantGuard` returns `false` instead of throwing | Throw `ForbiddenException` on mismatch or missing tenant for non-system users | `tenant.guard.ts` | **Completed** |
| 4 | OTP returned in response body | Do not return OTP; generate reference, store OTP in Redis with TTL, verify via `/otp/verify` | `notification.controller.ts`, `notification.service.ts`, `redis.service.ts` | **Completed** |
| 5 | OTP rate limiting in memory | Move to Redis-backed per-tenant/per-recipient counter with TTL | `notification.service.ts`, `redis.service.ts` | **Completed** |
| 6 | Unauthenticated delivery callbacks | Add `CallbackAuthGuard` requiring API-key or HMAC signature on `delivery-callback` and `webhooks/delivery` | `callback-auth.guard.ts`, `notification.controller.ts` | **Completed** |
| 7 | `migrate.ts` skips template migration | Rewrite with `DataSource` and `runMigrations({ transaction: 'all' })`; include all migrations | `migrate.ts` | **Completed** |
| 8 | Bulk send creates logs but no outbox events | Wrap each bulk log creation and outbox publish in a single transaction | `notification.service.ts` | **Completed** |
| 9 | `notification_status` enum missing `delivered` and `delivered_at` column missing | Add new migration to add enum value and column; update init migration for fresh installs | `migrations/*.ts` | **Completed** |
| 10 | `getNotification`/`listNotifications` tenant bypass | Add mandatory `tenantId` filter in service and controller | `notification.service.ts`, `notification.controller.ts` | **Completed** |

### P1 — High priority

| # | Finding | Planned Fix | File(s) | Status |
|---|---------|-------------|---------|--------|
| 11 | JWT only HS256 | Replace `JwtAuthGuard` with JWKS/RS256 + HS256 fallback (same pattern as `auth-service`) | `jwt-auth.guard.ts` | **Completed** |
| 12 | No async notification queue | De-couple log creation from provider calls; `sendNotification` returns immediately and schedules `processNotification` asynchronously; retry uses delay scheduling without blocking HTTP request | `notification.service.ts` | **Completed** |
| 13 | Templates not tenant-scoped | Add `tenantId` to `EmailTemplate`/`SmsTemplate` entities, migrations, lookups and seeders | `entities/*.ts`, `migrations/*.ts`, `notification.service.ts` | **Completed** |
| 14 | Providers not DI | Register SMS/email providers via Nest factory providers and inject into `NotificationService` | `app.module.ts`, `notification.service.ts` | **Completed** |
| 15 | No tests | Add unit/spec smoke tests for OTP flow, tenant isolation and callback auth | `*.spec.ts` | **Deferred** |

### P2 — Medium priority

| # | Finding | Planned Fix | File(s) | Status |
|---|---------|-------------|---------|--------|
| 16 | `main.ts` does not set `search_path` | Run `SET search_path` after app init | `main.ts` | **Completed** |
| 17 | `package.json` migrate script uses `src/migrate.ts` | Change to `dist/migrate.js` and add missing deps (`ioredis`, `jwks-rsa`, `uuid`, etc.) | `package.json` | **Completed** |
| 18 | Health controller only checks DB | Add Redis and Kafka health indicators | `health.controller.ts` | **Completed** |
| 19 | No `TRUTH.md` | Create/update `TRUTH.md` with corrected capability status | `TRUTH.md` | **Completed** |
| 20 | AWS SDK v2 in maintenance | Migrate SES provider to `@aws-sdk/client-ses` | `email-providers/aws-ses.provider.ts` | **Deferred** |

## Implementation Notes

- Redis connection is configured through `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` and falls back to `localhost:6379`.
- `NotificationService` no longer instantiates SMS/email providers directly; providers are bound in `AppModule` via factory providers and injected by token.
- `JwtAuthGuard` validates RS256 tokens via JWKS first, then falls back to local HS256.
- `CallbackAuthGuard` requires `X-API-Key` header equal to `NOTIFICATION_CALLBACK_API_KEY` and optionally verifies `X-Provider-Signature` with `NOTIFICATION_CALLBACK_HMAC_SECRET`.
- `TenantGuard` now throws `ForbiddenException` on mismatch or missing `tenantId` for non-system users.
- `NotificationController` routes derive `tenantId` from `req.tenantId`; `body.tenantId` is only validated, never trusted.
- OTP is generated server-side, stored in Redis (`otp:<tenantId>:<reference>`) with a 5-minute TTL, and verified through `POST /notifications/otp/verify`.
- Bulk notifications are wrapped in a TypeORM transaction, each insert publishes an outbox `NotificationCreated` event, and delivery is scheduled asynchronously.
- `retryNotification` uses exponential backoff (`delay = baseDelay * 2^retryCount`) and no longer blocks the HTTP request.
- `main.ts` calls `app.init()`, sets `search_path` to `<DB_SCHEMA>, public`, and starts the OutboxWorker only when Kafka is configured and `KAFKA_ENABLED` is not `false`.

## Build Verification

- `bun run build` (compiles `src/` to `dist/` using `tsc`) completed successfully with no TypeScript errors.
- `dist/migrate.js` is generated and ready for `bun run migrate` against a Postgres instance.
- `bun install` could not be completed because the environment has no network access to the registry; the existing `D:\CascadeProjects\old\insurance\node_modules` already contains the newly required packages (`ioredis`, `jwks-rsa`, `uuid`), so the local build still compiles.

