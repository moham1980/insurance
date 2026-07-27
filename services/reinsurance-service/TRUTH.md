# Reinsurance Service — Capability Truth Registry

This document records the runtime truth of reinsurance capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Treaty Management | **REAL** | `createTreaty` with terms and limits | None | Production-ready
| Cession Calculation | **REAL** | `calculateCession` with proportional/non-proportional rules | None | Production-ready
| Recovery Tracking | **REAL** | `trackRecovery` with status updates | None | Production-ready
| Period Close | **REAL** | `closePeriod` with bordereaux generation | None | Production-ready
| Outbox Integration | **REAL** | `OutboxPublisher` for reinsurance events | None | Production-ready
