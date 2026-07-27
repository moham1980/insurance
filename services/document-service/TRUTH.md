# Document Service — Capability Truth Registry

This document records the runtime truth of document management capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Document Upload | **REAL** | Tenant-scoped file upload with type/size validation, tenant-prefixed storage, optional AES-256-GCM encryption at rest | Virus scanning not yet wired to a live scanner; only file-type validation today | Production-ready
| Document Retrieval | **REAL** | `getDocument` returns metadata with signed HMAC download URL; `/documents/:id/download?token=...` verifies expiry and signature | None | Production-ready
| Document Validation | **REAL** | `validateDocument` checks MIME allow-list, file existence and size integrity | None | Production-ready
| Document Classification | **REAL** | `classifyDocument` maps mime/document type with confidence score | ML-based classification not implemented; heuristic only | Production-ready
| OCR / Extraction | **REAL** | `startExtraction` transitions `pending` → `extracting` and calls configured `OCR_ENGINE_URL`; falls back to `failed` when not configured | Real OCR engine (tesseract/ML) must be configured via `OCR_ENGINE_URL` | Production-ready
| Tenant Isolation | **REAL** | `tenantId` column on every document; all queries filtered by tenant; `TenantGuard` rejects mismatches | None | Production-ready
| Authentication | **REAL** | `JwtAuthGuard` supports JWKS/RS256 with HS256 fallback | None | Production-ready
| Authorization | **REAL** | `PermissionsGuard` + `RequirePermissions` enforced; permissive `AbacGuard` removed | None | Production-ready
| Outbox Integration | **REAL** | `OutboxPublisher` publishes document events within transactions | None | Production-ready
| Idempotent Event Consumption | **REAL** | `consumeOnce` transactional idempotency for `insurance.claim.*` events with tenant-scoped handling | None | Production-ready
