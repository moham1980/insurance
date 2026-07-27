# Rule-Engine-Service Remediation Progress

**Source audit:** `d:\CascadeProjects\old\insurance\doc\last audit\20-rule-engine-service-code-audit.md`  
**Service path:** `d:\CascadeProjects\old\insurance\services\rule-engine-service`  
**Build verification:** `npx tsc` completed successfully (exit code 0)

---

## Executive Summary

All **P0** blockers from the audit have been remediated. **P1** and selected **P2** findings have also been addressed. The service now compiles and the database migration matches the active entities.

| Category | Items | Status |
|---|---|---|
| P0 — Schema/entity conflicts | 2 | Fixed |
| P0 — Tenant isolation | 8 endpoints + service layer | Fixed |
| P0 — Controller trusts body/query `tenantId` | All endpoints | Fixed |
| P0 — Missing permission enforcement | All endpoints | Fixed |
| P0 — Weak authorization guards | AbacGuard removed, TenantGuard throws, JWT uses JWKS | Fixed |
| P1 — `call`/`emit` actions | Side-effects published to outbox | Fixed |
| P1 — Unsanitized regex | Sandboxed `safeRegexTest` with length/catastrophic-pattern checks | Fixed |
| P1 — RuleType evaluation semantics | CONDITION/VALIDATION stop after first match; CALCULATION chains; explicit `stopAfterFirstMatch` | Fixed |
| P1 — Health checks | DB + outbox + Kafka checks added | Fixed |
| P2 — `TRUTH.md` | Updated to match actual capabilities | Fixed |

---

## Detailed Changes

### 1. P0 — Schema and Entity Consolidation

- **Removed stale entity files** (and their compiled `dist` copies):
  - `src/entities/rule.entity.ts`
  - `src/entities/rule-set.entity.ts`
  - `src/entities/rule-audit.entity.ts`
  - `src/abac.guard.ts`
- **Updated migration `src/migrations/1700000001100-init.ts`** to match active entities:
  - Added to `rules`: `version`, `tags` (text array), `template_id`, `activated_at`, `deactivated_at`.
  - Added to `rule_executions`: `dry_run`, `execution_details`.
  - Created `rule_templates` table with `tenant_id`, `name`, `category`, `condition_template`, `action_template`, `variables`, `metadata`, `created_at`, `updated_at`.
  - Added `IF NOT EXISTS` guards so the migration is idempotent.
  - Added missing indexes including `idx_rules_tenant_rule_set_name` and `idx_rule_templates_tenant_category`.

### 2. P0 — Tenant Isolation

All single-resource lookups and mutations in `src/rule-engine.service.ts` now require and filter by `tenantId`:

- `getRule(tenantId, id)`
- `updateRule(tenantId, id, patch)`
- `deleteRule(tenantId, id)`
- `activateRule(tenantId, id)`
- `deactivateRule(tenantId, id)`
- `validateRule(tenantId, ruleId)`
- `getExecution(tenantId, id)`
- `createRuleFromTemplate(...)` now loads the template by `{ id, tenantId }`.

### 3. P0 — Controller No Longer Trusts `tenantId` from Body/Query

`src/rule-engine.controller.ts` was rewritten:

- Every endpoint now accepts `@Req() req` and derives `tenantId` exclusively from `req.user.tenantId` via `tenantIdFrom(req)`.
- `tenantId` was removed from all request DTOs.
- The fallback `query.tenantId` has been eliminated.

### 4. P0 — Permission Enforcement

- `@RequirePermissions(...)` added to every endpoint in `src/rule-engine.controller.ts` with the appropriate permission keys.
- `PermissionsGuard` already enforces required permissions and falls back to role-based permissions from `src/permissions.ts`.
- `AbacGuard` removed from module and file system.
- `TenantGuard` now throws `UnauthorizedException` when tenant is missing or when `x-tenant-id` header mismatches the JWT tenant.
- `JwtAuthGuard` replaced with JWKS-based RS256 validation plus HS256 fallback (`src/jwt-auth.guard.ts`).

