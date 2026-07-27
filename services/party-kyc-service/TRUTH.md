# Party KYC Service — Capability Truth Registry

This document records the runtime truth of party KYC capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Party Creation | **REAL** | `createParty` with AES-256-GCM encrypted PII, blind-indexed `nationalId`, tenant isolation, duplicate detection | None | Production-ready
| KYC Review Workflow | **REAL** | State machine with allowed transitions and `@VersionColumn` optimistic locking | None | Production-ready
| Identity Proofing | **REAL** | `performIdentityProofing` calls `IDENTITY_VERIFICATION_URL` with retries, timeout and idempotency key | Needs real identity verification endpoint | P0
| External Verification | **REAL** | `requestExternalVerification` calls `EXTERNAL_SCREENING_URL`; resilient with retries/idempotency | Needs real external screening endpoint | P0
| Document Trust Chain | **REAL** | `addToDocumentTrustChain` in transaction with pessimistic lock and hash chain | None | Production-ready
| AML Consent Management | **REAL** | `grantAmlConsent`/`revokeAmlConsent` write immutable `ConsentRecord` lineage and publish outbox events | None | Production-ready
| Exception Queue | **REAL** | `raiseKycException` with severity, assignment and tenant-scoped queries | None | Production-ready
| SLA Compliance | **REAL** | `checkSlaCompliance` and `getOverdueReviews` use 7 business-day calendar (configurable weekends/holidays) | Needs Persian holiday list | P2
| PII Masking | **REAL** | `PiiMaskingInterceptor` masks nationalId/mobile/email/iban for Fastify responses | None | Production-ready
| Tenant Isolation | **REAL** | All entities have `tenantId`; `TenantGuard` and `AbacGuard` fail-closed; all queries filtered | None | Production-ready
| Transactional Outbox | **REAL** | Mutations publish `insurance.party.*` events inside DB transactions | None | Production-ready

## Environment Variable Requirements

```bash
# Required — startup fails if missing or invalid
FIELD_ENCRYPTION_KEY=                # 32-byte key for AES-256-GCM PII encryption
FIELD_BLIND_INDEX_KEY=               # Optional; derived from FIELD_ENCRYPTION_KEY if not set

# Required for identity/screening flows
IDENTITY_VERIFICATION_URL=           # Face/liveness/document verification endpoint
EXTERNAL_SCREENING_URL=              # Sanctions/PEP/adverse media screening endpoint
MODEL_SWITCHBOARD_URL=               # Fallback for identity verification via model-switchboard-service

# Optional SLA configuration
SLA_WEEKEND_DAYS=                    # Comma-separated JS day numbers, default 0,6
SLA_HOLIDAYS=                        # Comma-separated ISO holiday dates (YYYY-MM-DD)
```

## Decision Log

- **2026-06-11**: Replaced random-based identity proofing with real HTTP call to identity verification service.
- **2026-06-11**: Replaced simulated external verification with real synchronous HTTP call to external screening service.
- **2026-07-26**: Replaced AES-256-CBC with default key by AES-256-GCM AEAD with strict 32-byte `FIELD_ENCRYPTION_KEY`.
- **2026-07-26**: Added deterministic HMAC-SHA256 blind index for `nationalId` duplicate detection and tenant-scoped search.
- **2026-07-26**: Added `tenantId` to all domain entities and enforced tenant filtering in every repository query.
- **2026-07-26**: Implemented KYC state machine, optimistic locking, transactional outbox, and fail-closed `TenantGuard`/`AbacGuard`.
- **2026-07-26**: Replaced Express `PiiMaskingMiddleware` with NestJS `PiiMaskingInterceptor` compatible with Fastify.
- **2026-07-26**: Added `ConsentRecord` entity for immutable AML consent lineage with `previousRecordId` versioning.
- **2026-07-26**: Added resilient fetch helper with retries, timeout, and idempotency for identity/screening providers.
- **2026-07-26**: Switched SLA calculations to business-day calendar with configurable weekends and holidays.

