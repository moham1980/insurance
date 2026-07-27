# Workflow Engine Service — Capability Truth Registry

This document records the runtime truth of workflow engine capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target |
|---|---|---|---|---|
| Token-Based Workflow Execution | **REAL** | `WorkflowEngineService.executeNode` and `startProcess` | None | Production-ready |
| Process Definition CRUD | **REAL** | `WorkflowEngineService.createDefinition`, `listDefinitions`, `getDefinition`, `updateDefinition`, `deleteDefinition` | Soft-delete only; no hard delete | Production-ready |
| State Persistence | **REAL** | `ProcessInstance`, `ProcessToken`, `ProcessVariable`, `ProcessHistory`, `ProcessTimer` entities persisted via TypeORM | None | Production-ready |
| Tenant Isolation | **REAL** | `tenantId` on all entities, `TenantGuard`, tenant-scoped queries | None | Production-ready |
| JWT Authentication | **REAL** | `JwtAuthGuard` with JWKS RS256 + HS256 fallback | None | Production-ready |
| RBAC + ABAC | **REAL** | `PermissionsGuard` + metadata-driven `AbacGuard` | None | Production-ready |
| Edge Evaluation | **REAL** | `WorkflowEngineService.evaluateEdges` with `expr-eval` | None | Production-ready |
| API Call Nodes | **REAL** | `executeApiCallNode` with service-to-service JWT + URL allow-list | None | Production-ready |
| Timer Nodes | **REAL** | `executeTimerNode` + `processPendingTimers` poller via `ProcessTimer` entity | Polling interval; external scheduler optional | Production-ready |
| Human Task Nodes | **REAL** | `executeHumanTaskNode` emits `HumanTaskCreated` outbox event | Work item service integration not implemented | Phase 2 |
| Event Wait Nodes | **PARTIAL** | `executeEventWaitNode` waits and resumes on signal | No Kafka consumer subscription yet | Phase 2 |
| BPMN Execution | **NOT IMPLEMENTED** | No `executeBpmn` method exists | BPMN parser and runner not built | Future |
| Saga Coordination | **NOT IMPLEMENTED** | No `startSaga` or compensation handlers | Distributed saga orchestrator not built | Future |
| Event-Driven Steps (Kafka) | **NOT IMPLEMENTED** | No `handleEvent` Kafka consumer | Event wait nodes cannot subscribe to topics yet | Phase 2 |

## Verification

- `bun run build` in `services/workflow-engine-service` completes without TypeScript errors.
- `bun test` in `services/workflow-engine-service` runs 11 unit tests and all pass.
- Circular entity dependency between `ProcessDefinition` and `ProcessInstance` was resolved by removing bidirectional TypeORM relations; child collections (`tokens`, `variables`, `history`) and `definition.instances` are now queried explicitly via repository methods.