### 5. P1 — Real `call`/`emit` Actions

`src/rule-engine.service.ts`:

- `applyAction` now accumulates side effects in a `sideEffects` array.
- `call` and `emit` actions push outbox events.
- Inside the `evaluateRules` transaction, after saving the execution, each side effect is published via `OutboxPublisher` to the outbox table.
- Input/output objects are deep-cloned before evaluation (`deepClone`) to avoid mutating external references.

### 6. P1 — Regex Sandboxing

`src/rule-engine.service.ts`:

- Added `safeRegexTest(pattern, value)` helper.
- Enforces max pattern length (200 chars).
- Rejects patterns with nested quantifier combinations typical of ReDoS.
- Wraps `new RegExp` in try/catch and surfaces a clear error for invalid patterns.
- Used in both the `matches` operator and the `matches()` function.

### 7. P1 — RuleType Evaluation Semantics

`src/rule-engine.service.ts`:

- `CONDITION` and `VALIDATION` rules stop after the first match.
- `CALCULATION` rules continue to chain by default.
- Any action can set `stopAfterFirstMatch: true` to override and stop.
- Added `stopAfterFirstMatch?: boolean` to the `Rule` entity `action` type in `src/entities/Rule.ts`.

### 8. P1 — Health Checks

`src/health.controller.ts`:

- Keeps existing database `SELECT 1` check.
- Added outbox check: counts `pending` and `failed` outbox events in the last 5 minutes.
- Added Kafka check: connects an admin client to `KAFKA_BROKERS` (if configured) and lists topics.
- Returns `ok`, `degraded`, or `error` with per-check details.

### 9. P2 — Truth Registry

`TRUTH.md` updated to accurately reflect implemented capabilities and explicitly note that `publishRuleSet` / `getMetrics` with hit/miss timing do not exist.

### 10. Dependencies

`package.json` updated:

- Added `jwks-rsa` for JWKS validation.
- Added `reflect-metadata` and `rxjs` (NestJS runtime peers).
- Added `@types/jsonwebtoken` for TypeScript type support.

---

## Remaining Gaps / Future Work

- **Unit/integration tests:** No `*.test.ts`/`*.spec.ts` files exist yet. Tests should be added to cover rule parsing, tenant isolation, permission enforcement, and evaluation edge cases.
- **Action `call` HTTP invocation:** Current implementation publishes `call` actions to the outbox as events. A future enhancement could wire a service-client registry to make synchronous HTTP/gRPC calls when `call` is used in a blocking context.
- **ReDoS full mitigation:** The regex helper uses length limits and pattern heuristics. For full protection in production, consider integrating a RE2-based engine or a dedicated regex sandbox.

---

## Verification

Run the following to verify the service compiles cleanly:

```powershell
cd d:\CascadeProjects\old\insurance\services\rule-engine-service
npx tsc
```

Run the migration against a PostgreSQL instance:

```powershell
$env:DB_HOST="localhost"; $env:DB_PORT="5432"; $env:DB_USER="postgres"; $env:DB_PASSWORD="postgres"; $env:DB_NAME="postgres"; $env:DB_SCHEMA="rule_engine"
npx tsc
node dist/migrate.js
```

Run the service:

```powershell
node dist/main.js
```

---

## Files Changed

- `src/migrations/1700000001100-init.ts`
- `src/entities/Rule.ts`
- `src/rule-engine.service.ts`
- `src/rule-engine.controller.ts`
- `src/jwt-auth.guard.ts`
- `src/tenant.guard.ts`
- `src/health.controller.ts`
- `src/app.module.ts`
- `package.json`
- `TRUTH.md`
- **Deleted:** `src/entities/rule.entity.ts`, `src/entities/rule-set.entity.ts`, `src/entities/rule-audit.entity.ts`, `src/abac.guard.ts` and their `dist/` counterparts
- **Added:** `REMEDIATION_PROGRESS.md`
