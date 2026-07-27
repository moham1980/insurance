# Document-Service Remediation Plan

Generated from `14-document-service-code-audit.md`.

## P0 — Production blockers (must fix before any real deployment)

| # | Finding | Files to change | Remediation |
|---|---------|----------------|-------------|
| P0-1 | Empty migration `1700000000200-init.ts`; `documents` table not created | `src/migrations/1700000000200-init.ts` (replace) | Write a real TypeORM migration that creates `documents` with all columns, indexes and `updated_at` trigger. |
| P0-2 | `Document` entity has no `tenantId` | `src/entities/Document.ts` | Add `tenantId` column + index; update all service methods. |
| P0-3 | No tenant isolation in `documents.service.ts` | `src/documents.service.ts` | Add `tenantId` to create/read/update methods; enforce tenant in `getDocument`, `listDocuments`, `getReconciliationArtifacts`, `handleClaimClosed`. |
| P0-4 | No tenant isolation in `documents.controller.ts` | `src/documents.controller.ts` | Pass `tenantId` from JWT to service; reject cross-tenant access. |
| P0-5 | Local disk storage not tenant-isolated, raw `storageRef` returned | `src/documents.controller.ts`, `src/documents.service.ts` | Use tenant-prefixed local path; never return filesystem paths; provide signed download endpoint. |
| P0-6 | `AbacGuard` overrides RBAC | `src/abac.guard.ts`, `src/documents.controller.ts` | Remove `AbacGuard` from all routes; `PermissionsGuard` + `RequirePermissions` is sufficient. Delete or harden `AbacGuard`. |
| P0-7 | `TenantGuard` returns `false` | `src/tenant.guard.ts` | Throw `ForbiddenException`; require `tenantId` for non-system users. |
| P0-8 | No signed URLs / truth mismatch | `TRUTH.md`, `src/documents.controller.ts`, `src/documents.service.ts` | Implement signed token download (`/documents/:documentId/download?token=...`); add `/documents/:documentId/validate` and `/documents/:documentId/classify`. |
| P0-9 | `documentType` not whitelisted | `src/documents.controller.ts` | Validate against `Document.documentType` union; reject unknown types. |
| P0-10 | `main.ts` does not set `search_path` | `src/main.ts` | Set `search_path` to configured schema. |

## P1 — High priority

| # | Finding | Files to change | Remediation |
|---|---------|----------------|-------------|
| P1-1 | JWT only HS256 | `src/jwt-auth.guard.ts`, `package.json` | Add JWKS/RS256 support with fallback to HS256 (use `jwks-rsa` and `EcosystemJwtPayload` style). |
| P1-2 | No virus scanning placeholder | `src/documents.controller.ts` | Add `ClamAV`/`DocumentScanService` interface; fail upload when `DOCUMENT_SCAN_ENABLED=true` and scanner unavailable; record scan result. |
| P1-3 | No encryption at rest | `src/documents.controller.ts`, `src/documents.service.ts` | Add optional AES-256-GCM encryption for sensitive files when `DOCUMENT_ENCRYPT_AT_REST=true` and `DOCUMENT_ENCRYPTION_KEY` set; otherwise store tenant-prefixed. |
| P1-4 | Extraction status never progresses | `src/documents.service.ts`, new `src/document-extraction.service.ts`, `src/app.module.ts` | After upload/claim events, schedule document extraction job; set `extracting`/`extracted`/`failed`; call `document-ai-service` if configured. |
| P1-5 | `updated_at` not auto-updated | `src/entities/Document.ts`, migration | Use `@UpdateDateColumn` and migration `ON UPDATE` trigger or `DEFAULT NOW()`. |
| P1-6 | Kafka consumer idempotency not transactional | `src/document-claim-events.consumer.ts` | Replace manual `consumedRepo.save` with `consumeOnce` from `@insurance/shared`; add tenant filter. |
| P1-7 | `handleClaimClosed` no tenant filter | `src/document-claim-events.consumer.ts` | Use `tenantId` from event envelope; require it; log skip if missing. |
| P1-8 | No tests | `src/**/*.spec.ts` | Add service/controller unit tests and health/integration tests. |

## P2 — Medium priority

| # | Finding | Files to change | Remediation |
|---|---------|----------------|-------------|
| P2-1 | `listDocuments` uses snake_case aliases | `src/documents.service.ts` | Use camelCase property names (`d.claimId`) or `getManyAndCount` with proper TypeORM aliases. |
| P2-2 | Health controller only checks DB | `src/health.controller.ts` | Add storage and Kafka checks. |
| P2-3 | Audit logger PII verification | `src/audit.logger.ts` | Ensure no raw file bytes, no storage paths, no PII in logs. |
| P2-4 | Runtime config gaps | `.env.template` | Document JWKS, storage, virus scan, encryption env vars. |

## Execution order

1. Migrations + entity (`P0-1`, `P0-2`, `P1-5`).
2. Service layer tenant scoping (`P0-3`).
3. Guards (`P0-6`, `P0-7`, `P1-1`).
4. Controller upload / signed URLs / validation (`P0-4`, `P0-5`, `P0-8`, `P0-9`, `P1-2`, `P1-3`).
5. Consumer transactional idempotency + tenant (`P1-6`, `P1-7`).
6. Extraction workflow (`P1-4`).
7. Tests + health + `search_path` (`P2-2`, `P2-3`, `P0-10`).
8. Progress report update.
