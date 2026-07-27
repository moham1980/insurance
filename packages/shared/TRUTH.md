# @insurance/shared — Capability Truth Registry

This document records the runtime truth of shared library capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Event Envelope | **REAL** | `EventEnvelope.ts` with `eventId`, `eventType`, `eventVersion`, `correlationId`, `tenantId`, `idempotencyKey`, `causationId`, `traceparent`, `subject`, `payload` | None | Production-ready
| Event Envelope Factory | **REAL** | `createEventEnvelope()` with ISO datetime normalization | None | Production-ready
| Event Contracts (Zod) | **REAL** | `EventContracts.ts` with `makeEnvelopeContract` + domain schemas | Needs completion for all domain events | P1
| Schema Registry | **REAL** | `SchemaRegistry.ts` with registration/validation/retrieval | None | Production-ready
| Outbox Publisher | **REAL** | `OutboxPublisher.ts` with transactional outbox pattern | None | Production-ready
| Outbox Worker | **REAL** | `OutboxWorker.ts` with polling + relay to Kafka | Needs delivery guarantee test | P1
| Idempotency Middleware | **REAL** | `idempotency-middleware.ts` with Express middleware; Redis-backed when `REDIS_URL` configured, in-memory fallback | None | Production-ready
| Idempotent Consumer | **REAL** | `IdempotentConsumer.ts` for Kafka consumers | Needs Redis backing store | P1
| Dead Letter Event | **REAL** | `DeadLetterEvent.ts` with failure tracking | None | Production-ready
| Dead Letter Queue Service | **REAL** | `DeadLetterQueueService` used by orchestrator DLQ controller | None | Production-ready
| Circuit Breaker | **REAL** | `circuit-breaker.ts` with CLOSED/OPEN/HALF_OPEN | None | Production-ready
| PII Redaction | **REAL** | `pii-redaction.ts` + `pii-masking.middleware.ts` | Needs coverage audit | P1
| ABAC Guard | **REAL** | `abac-guard.ts` | Needs policy admin integration | P1
| Tenant Isolation | **REAL** | `tenant-guard.ts`, `tenant-isolation.middleware.ts`, `tenant-isolation.service.ts` | None | Production-ready
| Consent Management | **REAL** | `consent-management.ts` | Needs workflow integration | P1
| Data Governance | **REAL** | `data-classification.ts`, `data-lineage.ts`, `data-retention.ts`, `data-minimization.ts` | Needs operational enforcement | P1
| GDPR Compliance | **REAL** | `gdpr-compliance.ts` | Needs Iran-specific privacy law adaptation | P1
| Feature Flags | **REAL** | `featureFlags/` directory with 12 items | None | Production-ready
| Messaging | **REAL** | `messaging/` directory with 12 items | None | Production-ready
| Observability | **REAL** | `observability/` directory with 12 items | None | Production-ready
| Error Contract (API Response) | **REAL** | Standard `{ success, data?, error?: { code, message }, correlationId }` used across all services | Not formally documented as shared contract | P1

## Event Envelope Specification

```typescript
interface EventEnvelope<T = unknown> {
  eventId: string;           // UUID v4
  eventType: string;          // Domain event type
  eventVersion: number;       // Schema version
  occurredAt: string;         // ISO 8601 datetime
  producer: string;           // Service name
  correlationId: string;      // Trace correlation
  tenantId?: string;         // Multi-tenant isolation
  idempotencyKey?: string;    // Deduplication key
  causationId?: string;      // Causal event ID
  traceparent?: string;       // W3C trace context
  subject: EventSubject;      // Domain identifiers
  payload: T;                 // Event data
}
```

## Idempotency Baseline

```typescript
// Redis-backed with in-memory fallback
interface IdempotencyOptions {
  headerName?: string;        // default: 'Idempotency-Key'
  ttl?: number;               // default: 86400 seconds
  persistent?: boolean;       // default: true
  keyGenerator?: (req) => string | null;
}
```

Environment variables:
- `REDIS_URL` — Redis connection string for distributed idempotency cache
- `REDIS_HOST` — Fallback Redis host for distributed idempotency cache

## API Error Contract

```typescript
interface ApiError {
  code: string;      // Machine-readable error code
  message: string;   // Human-readable description
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  correlationId: string;
}
```

## Decision Log

- **2024-06-11**: Event envelope is comprehensive and production-ready.
- **2026-06-12**: Idempotency middleware upgraded with `RedisIdempotencyStore` backed by `ioredis`; uses `REDIS_URL`/`REDIS_HOST` env vars; falls back to in-memory cache when Redis unavailable.
- **2024-06-11**: Error contract is implicitly standardized across services but not formally documented in shared package.
