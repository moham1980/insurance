# Agent Portal Service — Capability Truth Registry

This document records the runtime truth of agent-portal capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Session Management | **REAL** | `POST/GET/POST agent-portal/session/*` with DB persistence | Redis/session store integration not verified | P1
| Dashboard Stats | **REAL** | `GET agent-portal/agent/:agentId/dashboard` → proxies to sales-network | None | Production-ready
| Agent Policies | **REAL** | `GET agent-portal/agent/:agentId/policies` → proxies to sales-network | None | Production-ready
| Agent Claims | **REAL** | `GET agent-portal/agent/:agentId/claims` → proxies to sales-network | None | Production-ready
| Agent Customers | **REAL** | `GET agent-portal/agent/:agentId/customers` → proxies to sales-network | None | Production-ready
| Agent Commissions | **REAL** | `GET agent-portal/agent/:agentId/commissions` → proxies to sales-network | None | Production-ready
| Agent KPI | **REAL** | `GET agent-portal/agent/:agentId/kpi` → proxies to sales-network | None | Production-ready
| Premium Trends | **REAL** | `GET agent-portal/dashboard/premium-trends` → proxies to sales-network | None | Production-ready
| Commission History | **REAL** | `GET agent-portal/dashboard/commission-history` → proxies to sales-network | None | Production-ready
| Policy Portfolio | **REAL** | `GET agent-portal/dashboard/policy-portfolio` → proxies to sales-network | None | Production-ready
| Leads | **REAL** | `GET agent-portal/leads` → proxies to sales-network | None | Production-ready
| Auth/Permissions | **REAL** | `@UseGuards(JwtAuthGuard, PermissionsGuard)` on controller with `RequirePermissions` decorator | None | Production-ready
| Retry/Fallback | **REAL** | `fetchWithRetry` with exponential backoff | Circuit breaker not implemented | P1
| Audit Logging | **SKELETON** | Basic logger only | Needs structured audit events | P1

## Contract Alignment with Sales Network Service

| Agent Portal Endpoint | Sales Network Endpoint | Status |
|---|---|---|
| `GET /agent-portal/agent/:agentId/dashboard` | `GET /sales-network/agents/:agentId/stats` | ALIGNED |
| `GET /agent-portal/agent/:agentId/policies` | `GET /sales-network/agents/:agentId/policies` | ALIGNED |
| `GET /agent-portal/agent/:agentId/claims` | `GET /sales-network/agents/:agentId/claims` | ALIGNED |
| `GET /agent-portal/agent/:agentId/customers` | `GET /sales-network/agents/:agentId/customers` | ALIGNED |
| `GET /agent-portal/agent/:agentId/commissions` | `GET /sales-network/agents/:agentId/commissions` | ALIGNED |
| `GET /agent-portal/agent/:agentId/kpi` | `GET /sales-network/agents/:agentId/kpis` | ALIGNED |
| `GET /agent-portal/dashboard/premium-trends` | `GET /sales-network/agents/:agentId/premium-trends` | ALIGNED |
| `GET /agent-portal/dashboard/commission-history` | `GET /sales-network/agents/:agentId/commission-history` | ALIGNED |
| `GET /agent-portal/dashboard/policy-portfolio` | `GET /sales-network/agents/:agentId/policy-portfolio` | ALIGNED |
| `GET /agent-portal/leads` | `GET /sales-network/agents/:agentId/leads` | ALIGNED |

## Decision Log

- **2024-06-11**: All proxy endpoints to sales-network-service are present and aligned. Auth guards need to be added.
- **2026-06-11**: Added `dashboard/premium-trends`, `dashboard/commission-history`, `dashboard/policy-portfolio`, and `leads` endpoints to match agent-portal-ui API contracts.
- **2026-06-11**: Auth guards already present on controller (`@UseGuards(JwtAuthGuard, PermissionsGuard)`); updated TRUTH.md status from SKELETON to REAL.
