# API Gateway Audit Remediation Progress Report

This document tracks the remediation work performed against the `02-api-gateway.md` audit findings for the `api-gateway` service.

## Audit Scope

- **Audit report:** `doc/last audit/02-api-gateway.md`
- **Service:** `services/api-gateway`
- **Started:** Current session
- **Status:** Core audit fixes complete, TypeScript build passing, e2e/resilience tests and smoke scripts added, awaiting full runtime verification

## Remediation Items

### 1. Centralized gateway configuration and route registry

- **File:** `src/gateway.config.ts`
- **Actions:**
  - Defined `SERVICE_ROUTES` with upstream env var, default URL, required flag, and human-readable name.
  - Added missing conditional routes (`/customer-360`, `/outbox`, `/ai-governance`) with default URLs.
  - Reconciled all default service URLs to the `18000` port range to match `docker-compose.yml` and `TRUTH.md`.
  - Added `PUBLIC_ROUTES` allow-list using exact method + path matching (query-string ignored).
  - Fixed public route allow-list to cover federation provider callbacks (`/auth/federation/:provider/callback`) and the service-token endpoint (`/auth/service-token`).
  - Centralized JWT policy: issuer, audience, JWKS URI, allowed algorithms (`RS256`, `HS256`).
  - Added tenant policy env toggles (`REQUIRE_EXPLICIT_TENANT`) and CORS allow-list (`CORS_ORIGINS`).
  - Added admin role/permission constants (`ADMIN_ROLE`, `ADMIN_PERMISSION`).
  - Exported helpers: `isPublicRoute`, `resolveTarget`, `validateRequiredRoutes`, `normalizeUrl`.

### 2. Robust JWT/JWKS verification

- **File:** `src/jwt-verifier.ts` (new)
- **Actions:**
  - Created `JwtVerifier` supporting RS256 via JWKS and HS256 via `JWT_SECRET`.
  - Enforces algorithm selection from the token header, never from claims.
  - Validates issuer and audience for every token.
  - Caches and rate-limits JWKS key retrieval.
  - Returns structured `VerifiedToken` or `JwtVerificationError`.

### 3. Admin authentication guard

- **File:** `src/admin.guard.ts` (new)
- **Actions:**
  - Implemented `AdminGuard` checking `req.user` populated by `jwtVerifier`.
  - Requires either `ADMIN_ROLE` in `roles` or `ADMIN_PERMISSION` in `permissions`/`scopes`.
  - Throws `UnauthorizedException` or `ForbiddenException` with gateway-standard error payload.

### 4. `main.ts` refactoring

- **File:** `src/main.ts`
- **Actions:**
  - Removed direct `jsonwebtoken` usage in favor of `jwt-verifier`.
  - Integrated `gateway.config` route registry and public route matching.
  - Implemented tenant policy:
    - Public routes may allow anonymous tenant selection.
    - `REQUIRE_EXPLICIT_TENANT` disables default tenant fallback for protected routes.
    - JWT `tenantId` is authoritative; inbound `x-tenant-id` is treated as a hint.
    - Added `TENANT_MISMATCH` and `TENANT_MISSING_FROM_TOKEN` guards.
  - Added CORS allow-list with origin validation; credentials enabled only for allowed origins.
  - Improved rate limiting: identity key combines verified tenant + client IP, and expired entries are cleaned up.
  - Enhanced circuit breaker:
    - HTTP failures are classified explicitly (5xx/429 vs. client errors).
    - `requestNoProxy` retries idempotent requests (`GET`, `HEAD`, idempotency key).
    - Per-route and global upstream timeout env vars.
  - Canonicalized outgoing headers: lower-cased, removed hop-by-hop/governance headers, re-injected verified `x-tenant-id`, `x-user-id`, `x-correlation-id`, `x-ai-enabled`, `traceparent`, and preserved `authorization`.
  - Added upstream health checks with overlap protection, unknown-state handling, and recovery threshold.
  - Added required-route validation with `GATEWAY_STRICT_STARTUP` option to fail startup.
  - Improved JSON parsing of upstream responses with structured `INVALID_UPSTREAM_RESPONSE` errors.

### 5. Health controller improvements

- **File:** `src/health.controller.ts`
- **Actions:**
  - Replaced superficial Kafka check with a real TCP connectivity probe to each `KAFKA_BROKERS` host.
  - Deep health now uses the shared `SERVICE_ROUTES` registry via `resolveTarget`.
  - Each upstream health check is isolated; one failure no longer breaks the loop.
  - Added `/gateway/health` and `/gateway/health/deep` route aliases to match the public route registry.
  - Protected `/admin/circuit-breakers` and `/admin/circuit-breakers/:serviceName/reset` with `@UseGuards(AdminGuard)`.
  - Sanitized dependency error messages in deep health to avoid topology leakage.

