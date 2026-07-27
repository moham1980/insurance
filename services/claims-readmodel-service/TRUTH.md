# Claims Read Model Service — Capability Truth Registry

This document records the runtime truth of claims read model capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Event Projection | **REAL** | `ReadModelService` consumes claim/fraud/complaint/RI Kafka topics and applies projections | Tenant-scoped, atomic idempotency, ordering/version guards implemented. Branch-level scoping and real rebuild from Kafka remain. | Production-ready
| Query API | **REAL** | `ReadModelController` exposes `/rm/claims`, `/rm/fraud/cases`, `/rm/complaints` with pagination and tenant isolation | PII masking is role-based but not yet classification-driven. Summary is tenant-scoped but not branch-scoped. | Production-ready
| Aggregate Views | **REAL** | `getSummary` returns counts by status | Branch/org-unit scoped aggregation not implemented. | Production-ready
| Real-Time Sync | **REAL** | `ReadModelService.processMessage` validates event envelope, DLQs malformed/unknown/failed events, retries Kafka consumer indefinitely | Actual Kafka lag/freshness health check needs consumer group metadata integration. Rebuild endpoint is a skeleton (no replay yet). | Production-ready

## Notes

- Idempotency is now atomic: consumed-event marker and projection mutation happen in the same transaction, with `processed` flag set only on success.
- Event ordering is guarded by `lastEventVersion` and `lastOccurredAt` per aggregate.
- JWT verification supports RS256 via JWKS and HS256 fallback with issuer/audience/algorithm validation.
- `OutboxWorker` has been removed from this read-model service; it is a consumer-only service and does not publish events.
- Port and default schema are aligned: default `PORT=3019`, schema `claims_rm`.
