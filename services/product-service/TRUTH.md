# Product Service — Capability Truth Registry

This document records the runtime truth of product capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Product Definition | **REAL** | Tenant-scoped CRUD for products, coverages, deductibles and pricing rules; canonical `QuoteEngine.compute`; `Money` decimal arithmetic | None | Production-ready
| Tenant Isolation | **REAL** | `tenantId` column on all entities; tenant-scoped queries in service and controller; `TenantGuard` enforces JWT/header match | None | Production-ready
| Product Versioning | **PARTIAL** | `publishVersion` creates immutable `ProductVersion` rows; update increments `version` and persists a snapshot | Approval workflow, effective-date activation and quote replay from historical snapshot are not yet implemented | Production-ready
| Rate Table Management | **PLACEHOLDER** | No `updateRateTable` endpoint or rate table entity exists | Factor-based pricing tables not implemented | Production-ready
| Outbox Integration | **REAL** | `OutboxPublisher` used inside all create/update/delete transactions; `OutboxWorker.start()` is awaited in `main.ts`; `health` monitors outbox backlog | Dead-letter and retry metrics UI not built | Production-ready
| JWT Policy | **REAL** | Local guard supports JWKS RS256 ecosystem tokens with issuer/audience/algorithm checks and HS256 fallback | Key rotation tests not automated | Production-ready