### 6. Distributed rate limiting and circuit breaker

- **File:** `src/main.ts`
- **Actions:**
  - Implemented `checkRateLimit` with Redis-backed sliding window using sorted sets and TTL.
  - Falls back to an in-memory store with periodic cleanup if Redis is unavailable.
  - Rate-limit identity combines verified `tenantId` + `userId` (or client IP for anonymous requests) so spoofing `x-tenant-id` does not bypass quota.
  - Unified custom rate limiter with the `@fastify/rate-limit` plugin.
  - Circuit breaker state externalized to Redis (`gw:cb:<service>`) with `hmset`/`hgetall` and TTL.
  - Circuit breaker now classifies HTTP 5xx/429 as failures, explicitly skips 4xx client errors, and supports half-open recovery.

### 7. Proxy policy and security hardening

- **File:** `src/main.ts`
- **Actions:**
  - Configured Fastify body parser limit to enforce payload size for chunked/decompressed requests.
  - Added raw-buffer content-type parsers for `multipart/form-data` and `application/octet-stream`.
  - Implemented transparent proxying for cookies (`set-cookie` arrays preserved), redirects, and binary/multipart uploads.
  - Canonicalized outgoing headers: lower-cased, hop-by-hop/governance headers removed, verified propagation headers re-injected, original `authorization` preserved.
  - Added `SENSITIVE_HEADERS` redaction in upstream error logs.

### 8. Dependency and TypeScript configuration updates

- **Files:** `package.json` (api-gateway), `tsconfig.json`
- **Actions:**
  - Added `jwks-rsa: ^3.1.0` for JWKS key retrieval.
  - Updated `tsconfig.json` include to `src/**/*.ts` so new files are compiled.

### 9. Build verification

- **Command:** `bun run build`
- **Result:** `tsc` completed with no errors.
- **Notes:** Two compile-time issues were fixed during the build:
  - `jwt.verify` `algorithms` array typed as `jwt.Algorithm`.
  - `logger.error` call passed context correctly (third argument) instead of an object in the `error` position.

## Remaining / Follow-up Work

- **Runtime verification:** E2E and resilience tests have been created but require the API Gateway and upstream services to be running. Execute `bun run test:e2e -- tests/e2e/api-gateway-flow.test.ts` and `bun run test:resilience -- tests/resilience/api-gateway-resilience.test.ts` once the stack is up.
- **CI smoke test environment:** The `test:smoke` script has been added and is invoked in `deploy-production`, but the GitHub Actions runner must have Bun available (or `node_modules` present) for `bun run scripts/smoke-tests.ts` to execute.
- **API contract tests:** Existing contract tests under `tests/contract` should be re-run to ensure proxy/header behavior remains correct.
- **Helmet/CORS runtime validation:** Real browser/client CORS scenarios should be validated in a deployed environment.

## Files Changed

- `src/gateway.config.ts` (new)
- `src/jwt-verifier.ts` (new)
- `src/admin.guard.ts` (new)
- `src/main.ts` (major refactor)
- `src/health.controller.ts` (major refactor)
- `src/app.module.ts` (AdminGuard provider registration)
- `package.json` (added `jwks-rsa`)
- `tsconfig.json` (include glob)
- `tests/e2e/api-gateway-flow.test.ts` (new)
- `tests/resilience/api-gateway-resilience.test.ts` (new)
- `tests/helpers/jwt-factory.ts` (issuer/audience support + gateway admin token)
- `scripts/smoke-tests.ts` (new)
- `package.json` (root, `test:smoke` / `smoke:local` scripts)
- `.env.example` / `.env.template` (reconciled URLs and gateway infra vars)
- `TRUTH.md` (reconciled route map and audit-fix status)
- `AUDIT_FIXES_PROGRESS.md` (this report)

## Verification Commands

```powershell
cd services/api-gateway
bun run build
```

Expected output: `$ tsc` with exit code `0`.

```powershell
# Local smoke tests (requires services on 18000+)
bun run test:smoke
```

```powershell
# E2E / resilience subsets
bun run test:e2e -- tests/e2e/api-gateway-flow.test.ts
bun run test:resilience -- tests/resilience/api-gateway-resilience.test.ts
```
