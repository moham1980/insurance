# @insurance/shared — Capability Truth Registry

This document records the runtime truth of shared library capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Event Envelope | **REAL** | `EventEnvelope.ts` with `eventId`, `eventType`, `eventVersion`, `correlationId`, `tenantId`, `idempotencyKey`, `causationId`, `traceparent`, `subject`, `payload` | None | Production-ready
| Event Envelope Factory | **REAL** | `createEventEnvelope()` with ISO datetime normalization | None | Production-ready
| Event Contracts (Zod) | **REAL** | `EventContracts.ts` with `makeEnvelopeContract` + domain schemas | Needs completion for all domain events | P1
| Schema Registry | **REAL** | `SchemaRegistry.ts` with registration/validation/retrieval using Zod JSON-schema subset | None | Production-ready
| Outbox Publisher | **REAL** | `OutboxPublisher.ts` with transactional outbox pattern, `tenantId` and fixed `markAsFailed` | None | Production-ready
| Outbox Worker | **REAL** | `OutboxWorker.ts` per-event transactions, backoff sleep outside DB transaction | None | Production-ready
| Idempotency Middleware | **REAL** | `idempotency-middleware.ts` with Express middleware + `IdempotencyInterceptor` for NestJS/Fastify; Redis-backed when `REDIS_URL` configured, in-memory fallback | None | Production-ready
| Idempotent Consumer | **REAL** | `IdempotentConsumer.ts` for Kafka consumers with `tenantId` and `consumed_events` deduplication | Needs Redis backing store | P1
| Dead Letter Event | **REAL** | `DeadLetterEvent.ts` with `tenantId` and failure tracking | None | Production-ready
| Dead Letter Queue Service | **REAL** | `DeadLetterQueueService` with single reused Kafka producer and `tenantId` propagation | None | Production-ready
| Circuit Breaker | **REAL** | `circuit-breaker.ts` with CLOSED/OPEN/HALF_OPEN | None | Production-ready
| PII Redaction | **REAL** | `pii-redaction.ts` remains; `pii-masking.middleware.ts` removed to avoid response/console mutation | Use `pii-redaction.ts` for structured redaction before logging | P1
| ABAC Guard | **REAL** | `abac-guard.ts` with `RequireAttributes` decorator and attribute/role/permission checks | Needs policy admin integration | P1
| Tenant Isolation | **REAL** | `tenant-guard.ts` (shared), `tenant-isolation.middleware.ts`, `TenantId` param decorator | Service guards must re-export shared `TenantGuard` | Production-ready
| Consent Management | **REAL** | `consent-management.ts` + `ConsentRecordEntity` with optional `DataSource` persistence | Services must call `setDataSource` at bootstrap | P1
| Data Governance | **REAL** | `data-classification.ts`, `data-lineage.ts` + `LineageEventEntity`, `data-retention.ts`, `data-minimization.ts` (HMAC) | Needs operational enforcement | P1
| GDPR Compliance | **REAL** | `gdpr-compliance.ts` with HMAC-SHA256 anonymization | Needs Iran-specific privacy law adaptation | P1
| Feature Flags | **REAL** | `featureFlags/` directory with 12 items | None | Production-ready
| Messaging | **REAL** | `messaging/` directory with 12 items | None | Production-ready
| Observability | **REAL** | `observability/` directory with 12 items | None | Production-ready
| Error Contract (API Response) | **REAL** | Standard `{ success, data?, error?: { code, message }, correlationId }` used across all services | Not formally documented as shared contract | P1

## Shared Database Migrations

`createDataSource()` registers `1720000000000-AddSharedTables` which creates/updates:
- `outbox_events` with `tenant_id`
- `consumed_events` with composite PK `(event_id, consumer_name, tenant_id)`
- `dead_letter_queue` with `tenant_id`
- `consent_records` and `data_lineage_events` for governance persistence

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
// Redis-backed with in-memory fallback; works for Express and NestJS/Fastify
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
- `ANONYMIZATION_SECRET` — Key for `gdpr-compliance.ts` HMAC-SHA256
- `DATA_MINIMIZATION_SECRET` — Key for `data-minimization.ts` HMAC-SHA256

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
- **2026-07-27**: Shared package audit remediation completed: `TenantGuard` centralized, `tenantId` added to event/outbox/DLQ/consumed tables, real Zod schema validation, HMAC anonymization, DB-backed consent/lineage, NestJS/Fastify idempotency interceptor, and PII response-masking middleware removed.
