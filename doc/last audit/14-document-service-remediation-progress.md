# Document-Service Remediation Progress

## 1. Executive Summary

This report records the remediation progress for `document-service` against the findings in `14-document-service-code-audit.md` and the plan in `14-document-service-remediation-plan.md`.

- **Verification status:** TypeScript compilation passes (`npx tsc --noEmit` → exit code 0).
- **Unit-test status:** 9/9 service unit tests pass (`npx jest --config jest.config.unit.cjs`).
- **Remaining hard dependency:** a live PostgreSQL instance and a Kafka broker are required for runtime startup; remediation does not include manual DB patches.

## 2. P0 Blockers — Completed

| Finding | Remediation | Files | Status |
|---------|-------------|-------|--------|
| Empty migration; no `documents` table | Replaced `1700000000200-init.ts` with a real migration creating `documents`, `outbox_events`, `consumed_events`, `dead_letter_queue` with indexes and `updated_at` trigger. | `src/migrations/1700000000200-init.ts` | Done |
| No `tenantId` in `Document` entity | Added `tenantId` column, indexes, composite index on `tenantId`/`status`, `@CreateDateColumn` / `@UpdateDateColumn` decorators. | `src/entities/Document.ts` | Done |
| No tenant isolation in service | All CRUD and query methods now require `tenantId` and filter by it. | `src/documents.service.ts` | Done |
| No tenant isolation in controller | Controller extracts `tenantId` from JWT/header, passes to service, rejects mismatches. | `src/documents.controller.ts` | Done |
| Local disk storage not tenant-isolated | Files stored under `tenants/{tenantId}/{timestamp}-{uuid}-{safeName}`; storageRef is relative; object-storage URLs allowed. | `src/documents.service.ts` | Done |
| `AbacGuard` overrides RBAC | Removed `AbacGuard` from `AppModule` and all routes; only `JwtAuthGuard`, `PermissionsGuard`, `TenantGuard` remain. | `src/app.module.ts`, `src/documents.controller.ts`, `src/abac.guard.ts` | Done |
| `TenantGuard` returns `false` | Now throws `ForbiddenException` with explicit codes (`TENANT_ID_REQUIRED`, `TENANT_MISMATCH`). | `src/tenant.guard.ts` | Done |
| No signed URLs / truth mismatch | Implemented HMAC-signed download tokens (`/documents/:id/download?token=...`) and added `validateDocument` / `classifyDocument` endpoints. Updated `TRUTH.md`. | `src/documents.service.ts`, `src/documents.controller.ts`, `TRUTH.md` | Done |
| `documentType` not whitelisted | `DOCUMENT_TYPES` union enforced in service; controller validates enum. | `src/documents.service.ts`, `src/documents.controller.ts` | Done |
| `main.ts` does not set `search_path` | `bootstrap` sets `SET search_path TO ${schema}, public` before starting OutboxWorker. | `src/main.ts` | Done |

## 3. P1 Gaps — Completed

| Finding | Remediation | Files | Status |
|---------|-------------|-------|--------|
| JWT only HS256 | `JwtAuthGuard` now supports JWKS/RS256 with fallback to HS256. `jwks-rsa` added to dependencies. | `src/jwt-auth.guard.ts`, `package.json` | Done |
| No encryption at rest | Added optional AES-256-GCM encryption when `DOCUMENT_ENCRYPT_AT_REST=true` and `DOCUMENT_ENCRYPTION_KEY` is set. | `src/documents.service.ts` | Done |
| Extraction status never progresses | Added `startExtraction`, `processExtraction`, `validateDocument`, `classifyDocument`; transitions `pending` → `extracting` → `extracted`/`failed`; calls `OCR_ENGINE_URL` / `DOCUMENT_AI_SERVICE_URL` when configured. | `src/documents.service.ts`, `src/documents.controller.ts` | Done |
| `updated_at` not auto-updated | `@UpdateDateColumn` used in entity; migration creates trigger. | `src/entities/Document.ts`, `src/migrations/1700000000200-init.ts` | Done |
| Kafka consumer idempotency not transactional | Refactored consumer to use `consumeOnce` from `@insurance/shared`. | `src/document-claim-events.consumer.ts` | Done |
| `handleClaimClosed` no tenant filter | Now extracts `tenantId` from event envelope and filters query by `claimId` + `tenantId`. | `src/document-claim-events.consumer.ts` | Done |
| No tests | Added `jest.config.unit.cjs` and `src/documents.service.spec.ts` covering tenant isolation, signed URLs, file-name sanitization, cross-tenant storage validation. | `jest.config.unit.cjs`, `src/documents.service.spec.ts` | Done |

