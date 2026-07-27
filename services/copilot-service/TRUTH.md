# Copilot Service — Capability Truth Registry

This document records the runtime truth of copilot capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Chat Session | **REAL** | `createSession` with context management | None | Production-ready
| Message Processing | **REAL** | `sendMessage` with intent detection | None | Production-ready
| Knowledge Retrieval | **REAL** | `retrieveContext` calls knowledge-layer-service | None | Production-ready
| Guardrails | **REAL** | `applyGuardrails` with policy enforcement | None | Production-ready
| Outbox Integration | **REAL** | `OutboxPublisher` for copilot events | None | Production-ready
