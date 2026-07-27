# Sales Network Service — Capability Truth Registry

This document records the runtime truth of sales-network capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Partner Management | **REAL** | `/sales-network/partners` CRUD + lifecycle | None | Production-ready
| Ledger Management | **REAL** | `/sales-network/ledger/*` void/pay/view | None | Production-ready
| Commission Calculation | **REAL** | `/sales-network/commission/calculate` + `/sales-network/commission/recalculate` | None | Production-ready
| Agent Summary | **REAL** | `/sales-network/agent/summary` | None | Production-ready
| Agent Policies | **REAL** | `/sales-network/agent/policies` + `/sales-network/agents/:agentId/policies` | None | Production-ready
| Agent Claims | **REAL** | `/sales-network/agents/:agentId/claims` | None | Production-ready
| Agent Customers | **REAL** | `/sales-network/agents/:agentId/customers` | None | Production-ready
| Agent Commissions | **REAL** | `/sales-network/agents/:agentId/commissions` | None | Production-ready
| Agent KPIs | **REAL** | `/sales-network/agents/:agentId/kpis` | None | Production-ready
| Agent Stats | **REAL** | `/sales-network/agents/:agentId/stats` | None | Production-ready
| Auth/Permissions | **REAL** | `JwtAuthGuard` + `PermissionsGuard` + `RequirePermissions` | RBAC only, ABAC integration pending | P1
| Audit Logging | **REAL** | `auditLogger` per endpoint | Immutable outbox audit trail not enforced | P1

## Contract Alignment with Agent Portal Service

| Agent Portal Endpoint | Sales Network Endpoint | Status |
|---|---|---|
| `GET /agent-portal/agent/:agentId/dashboard` | `GET /sales-network/agents/:agentId/stats` | ALIGNED |
| `GET /agent-portal/agent/:agentId/policies` | `GET /sales-network/agents/:agentId/policies` | ALIGNED |
| `GET /agent-portal/agent/:agentId/claims` | `GET /sales-network/agents/:agentId/claims` | ALIGNED |
| `GET /agent-portal/agent/:agentId/customers` | `GET /sales-network/agents/:agentId/customers` | ALIGNED |
| `GET /agent-portal/agent/:agentId/commissions` | `GET /sales-network/agents/:agentId/commissions` | ALIGNED |
| `GET /agent-portal/agent/:agentId/kpi` | `GET /sales-network/agents/:agentId/kpis` | ALIGNED |

## Decision Log

- **2024-06-11**: All agent-facing endpoints are present and service methods exist. Contract alignment is VERIFIED.
