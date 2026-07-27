# Reinsurance Service — Capability Truth Registry

This document records the runtime truth of reinsurance capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Treaty Management | **REAL** | `createTreaty` with terms, tenantId, retention/cession rates | Production-ready | Multi-tenant
| Cession Calculation | **REAL** | `calculateCessionAmount` reads treaty `terms` first, `config` fallback | Production-ready | Multi-tenant
| Recovery Tracking | **REAL** | `trackRecovery` with status updates and tenant isolation | Production-ready | Multi-tenant
| Period Close | **REAL** | `closePeriod` aggregates cessions per treaty/period and marks `settled` | Production-ready | Multi-tenant
| Outbox Integration | **REAL** | `OutboxPublisher` for reinsurance events | None | Production-ready
| Tenant Isolation | **REAL** | `tenantId` on all entities, queries, migrations, and event consumption | None | Production-ready
| Authorization | **REAL** | `EcosystemJwtGuard` with JWKS/RS256 + `TenantGuard` with strict validation | None | Production-ready
| Kafka Consumer | **REAL** | `PolicyConsumer` uses `KafkaConsumer` with tenant/product filtering | None | Production-ready
