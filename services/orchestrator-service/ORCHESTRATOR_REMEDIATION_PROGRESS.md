# Orchestrator-Service Audit Remediation Progress

**Audit source:** `doc/last audit/16-orchestrator-service-code-audit.md`  
**Service root:** `services/orchestrator-service`  
**Last updated:** see git timestamp  
**TypeScript status:** `npx tsc --noEmit` passes (exit 0)

## P0 Items

| # | Finding | Status | Key files |
|---|---------|--------|-----------|
| 1 | `tenantId` missing from `SagaInstance`, `SagaStep`, `WorkItem` entities and queries | **Completed** | `src/entities/SagaInstance.ts`, `src/entities/SagaStep.ts`, `src/entities/WorkItem.ts`, related migrations |
| 2 | `AbacGuard` overrides RBAC | **Completed** | `src/abac.guard.ts` (now enforces `orchestrator:read` / `orchestrator:write` scopes) |
| 3 | `TenantGuard` returns `false` | **Completed** | `src/tenant.guard.ts` (throws `ForbiddenException`, requires `tenantId`) |
| 4 | Missing `outbox_events` table migration | **Completed** | `src/migrations/1700000000403-create-outbox-events.ts` (created earlier) |
| 5 | `completeWorkItem` escalation state inconsistent | **Completed** | `src/orchestrator.service.ts` (escalated step no longer added to `completedSteps`; `saga.currentStep` set to escalation step; status set to `waiting`) |
| 6 | `publishSagaEvent` loses `tenantId` | **Completed** | `src/orchestrator.service.ts` (extracts `tenantId` with default fallback and passes through `OutboxPublisher`) |
| 7 | `processSlaBreaches` does not publish events / create work items | **Completed** | `src/sla-monitor.service.ts` (publishes `insurance.sla.breached` and `insurance.sla.escalated`; creates `sla_escalation` work items inside a transaction) |
| 8 | `PolicyIssuance` creates all work items upfront | **Completed** | `src/orchestrator.service.ts` (only `UNDERWRITING_REVIEW` created at start; `SANHAB_FOLLOWUP`, `OVERRIDE_REVIEW`, and saga completion advanced on prior step approval) |

## P1 Items

| # | Finding | Status | Key files |
|---|---------|--------|-----------|
| 1 | Kafka consumer handler not transactional across saga and outbox | **Completed** | `src/main.ts` runs idempotency insert + event handler inside `ds.transaction`; `src/orchestrator.service.ts` uses `AsyncLocalStorage` so `sagaRepo`/`workItemRepo`/`sagaStepRepo` and `publishSagaEvent` use the active transactional `EntityManager` |
| 2 | `getSaga` does not load relations | **Completed** | `src/orchestrator.service.ts` (`getSaga` now loads `relations: ['workItems', 'steps']`) |
| 3 | `DeadLetterQueueService` instantiated twice | **Completed** | `src/app.module.ts` provides `DLQ_SERVICE`; `src/main.ts` retrieves it via DI (`app.get('DLQ_SERVICE')`) |
| 4 | `findExistingSagaByDedupeKey` vulnerable to JSONB injection | **Completed** | `src/orchestrator.service.ts` uses `s.context @> :dedupeJson::jsonb` with JSON-stringified parameter |
| 5 | `executeCompensation` and `retryCompensation` not tenant-scoped | **Completed** | `src/orchestrator.service.ts` (`tenantId` included in `sagaStepRepo` queries) |
| 6 | `WorkItem.status` enum not enforced as Postgres enum | **Completed** | `src/entities/WorkItem.ts` uses `type: 'enum', enum: WorkItemStatus, enumName: 'work_item_status'` |
| 7 | `created_at` / `updated_at` defaults not auto-updated | **Completed** | `src/entities/WorkItem.ts`, `src/entities/SagaInstance.ts` use `@CreateDateColumn` / `@UpdateDateColumn` |

## P2 Items

| # | Finding | Status | Key files |
|---|---------|--------|-----------|
| 1 | `main.ts` does not set `search_path` | **Completed** | `src/main.ts` runs `SET search_path TO ${safeSchema}` after acquiring `DataSource` |
| 2 | `health.controller.ts` only checks DB | **Completed** | `src/health.controller.ts` adds Kafka admin connectivity check with `kafkajs` |

## Tenant Scoping Summary

- All saga repositories (`sagaRepo`, `sagaStepRepo`) now filter by `tenantId`.
- All work-item queries (`workItemRepo`) filter by `tenantId`.
- All controllers (`orchestrations`, `workflows`, `work-items`) pass `tenantId` from `req.user.tenantId` into service calls.
- `Kafka` consumer handler extracts `tenantId` from message headers / payload and propagates it to service event methods.
- `publishSagaEvent` derives `tenantId` from event payloads (falling back to the default UUID) and includes it in the outbox event.

## TypeScript Verification

The workspace uses project references. Build `@insurance/shared` first, then the orchestrator service:

```powershell
cd d:\CascadeProjects\old\insurance
node node_modules\typescript\lib\tsc.js -b packages\shared\tsconfig.json
node node_modules\typescript\lib\tsc.js -b services\orchestrator-service\tsconfig.json
# both exit code: 0
```

Also verified with:

```powershell
node node_modules\typescript\lib\tsc.js --noEmit -p services\orchestrator-service\tsconfig.json
# exit code: 0
```

## Remaining / Next Steps

1. **Tests** — no unit/integration tests exist for the orchestrator-service; add coverage for tenant scoping, escalation state, PolicyIssuance step ordering, and SLA breach publishing.
2. **Runtime verification** — start the service and verify migrations, Kafka consumer, and health endpoint.

## Notes

- All string-literal status/priority assignments in `orchestrator.service.ts` have been replaced with `WorkItemStatus` / `WorkItemPriority` enum values.
- Temporary remediation scripts (`fix-tenant.py`, `fix-controllers.py`) have been removed.
