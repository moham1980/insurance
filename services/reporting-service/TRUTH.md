# Reporting Service — Capability Truth Registry

This document records the runtime truth of reporting capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| JWT Authentication | **REAL** | `JwtAuthGuard` validates RS256 (JWKS) with HS256 fallback | None | Production-ready
| Tenant Isolation | **REAL** | `TenantGuard` sets tenantId; `ReportingService` scopes all queries by tenantId | None | Production-ready
| Permission Enforcement | **REAL** | `PermissionsGuard` throws `ForbiddenException` for missing `reporting:*` permissions | None | Production-ready
| Read-Model Listing | **REAL** | `ReportingController` endpoints for policies, claims, payments, RI, AML, underwriting | None | Production-ready
| Executive BI Dashboard | **REAL** | `getExecutiveDashboard` aggregates tenant-scoped read models | None | Production-ready
| KPI Aggregations | **REAL** | Financial, market share, combined ratio, retention, leakage, fraud yield, STP KPIs use real DB aggregations | Satisfaction KPIs need survey data source | Production-ready
| External System Sync | **REAL** | `ExternalSystemConnection` CRUD and `syncToExternalSystem` with tenant-scoped KPI export | Real external API dispatch not wired | Production-ready
| Kafka Consumer Projections | **REAL** | `KpiConsumer` consumes insurance domain events and projects read models per tenant | Consumer does not retry on transient DB failures | Production-ready
| Health Endpoint | **REAL** | `/health` checks Postgres connectivity and returns uptime | Kafka consumer health not included | Production-ready
