# Workflow Engine Service — Capability Truth Registry

This document records the runtime truth of workflow engine capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| BPMN Execution | **REAL** | `executeBpmn` with activity completion | None | Production-ready
| Saga Coordination | **REAL** | `startSaga` with compensation handlers | None | Production-ready
| Event-Driven Steps | **REAL** | `handleEvent` for async workflow progression | None | Production-ready
| State Persistence | **REAL** | Workflow state stored in DB with checkpoints | None | Production-ready
