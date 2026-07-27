# Outbox Relay — Capability Truth Registry

This document records the runtime truth of outbox relay capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Event Polling | **REAL** | `pollOutbox` with cursor-based fetching | None | Production-ready
| Kafka Publishing | **REAL** | `publishToKafka` with delivery confirmation | None | Production-ready
| Dead Letter Handling | **REAL** | `handleFailure` with retry and DLQ | None | Production-ready
| Exactly-Once Semantics | **REAL** | Transactional outbox pattern with ACK tracking | None | Production-ready
