# Orchestrator Service — Capability Truth Registry

This document records the runtime truth of orchestrator capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Saga State Machine | **REAL** | `SagaInstance` + `SagaStep` entities with status tracking | Needs saga definition registry | P1
| DLQ Management | **REAL** | `DlqController` with stats/list/retry endpoints | Retry logic needs idempotency check | P1
| Dead Letter Queue Service | **REAL** | `DeadLetterQueueService` from `@insurance/shared` | None | Production-ready
| Work Item Management | **REAL** | `WorkItemsController` with full CRUD + assignment | None | Production-ready
| Workflow Engine | **REAL** | `WorkflowsController` with BPMN-like flow support | Needs visual designer integration | P2
| SLA Monitoring | **REAL** | `SlaMonitorService` with breach detection | Needs more SLA types | P1
| Fraud Score Integration | **REAL** | `onFraudScoreComputed` creates suspicious case work item | None | Production-ready
| Document Review Integration | **REAL** | `onDocumentNeedsReview` creates saga + work item | None | Production-ready
| Kafka Producer | **REAL** | `KafkaProducer` with `createEventEnvelope` | Needs delivery guarantee verification | P1
| Auth/Permissions | **REAL** | `JwtAuthGuard` + `PermissionsGuard` + `RequirePermissions` | None | Production-ready
| Audit Logging | **SKELETON** | Basic logger only | Needs structured audit events to outbox | P1

## Saga Inventory

| Saga Type | Trigger Event | Status |
|---|---|---|
| ClaimPayment | `DocumentNeedsReview` | IMPLEMENTED |
| FraudHold | `FraudScoreComputed` | IMPLEMENTED |
| PolicyIssuance | — | NOT REGISTERED |
| PolicyEndorsement | — | NOT REGISTERED |
| PolicyRenewal | — | NOT REGISTERED |
| ClaimPaymentFull | — | NOT REGISTERED |
| ComplaintEscalation | — | NOT REGISTERED |

## DLQ Audit

| Endpoint | Method | Permission | Status |
|---|---|---|---|
| `/dlq/stats` | GET | `dlq:stats` | ACTIVE |
| `/dlq` | GET | `dlq:list` | ACTIVE |
| `/dlq/:eventId/retry` | POST | `dlq:manage` | ACTIVE |
| `/dlq/:eventId/resolve` | POST | `dlq:manage` | ACTIVE |
| `/dlq/bulk-retry` | POST | `dlq:manage` | ACTIVE |

## Decision Log

- **2024-06-11**: Core saga + DLQ + work item infrastructure is operational. Additional business sagas (issuance, endorsement, renewal, complaint) need to be registered.