## 4. P2 Gaps — Completed

| Finding | Remediation | Files | Status |
|---------|-------------|-------|--------|
| `listDocuments` uses snake_case aliases | Query builder now uses camelCase property aliases and `getManyAndCount`. | `src/documents.service.ts` | Done |
| Health controller only checks DB | Extended health checks to include storage R/W and Kafka broker reachability. | `src/health.controller.ts` | Done |
| Audit logger PII verification | Service no longer logs raw bytes or absolute filesystem paths; audit logs record document IDs, tenant IDs, correlation IDs, and action types only. | `src/audit.logger.ts`, `src/documents.service.ts` | Done |
| Runtime config gaps | Created `services/document-service/.env.template` documenting all required and optional environment variables. | `.env.template` | Done |

## 5. Additional Fixes (Discovered During Verification)

- **`safeFileName` path-traversal hardening** (`src/documents.service.ts`):
  - Replaces sequences of two or more dots (`..`) and leading/trailing dots to prevent filename-based traversal.
- **Signed-token signature length guard** (`src/documents.service.ts`):
  - `verifySignedUrl` now rejects tokens whose signature length differs from the expected HMAC before calling `crypto.timingSafeEqual`, avoiding an internal `Input buffers must have the same byte length` error.
- **`tsconfig` include expansion** (`tsconfig.json`):
  - Changed from a hard-coded file list to `src/**/*.ts` so new source and test files are compiled.

## 6. Verification Evidence

### 6.1 TypeScript compilation

```powershell
npx tsc --noEmit
# exit code: 0
```

### 6.2 Unit tests

```powershell
npx jest --config jest.config.unit.cjs --runInBand
```

Output:

```
PASS src/documents.service.spec.ts
  DocumentsService
    prepareUpload
      ✓ returns a tenant-prefixed relative storageRef and a temp path
      ✓ sanitises unsafe characters in file names
    createFromUpload
      ✓ stores tenantId and a relative storageRef (not an absolute filesystem path)
      ✓ rejects unsupported document types
    getDocument
      ✓ queries by tenantId and documentId
    signed URLs
      ✓ generates and verifies a signed URL token
      ✓ rejects a tampered token
    validateStorageRef
      ✓ throws for a cross-tenant storageRef
      ✓ allows object storage URLs

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
```

## 7. Remaining Gaps (post-remediation)

These are not P0/P1 blockers for code correctness, but runtime integrations that still need a live environment or external service.

| Gap | Reason | Next Step |
|-----|--------|-----------|
| Live virus scanning | No ClamAV / cloud scanner endpoint configured. | Add a `DocumentScanService` implementation and set `DOCUMENT_SCAN_ENABLED` + endpoint env vars once infra is ready. |
| Live OCR / document AI | `processExtraction` calls `OCR_ENGINE_URL`; requires a running extraction service (e.g., tesseract/ML API). | Deploy/configure `document-ai-service` and set `OCR_ENGINE_URL`. |
| Object storage migration | Current implementation supports tenant-prefixed local disk and object-storage URLs; production should use S3/MinIO with signed object URLs. | Add `S3StorageProvider` behind the storage interface and configure bucket credentials. |
| Integration / E2E tests | Unit tests cover core logic; runtime needs PostgreSQL + Kafka. | Add integration tests with a real DB and Kafka once local infra is provisioned. |
| Migration dry-run | Migration script is code-complete; must be run against a clean PostgreSQL instance to confirm. | Execute `bun run build && bun run migrate` against a fresh database. |

## 8. Conclusion

All P0, P1, and P2 audit findings for `document-service` have been addressed in code. The service now:

- Has real database migrations with tenant-scoped tables and outbox/DLQ support.
- Enforces tenant isolation at entity, service, controller, guard, and event-consumer levels.
- Uses signed URLs for document downloads and supports optional encryption at rest.
- Supports JWKS/RS256 JWT validation with HS256 fallback.
- Provides document validation, classification, and extraction workflow integration points.
- Uses transactional idempotency for Kafka claim-event consumption.
- Has passing unit tests and successful TypeScript compilation.

The remediation is **code-complete**. The next step is runtime validation against a PostgreSQL + Kafka environment and adding the optional external scanners/storage providers once infrastructure is available.
