# Model Switchboard Service — Capability Truth Registry

This document records the runtime truth of model switchboard capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Model Registration | **REAL** | `registerModel` with DB persistence | None | Production-ready
| Model Invocation | **REAL** | `invokeModel` makes real HTTP POST to configured `endpoint` | None | Production-ready
| Route Selection | **REAL** | `selectBestModel` with criteria-based filtering | None | Production-ready
| Usage Tracking | **REAL** | `recordUsage` with latency and cost metrics | None | Production-ready
| Model Cards | **REAL** | `createModelCard` with governance metadata | None | Production-ready
| Fallback Chain | **REAL** | Multi-model fallback with honest failure reporting | None | Production-ready
| Outbox Integration | **REAL** | `OutboxPublisher` for model invocation events | None | Production-ready

## Decision Log

- **2026-06-11**: Corrected misleading "placeholder" comment; `callModelEndpoint` already makes real HTTP calls to configured model endpoints.
