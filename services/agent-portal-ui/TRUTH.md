# Agent Portal UI — Capability Truth Registry

This document records the runtime truth of agent portal capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Customer 360 View | **REAL** | `pages/customers/index.tsx` now fetches from `/api/agent/customers/360` via SWR | Backend endpoint may not exist yet (contract alignment needed) | P0
| Hardcoded Data | **REMOVED** | `mockCustomer` object deleted from `customers/index.tsx` | — | P0
| Loading/Error/Empty States | **REAL** | Added `isLoading`, `error`, and `!data` guards with UI | — | P0
| Policy Card Rendering | **REAL** | `PolicyCard` component from `@insurance/design-system` | Data shape depends on backend contract | P0
| Next Best Actions | **REAL** | Rendered dynamically from API `nextBestActions` array | Previously hardcoded with fake data | P0
| Dashboard | **REAL** | `EnhancedDashboard` uses `agentPortalAPI.getDashboardStats`, `getPremiumTrends`, `getCommissionHistory`, `getPolicyPortfolio` | Needs backend endpoints to return data | P1
| Commissions | **REAL** | `pages/commissions/index.tsx` uses `agentPortalAPI.getCommissions` + `getDashboardStats` | Needs backend endpoints to return data | P1
| Portfolio | **REAL** | `pages/portfolio/index.tsx` uses `agentPortalAPI.getPolicyPortfolio` with charts | Needs backend endpoints to return data | P1
| Leads | **REAL** | `pages/leads/index.tsx` uses `agentPortalAPI.getLeads` | Needs backend endpoint for leads | P1
| Auth/Session | **REAL** | `localStorage` token + `agentPortalAPI` with login/logout | Needs integration with `auth-service` session | P0

## Environment Variable Requirements

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_AGENT_API_URL=http://localhost:3022  # sales-network-service BFF
```

## Decision Log

- **2024-06-11**: Removed `mockCustomer` from `pages/customers/index.tsx`. Now uses SWR + axios to fetch real data.
- **2024-06-11**: Added TypeScript `Customer` interface to enforce contract shape.

## Next Actions (from Backlog)

1. AUI-W2-01: Connect dashboard, commissions, portfolio, leads to real APIs
2. AUI-W2-02: Implement issue/renew/follow-up journeys
3. AUI-W4-01: Accessibility/RTL/productivity enhancements
