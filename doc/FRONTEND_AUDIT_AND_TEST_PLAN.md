# Frontend Audit & Comprehensive Test Plan

> **Date:** 2025-01-20  
> **Scope:** All 5 insurance frontend applications + shared design system  
> **Rule:** No mocks. All tests must use real infrastructure (real BFF, real backend, real browser).  
> **Goal:** 100% correctness and reliability verification of all frontends.

---

## Table of Contents

1. [Part A: Frontend Completeness Audit](#part-a-frontend-completeness-audit)
2. [Part B: Comprehensive Test Plan](#part-b-comprehensive-test-plan)

---

# Part A: Frontend Completeness Audit

## A1. Methodology

Each of the 5 frontend applications was audited by:
- Enumerating all implemented pages, components, and API client methods
- Comparing against the brokerage design documents:
  - `doc/BROKERAGE_IMPLEMENTATION_PLAN.md` (§9.2 — Portal specifications)
  - `doc/design/10_customer_portal_redesign.md`
  - `doc/design/12_agent_portal_redesign.md`
  - `doc/design/13_back_office_redesign.md`
  - `doc/design/05_component_library.md`
  - `doc/design/02_design_system_tokens.md`
  - `doc/design/91_tech_stack.md`
  - `doc/design/92_quality_gates.md`
- Identifying gaps (missing pages, missing features, missing design-system adoption)

## A2. Summary Scorecard

| App | Pages Implemented | Design System Used | API Client Coverage | Completeness vs Design |
|-----|-------------------|--------------------|---------------------|------------------------|
| **broker-portal-ui** | 7 pages | ❌ No | ✅ 30+ endpoints | ~45% |
| **agent-portal-ui** | 9 pages + 4 components | ❌ No | ✅ 25+ endpoints | ~55% |
| **customer-portal-ui** | 16 pages + 6 components | ❌ No (own components) | ✅ Good | ~65% |
| **web-ui** | 49 pages | ❌ No | ✅ Good | ~70% |
| **channel-workspace-ui** | 2 pages (8+9 tabs) | ✅ Yes (Button, Card, DataTable) | ✅ Good | ~40% |
| **design-system** | 35+ components | N/A | N/A | ~75% |

**Overall Frontend Completeness: ~55%**

## A3. Detailed App-by-App Audit

### A3.1 broker-portal-ui

**Stack:** Next.js (Pages Router), React, Tailwind CSS, lucide-react  
**BFF:** `http://localhost:3030` (broker-portal-bff)

#### Implemented Pages (7)
| Page | Route | Features |
|------|-------|----------|
| Login | `/` | Token-based login (Bearer token input) |
| Dashboard | `#dashboard` | 6 stat cards (agreements, policies, claims, payments, underwriting, collections) |
| Claims | `#claims` | List table + detail view + approve/reject actions |
| Policies | `#policies` | List table + detail view + endorsements list |
| Payments | `#payments` | List table with status filter dropdown |
| Underwriting | `#underwriting` | List table + detail view + appeal flow |
| Collections | `#collections` | List table + detail view + installments table |
| Regulatory | `#regulatory` | 3 tabs: License validation, Sanhab inquiry, Warehouse fire inquiry |

#### API Client Coverage (api.ts — 30+ methods)
Dashboard, Claims (list/get/FNOL/assess/approve/reject/communications/advocacy), Policies (list/get/details/endorsements/history/quote/convert-quote/endorse/renew), Payments (list/get/intent), Underwriting (list/get/appeal/SLA metrics), Collections (plans/installments), Regulatory (license/sanhab/warehouse), Agreements, Offerings, Submissions, Quotes, Placements (list/get/create/bind/retry/cancel), Commissions, SubAgents.

#### Gaps vs Design (BROKERAGE_IMPLEMENTATION_PLAN.md §9.2 — "Channel Workspace")
1. **No RFQ/Submission Wizard UI** — API methods exist (`listSubmissions`, `getSubmission`, `getQuotes`) but no UI page or wizard component
2. **No Quote Comparison Table UI** — API method exists (`getQuotes`) but no comparison view
3. **No Placement Creation/Bind UI** — API methods exist (`createPlacement`, `bindPlacement`) but no UI
4. **No Agreements page** — API method exists (`listAgreements`) but no nav item or page
5. **No Offerings page** — API method exists (`listOfferings`) but no nav item or page
6. **No Commissions page** — API method exists (`listCommissions`) but no nav item or page
7. **No Sub-Agents page** — API method exists (`listSubAgents`) but no nav item or page
8. **No Design System adoption** — Uses raw HTML + Tailwind, not `@insurance/design-system`
9. **No Brand/White-Label support** — No `BrandWrapper` or theme loading
10. **No RTL-specific layout** — Basic RTL text but no proper RTL layout shell
11. **No AI Copilot** — No Copilot chat or NBA integration
12. **No keyboard shortcuts**
13. **No real-time notifications** (WebSocket/SSE)
14. **No mobile responsive design**
15. **Login is token-paste, not OTP/username-password** — Design says OTP (Kavenegar/Twilio)

### A3.2 agent-portal-ui

**Stack:** Next.js (Pages Router), React, Tailwind CSS, lucide-react  
**BFF:** `http://localhost:3032` (agent-portal-service)

#### Implemented Pages (9 + 4 components)
| Page | Route | Features |
|------|-------|----------|
| Login | `index` | Username/password with API login |
| Dashboard | `#dashboard` | EnhancedDashboard component (stats, charts) |
| Policies | `#policies` | List table with status badges |
| Commissions | `#commissions` | List table with status badges |
| Portfolio | `/portfolio` | Separate page (policy portfolio) |
| Leads | `/leads` | Separate page (lead management) |
| Claims | `/claims` | Separate page |
| Advocacy | `/advocacy` | Separate page (claim advocacy cases) |
| Adjuster Referrals | `/adjuster-referrals` | Separate page |
| Recovery | `/recovery` | Separate page (recovery tracking) |

#### Components (4)
- `EnhancedDashboard.tsx` — Dashboard with stats and charts
- `NbaActionsPanel.tsx` — Next Best Action panel
- `agent-shell.tsx` — Layout shell
- `theme-provider.tsx` — Theme provider

#### API Client Coverage (api.ts — 25+ methods)
Login, session, dashboard stats, policies, commissions, premium trends, commission history, policy portfolio, claims, claim details, claim advocacy, advocacy tasks (list/update), adjuster referrals (create/accept/reject/report), recovery (create/get/list/update), customer detail, commission detail, leads, NBA actions (generate/list/execute/opt-out), WebSocket, SSE.

#### Gaps vs Design (12_agent_portal_redesign.md)
1. **No Command Palette** — Design specifies `CommandPalette` for keyboard-first navigation
2. **No AI Copilot chat UI** — NBA API exists but no Copilot chat component
3. **No Quote Wizard with AI** — Design specifies multi-step AI-assisted quote wizard
4. **No Commission Tracker with gamification** — Design specifies progress bars, badges, leaderboards
5. **No keyboard shortcuts** — Design specifies keyboard-first culture
6. **No real-time notifications UI** — WebSocket/SSE API exists but no notification UI
7. **No mobile experience** — Design specifies responsive mobile views
8. **No Design System adoption** — Uses raw HTML + Tailwind
9. **No dense table UX** — No sorting, filtering, column customization
10. **No dark mode** — Design specifies dark mode support
11. **No workbench pattern** — Design specifies split-view workbench layout

### A3.3 customer-portal-ui

**Stack:** Next.js (App Router), React, Tailwind CSS, lucide-react, @tanstack/react-query, axios, zod, react-hook-form  
**BFF:** Customer portal API routes + direct backend

#### Implemented Pages (16 pages + 6 components)
| Page | Route | Features |
|------|-------|----------|
| Landing/Login | `/` | Entry point with OTP login |
| Dashboard | `/dashboard` | Personalized dashboard |
| Policies | `/policies` | Policy list |
| Claims | `/claims` | Claims list |
| FNOL | `/fnol` | First Notice of Loss wizard |
| Payments | `/payments` | Payment history |
| Endorsement | `/endorsement` | Endorsement request |
| Endorsement Tracking | `/endorsement-tracking` | Track endorsement status |
| Renewal | `/renewal` | Policy renewal |
| Renewal Comparison | `/renewal-comparison` | Compare renewal options |
| Complaints | `/complaints` | File complaints |
| Consent | `/consent` | Data consent management |
| Advocacy | `/advocacy` | Claim advocacy |
| Adjuster Communication | `/adjuster-communication` | Communicate with adjuster |
| Portfolio | `/portfolio` | Portfolio summary |
| Profile | `/profile` | User profile |
| Chatbot | `/chatbot` | AI chatbot support |

#### Components (6)
- `ConsentManager.tsx`
- `PortfolioSummary.tsx`
- `portal-shell.tsx`
- `theme-provider.tsx`
- `toast-provider.tsx`
- `brand-provider.tsx` (brand/white-label config)

#### API Routes (4)
- `/api/auth/set-cookie` — Set auth cookie after OTP
- `/api/auth/logout` — Clear auth cookie
- `/api/portal/otp` — OTP request endpoint

#### Gaps vs Design (10_customer_portal_redesign.md)
1. **No Next Best Action on dashboard** — Design specifies NBA widget with AI-driven suggestions
2. **No AI-driven FNOL wizard** — Page exists but AI integration (photo analysis, auto-fill) unclear
3. **No Support Chat with AI** — Chatbot page exists but may not be AI-powered with real LLM
4. **No PWA configuration** — Design specifies PWA with offline support
5. **No mobile-first responsive design verification** — Design specifies mobile-first
6. **No Design System adoption** — Has own components, not using `@insurance/design-system`
7. **No Jalali date picker** — Design specifies `date-fns-jalali` integration
8. **No dark mode** — Design specifies dark mode
9. **No performance budget verification** — Design specifies LCP < 2.5s, CLS < 0.1
10. **No passwordless login verification** — OTP API route exists but login flow needs verification

### A3.4 web-ui (Back-Office / Insurer Operations)

**Stack:** Next.js (App Router), React, Tailwind CSS  
**BFF:** Insurer operations BFF

#### Implemented Pages (49 pages)
| Category | Pages |
|----------|-------|
| **Core** | `/` (home), `/login`, `/forbidden` |
| **Claims** | `/claims`, `/claims/[claimId]`, `/claims/summary` |
| **Policies** | `/policies` |
| **Underwriting** | `/underwriting`, `/underwriting/[requestId]` |
| **Payments** | `/payments` |
| **Collections** | `/collections` |
| **Party/KYC** | `/party` |
| **Product** | `/product` |
| **Sales Network** | `/sales-network`, `/sales-network/partners` |
| **Org Units** | `/org-units` |
| **Users** | `/users` |
| **Settings** | `/settings` |
| **Documents** | `/documents`, `/document-ai` |
| **Fraud/AML** | `/fraud`, `/aml` |
| **Complaints** | `/complaints` |
| **Reinsurance** | `/reinsurance`, `/reinsurance/contracts` |
| **Reporting** | `/reporting` |
| **Sanhab** | `/sanhab` |
| **Monitoring** | `/monitoring`, `/dlq` |
| **Work Items** | `/work-items` |
| **Insurer Operations** | `/insurer-operations` |
| **Loss Adjuster** | `/loss-adjuster` |
| **AI Governance** | `/ai-governance` |
| **Portal** | `/portal`, `/portal/claims`, `/portal/claims/new`, `/portal/claims/[id]`, `/portal/policies`, `/portal/policies/[id]`, `/portal/payments`, `/portal/complaints` |
| **Admin** | `/admin/audit-log`, `/admin/executive-bi`, `/admin/feature-flags`, `/admin/jobs`, `/admin/organization-settings`, `/admin/realtime-test`, `/admin/tracing`, `/admin/users` |

#### Gaps vs Design (13_back_office_redesign.md)
1. **No Role-Based Workspace model** — Design specifies workbench pattern (split-view with list + detail)
2. **No Claims Workbench** — Has claims page but not workbench pattern with inline detail
3. **No Underwriting Workstation** — Has underwriting page but not workstation pattern
4. **No RBAC Matrix UI** — Design specifies visual RBAC matrix editor
5. **No Dark Mode** — Design specifies dark mode
6. **No Density Options** — Design specifies compact/comfortable density toggle
7. **No Real-time Collaboration** — Design specifies real-time presence indicators
8. **No Data Viz / charts** — Design specifies ECharts integration for BI dashboards
9. **No Design System adoption** — Uses raw HTML + Tailwind
10. **No Command Palette** — Design specifies command palette for power users

### A3.5 channel-workspace-ui

**Stack:** Next.js (Pages Router), React, Tailwind CSS, @insurance/design-system, @insurance/ui-utils  
**BFF:** `http://localhost:3020` (channel-workspace-bff)

#### Implemented Pages (2 pages with tabs)
| Page | Route | Tabs |
|------|-------|------|
| Channel Workspace | `/` | overview, offerings, submissions, commissions, customers, dashboard, subAgents, partners |
| Broker Operations | `/broker` | dashboard, agreements, offerings, placements, settlements, claims, contracts, subAgents, partners |

#### Design System Usage
✅ Uses `@insurance/design-system` (Button, Card, DataTable)  
✅ Uses `@insurance/ui-utils` (cn utility)

#### Gaps vs Design (BROKERAGE_IMPLEMENTATION_PLAN.md §9.2 — Channel Workspace)
1. **No CRM customer detail view** — Only generic table
2. **No SubmissionWizard / RFQ wizard** — Design specifies multi-step wizard
3. **No QuoteComparisonTable** — Design specifies side-by-side quote comparison
4. **No Placement creation and bind UI** — Only list view
5. **No Commission Ledger** — Only generic table
6. **No Claim registration and tracking UI** — Only generic table
7. **No Document upload per carrier** — Not implemented
8. **No Brand settings UI** — Not implemented
9. **No OrganizationCapability-based menu** — Not implemented
10. **Very basic table rendering** — Auto-generates columns from data keys, no proper column definitions
11. **No QuoteComparisonTable, CarrierSelector, SubmissionWizard domain components** — Exist in design-system but not used
12. **No login page** — Redirects to `/` if no token, but no login UI

### A3.6 Shared Design System (packages/design-system)

#### Implemented Components (35+)
| Category | Components |
|----------|------------|
| **Primitives** | Button, Card, Input, Dialog, DropdownMenu, Popover, Switch, Tabs, Tooltip, Skeleton, ProgressBar |
| **Navigation** | BottomNav, CommandPalette, SkipLink |
| **Data Display** | DataTable, StatCard, BarChart, LineChart |
| **Domain** | PolicyCard, PolicyTimeline, QuoteComparisonTable, QuoteScoreBreakdown, CarrierSelector, SubmissionWizard, CommissionLedgerCard, SubAgentTree, ConsentPanel, CoverageMatrix |
| **AI/Copilot** | CopilotChat, CopilotSuggestionCard, NextBestAction, ChatBubble, ChatInput |
| **Branding** | BrandWrapper |
| **Feedback** | Toast, ToastProvider |

#### Tests (5 component tests)
- `CarrierSelector.test.tsx`
- `ConsentPanel.test.tsx`
- `PolicyTimeline.test.tsx`
- `SubAgentTree.test.tsx`
- `SubmissionWizard.test.tsx`

#### Gaps vs Design (05_component_library.md)
1. **No Storybook** — Stories exist for some components (Button, Card, Dialog, Input, Popover, Tabs) but no Storybook config/installation
2. **No visual regression testing** — No Chromatic or Playwright screenshot tests
3. **Missing components** — No `Toast` (exists but may be incomplete), no `DateRangePicker`, no `JalaliDatePicker`, no `MapPicker`, no `FileUploader`, no `Stepper`
4. **No RTL-native testing** — Tests don't verify RTL layout
5. **No accessibility testing** — No axe-core tests for components
6. **Only 5/35+ components have tests** — ~14% component test coverage

## A4. Cross-Cutting Gaps

### Design System Adoption
| App | Uses @insurance/design-system? | Uses design tokens? |
|-----|-------------------------------|---------------------|
| broker-portal-ui | ❌ | ❌ |
| agent-portal-ui | ❌ | ❌ |
| customer-portal-ui | ❌ (own components) | ❌ |
| web-ui | ❌ | ❌ |
| channel-workspace-ui | ✅ (partial) | ✅ (partial) |

### Test Coverage
| App | Unit Tests | Component Tests | E2E Tests | A11y Tests | Visual Regression |
|-----|-----------|-----------------|-----------|-----------|-------------------|
| broker-portal-ui | ❌ 0 | ❌ 0 | API-only (BFF) | ❌ | ❌ |
| agent-portal-ui | ❌ 0 | ❌ 0 | API-only (BFF) | ❌ | ❌ |
| customer-portal-ui | 1 (trivial) | ❌ 0 | ❌ (dead file) | ❌ | ❌ |
| web-ui | ❌ 0 | ❌ 0 | ❌ | ❌ | ❌ |
| channel-workspace-ui | ❌ 0 | ❌ 0 | API-only (BFF) | ❌ | ❌ |
| design-system | ❌ 0 | 5 (basic) | N/A | ❌ | ❌ |

### Test Infrastructure
- **Jest** configs exist for unit, e2e, integration, contract, resilience — all backend-focused
- **No Playwright** installed or configured
- **No Vitest** installed or configured
- **No @testing-library/react** at root level (only in design-system)
- **No axe-core** or accessibility testing setup
- **No Lighthouse CI** configuration
- **No Storybook** for visual regression
- **E2E tests** are API-level (Jest + axios), not browser-level

---

# Part B: Comprehensive Test Plan

## B1. Testing Principles

1. **No Mocks:** All tests must use real infrastructure — real BFF services, real backend services, real database, real Kafka, real Redis. No mocked APIs, no mocked components, no mocked data.
2. **Find and Fix Bugs:** The goal is to discover and fix real defects, not to make tests pass. If a test fails, fix the root cause in the code.
3. **Testing Pyramid:** Unit → Component → Integration → E2E, with volume decreasing as scope increases.
4. **Real Browser Testing:** E2E tests must use Playwright with real Chromium/Firefox/WebKit browsers against running frontend dev servers.
5. **Accessibility is Non-Negotiable:** Every page must pass automated axe-core checks and manual WCAG 2.1 AA verification.
6. **Visual Regression:** Every page must have baseline screenshots for visual regression detection.
7. **RTL-First:** All tests must verify RTL layout correctness, not just LTR.
8. **100% Coverage Target:** Every page, every component, every user flow, every error state, every loading state.

## B2. Test Infrastructure Setup

### B2.1 Install Required Dependencies

```
Root package.json devDependencies:
- @playwright/test
- @testing-library/react
- @testing-library/jest-dom
- @testing-library/user-event
- @axe-core/playwright
- @axe-core/react
- jest-environment-jsdom
- identity-map-proxy (for ESM support)
- lighthouse
- @lhci/cli
- vitest
- @vitest/coverage-v8
- jsdom
```

### B2.2 Playwright Configuration

Create `playwright.config.ts` at project root:

```typescript
// Configuration for 5 frontend apps + design system
// - 3 browsers: chromium, firefox, webkit
// - 2 orientations: desktop, mobile
// - 2 directions: rtl (primary), ltr
// - Base URLs per app
// - Real backend services (no mocks)
// - Video recording on failure
// - Screenshot on failure
// - Trace on first retry
```

**App base URLs (dev):**
| App | URL | Port |
|-----|-----|------|
| broker-portal-ui | http://localhost:3001 | 3001 |
| agent-portal-ui | http://localhost:3002 | 3002 |
| customer-portal-ui | http://localhost:3003 | 3003 |
| web-ui | http://localhost:3004 | 3004 |
| channel-workspace-ui | http://localhost:3005 | 3005 |

### B2.3 Vitest Configuration

Create `vitest.config.ts` for unit + component tests:
- jsdom environment
- Coverage provider: v8
- Coverage thresholds: 80% lines, 80% functions, 80% branches, 80% statements
- Setup files: `@testing-library/jest-dom`, `axe-core`

### B2.4 Test Directory Structure

```
tests/
├── unit/
│   ├── design-system/
│   │   ├── Button.test.tsx
│   │   ├── Card.test.tsx
│   │   ├── DataTable.test.tsx
│   │   ├── ... (all 35+ components)
│   ├── broker-portal-ui/
│   │   ├── api.test.ts
│   │   ├── LoginPage.test.tsx
│   │   ├── DashboardPage.test.tsx
│   │   ├── ...
│   ├── agent-portal-ui/
│   ├── customer-portal-ui/
│   ├── web-ui/
│   └── channel-workspace-ui/
├── component/
│   ├── design-system/
│   │   ├── Button.interaction.test.tsx
│   │   ├── SubmissionWizard.flow.test.tsx
│   │   ├── ...
│   ├── broker-portal-ui/
│   ├── agent-portal-ui/
│   ├── customer-portal-ui/
│   ├── web-ui/
│   └── channel-workspace-ui/
├── e2e/
│   ├── broker-portal/
│   │   ├── login.spec.ts
│   │   ├── dashboard.spec.ts
│   │   ├── claims.spec.ts
│   │   ├── policies.spec.ts
│   │   ├── payments.spec.ts
│   │   ├── underwriting.spec.ts
│   │   ├── collections.spec.ts
│   │   ├── regulatory.spec.ts
│   │   └── smoke.spec.ts
│   ├── agent-portal/
│   │   ├── login.spec.ts
│   │   ├── dashboard.spec.ts
│   │   ├── policies.spec.ts
│   │   ├── commissions.spec.ts
│   │   ├── portfolio.spec.ts
│   │   ├── leads.spec.ts
│   │   ├── claims.spec.ts
│   │   ├── advocacy.spec.ts
│   │   ├── adjuster-referrals.spec.ts
│   │   ├── recovery.spec.ts
│   │   └── smoke.spec.ts
│   ├── customer-portal/
│   │   ├── login.spec.ts
│   │   ├── dashboard.spec.ts
│   │   ├── policies.spec.ts
│   │   ├── claims.spec.ts
│   │   ├── fnol.spec.ts
│   │   ├── payments.spec.ts
│   │   ├── endorsement.spec.ts
│   │   ├── renewal.spec.ts
│   │   ├── complaints.spec.ts
│   │   ├── consent.spec.ts
│   │   ├── advocacy.spec.ts
│   │   ├── chatbot.spec.ts
│   │   ├── portfolio.spec.ts
│   │   ├── profile.spec.ts
│   │   └── smoke.spec.ts
│   ├── web-ui/
│   │   ├── login.spec.ts
│   │   ├── claims.spec.ts
│   │   ├── claims-detail.spec.ts
│   │   ├── policies.spec.ts
│   │   ├── underwriting.spec.ts
│   │   ├── payments.spec.ts
│   │   ├── collections.spec.ts
│   │   ├── party.spec.ts
│   │   ├── product.spec.ts
│   │   ├── sales-network.spec.ts
│   │   ├── org-units.spec.ts
│   │   ├── users.spec.ts
│   │   ├── documents.spec.ts
│   │   ├── fraud.spec.ts
│   │   ├── aml.spec.ts
│   │   ├── complaints.spec.ts
│   │   ├── reinsurance.spec.ts
│   │   ├── reporting.spec.ts
│   │   ├── sanhab.spec.ts
│   │   ├── monitoring.spec.ts
│   │   ├── dlq.spec.ts
│   │   ├── work-items.spec.ts
│   │   ├── insurer-operations.spec.ts
│   │   ├── loss-adjuster.spec.ts
│   │   ├── ai-governance.spec.ts
│   │   ├── admin-audit-log.spec.ts
│   │   ├── admin-executive-bi.spec.ts
│   │   ├── admin-feature-flags.spec.ts
│   │   ├── admin-jobs.spec.ts
│   │   ├── admin-organization-settings.spec.ts
│   │   ├── admin-tracing.spec.ts
│   │   ├── admin-users.spec.ts
│   │   └── smoke.spec.ts
│   ├── channel-workspace/
│   │   ├── overview.spec.ts
│   │   ├── offerings.spec.ts
│   │   ├── submissions.spec.ts
│   │   ├── commissions.spec.ts
│   │   ├── customers.spec.ts
│   │   ├── dashboard.spec.ts
│   │   ├── sub-agents.spec.ts
│   │   ├── partners.spec.ts
│   │   ├── broker-dashboard.spec.ts
│   │   ├── broker-agreements.spec.ts
│   │   ├── broker-placements.spec.ts
│   │   ├── broker-settlements.spec.ts
│   │   ├── broker-claims.spec.ts
│   │   └── smoke.spec.ts
│   └── cross-app/
│       ├── navigation.spec.ts
│       ├── auth-flow.spec.ts
│       └── brand-switching.spec.ts
├── a11y/
│   ├── design-system.a11y.spec.ts
│   ├── broker-portal.a11y.spec.ts
│   ├── agent-portal.a11y.spec.ts
│   ├── customer-portal.a11y.spec.ts
│   ├── web-ui.a11y.spec.ts
│   └── channel-workspace.a11y.spec.ts
├── visual/
│   ├── design-system.visual.spec.ts
│   ├── broker-portal.visual.spec.ts
│   ├── agent-portal.visual.spec.ts
│   ├── customer-portal.visual.spec.ts
│   ├── web-ui.visual.spec.ts
│   └── channel-workspace.visual.spec.ts
├── performance/
│   ├── broker-portal.lighthouse.spec.ts
│   ├── agent-portal.lighthouse.spec.ts
│   ├── customer-portal.lighthouse.spec.ts
│   ├── web-ui.lighthouse.spec.ts
│   └── channel-workspace.lighthouse.spec.ts
└── helpers/
    ├── test-fixtures.ts
    ├── auth-helpers.ts
    ├── rtl-helpers.ts
    └── visual-helpers.ts
```

## B3. Test Layers — Detailed Specification

### B3.1 Unit Tests (Vitest + jsdom)

**Scope:** Individual functions, hooks, utilities, API client methods  
**Environment:** jsdom (no real browser)  
**No mocks:** API client tests make real HTTP calls to running BFF services  
**Coverage target:** ≥80%

#### Per-App Unit Tests

**broker-portal-ui:**
| Test File | What It Tests |
|-----------|--------------|
| `api.test.ts` | All `brokerApi` methods — real HTTP calls to BFF on localhost:3030 |
| `LoginPage.test.tsx` | Token input, validation, cookie set/clear |
| `DashboardPage.test.tsx` | Stats rendering, loading/error states |
| `ClaimsPage.test.tsx` | List rendering, detail view, approve/reject flow |
| `PoliciesPage.test.tsx` | List rendering, detail view, endorsements |
| `PaymentsPage.test.tsx` | List rendering, status filter |
| `UnderwritingPage.test.tsx` | List rendering, detail view, appeal flow |
| `CollectionsPage.test.tsx` | List rendering, detail view, installments |
| `RegulatoryPage.test.tsx` | License validation, Sanhab inquiry, warehouse inquiry |
| `StatusBadge.test.tsx` | All status colors and labels |
| `ErrorBanner.test.tsx` | Error display |

**agent-portal-ui:**
| Test File | What It Tests |
|-----------|--------------|
| `api.test.ts` | All `agentPortalAPI` methods — real HTTP to localhost:3032 |
| `LoginPage.test.tsx` | Username/password, login API call, cookie set |
| `PoliciesPage.test.tsx` | Policy list, status badges, premium display |
| `CommissionsPage.test.tsx` | Commission list, rate/amount display |
| `PolicyRow.test.tsx` | Row rendering, status mapping |
| `CommissionRow.test.tsx` | Row rendering, status mapping |
| `EnhancedDashboard.test.tsx` | Stats, charts, loading states |
| `NbaActionsPanel.test.tsx` | NBA actions list, execute, opt-out |

**customer-portal-ui:**
| Test File | What It Tests |
|-----------|--------------|
| `api.test.ts` | All API client methods — real HTTP |
| `brand-config.test.ts` | White-label config, theme, RTL, legal text (expand existing) |
| `ConsentManager.test.tsx` | Consent grant/revoke, UI states |
| `PortfolioSummary.test.tsx` | Portfolio data display |
| `portal-shell.test.tsx` | Layout, navigation, responsive |
| `toast-provider.test.tsx` | Toast notifications |
| `brand-provider.test.tsx` | Brand loading, theme application |

**web-ui:**
| Test File | What It Tests |
|-----------|--------------|
| `api.test.ts` | All API client methods |
| `LoginPage.test.tsx` | Login form, auth flow |
| `ClaimsPage.test.tsx` | Claims list, detail, summary |
| `UnderwritingPage.test.tsx` | Underwriting list, detail |
| `PaymentsPage.test.tsx` | Payments list |
| All 49 pages | Each page renders, loads data, handles errors |

**channel-workspace-ui:**
| Test File | What It Tests |
|-----------|--------------|
| `api.test.ts` | All `channelApi` and `brokerApi` methods — real HTTP to localhost:3020 |
| `ChannelWorkspacePage.test.tsx` | Tab switching, data loading per tab |
| `BrokerPage.test.tsx` | Tab switching, data loading per tab |
| `OverviewTab.test.tsx` | Workspace cards rendering |
| `SubmissionsTab.test.tsx` | Submissions table, new submission button |
| `ChannelDashboardTab.test.tsx` | Dashboard stats cards |
| `SubAgentsTab.test.tsx` | Sub-agent list, create modal, form validation |
| `PartnersTab.test.tsx` | Partner list, create modal, form validation |

**design-system:**
| Test File | What It Tests |
|-----------|--------------|
| `Button.test.tsx` | All variants, sizes, disabled, loading, onClick |
| `Card.test.tsx` | Content rendering, className merge |
| `Input.test.tsx` | Value, onChange, error, label, placeholder |
| `Dialog.test.tsx` | Open/close, overlay click, escape key, focus trap |
| `DataTable.test.tsx` | Columns, rows, sorting, pagination, empty state, loading |
| `DropdownMenu.test.tsx` | Open/close, item select, keyboard nav |
| `Popover.test.tsx` | Trigger, content, positioning |
| `Switch.test.tsx` | Toggle, disabled, onChange |
| `Tabs.test.tsx` | Tab switching, keyboard nav, active indicator |
| `Tooltip.test.tsx` | Hover, focus, content |
| `Skeleton.test.tsx` | Rendering, animation |
| `ProgressBar.test.tsx` | Value, max, label |
| `StatCard.test.tsx` | Label, value, icon |
| `BarChart.test.tsx` | Data rendering, axis labels |
| `LineChart.test.tsx` | Data rendering, axis labels |
| `BottomNav.test.tsx` | Items, active state, onClick |
| `CommandPalette.test.tsx` | Open/close, search, command select, keyboard |
| `SkipLink.test.tsx` | Focus, click, target |
| `BrandWrapper.test.tsx` | Theme application, brand config |
| `PolicyCard.test.tsx` | Policy data, status, premium |
| `PolicyTimeline.test.tsx` | Timeline events, status flow (expand existing) |
| `QuoteComparisonTable.test.tsx` | Side-by-side quotes, selection |
| `QuoteScoreBreakdown.test.tsx` | Score factors, weights |
| `CarrierSelector.test.tsx` | Carrier list, selection (expand existing) |
| `SubmissionWizard.test.tsx` | Steps, navigation, validation, completion (expand existing) |
| `CommissionLedgerCard.test.tsx` | Commission entries, totals |
| `SubAgentTree.test.tsx` | Hierarchy, expand/collapse (expand existing) |
| `ConsentPanel.test.tsx` | Consent grant/revoke (expand existing) |
| `CoverageMatrix.test.tsx` | Coverage items, comparison |
| `CopilotChat.test.tsx` | Messages, input, send, response |
| `CopilotSuggestionCard.test.tsx` | Suggestion display, action |
| `NextBestAction.test.tsx` | NBA display, execute, dismiss |
| `ChatBubble.test.tsx` | Message rendering, direction |
| `ChatInput.test.tsx` | Input, send button, disabled |
| `Toast.test.tsx` | Variant, message, auto-dismiss |
| `ToastProvider.test.tsx` | Context, add/remove toasts |

### B3.2 Component Tests (Vitest + @testing-library/react)

**Scope:** Component interactions, form flows, state transitions  
**Environment:** jsdom  
**No mocks:** Real child components, real API calls where feasible

#### Key Component Test Scenarios

**Design System:**
- `SubmissionWizard`: Multi-step navigation, step validation, back button, completion callback, error display
- `QuoteComparisonTable`: Quote selection, comparison rendering, sort by column
- `DataTable`: Sort, filter, paginate, row click, empty state, loading skeleton
- `CommandPalette`: Keyboard open (Cmd+K), search filter, arrow navigation, enter select, escape close
- `CopilotChat`: Message list, typing indicator, send message, receive response, error state
- `Dialog`: Focus trap, tab navigation, escape close, overlay click, restore focus
- `BrandWrapper`: Theme injection, CSS variable application, brand switch

**Per-App Component Tests:**
- **broker-portal-ui:** Claims approve/reject flow, policy detail + endorsements, underwriting appeal, regulatory tab switching
- **agent-portal-ui:** Login form submission, dashboard stats loading, commission row rendering, NBA action execute/opt-out
- **customer-portal-ui:** OTP login flow, FNOL wizard multi-step, consent grant/revoke, renewal comparison
- **web-ui:** Claims detail view, underwriting detail, admin feature flags toggle, audit log filter
- **channel-workspace-ui:** Tab switching, sub-agent create modal, partner create modal, data table rendering

### B3.3 E2E Tests (Playwright — Real Browser)

**Scope:** Full user journeys in real browser  
**Environment:** Chromium, Firefox, WebKit  
**No mocks:** Real frontend dev server + real BFF + real backend  
**Setup:** Start all backend services, BFF services, and frontend dev servers before test suite

#### B3.3.1 Broker Portal E2E

| Test | Steps | Assertions |
|------|-------|------------|
| `login.spec.ts` | Navigate to /, enter token, click login | URL changes, nav bar visible, dashboard renders |
| `dashboard.spec.ts` | Login → dashboard | 6 stat cards visible with real data from BFF |
| `claims.spec.ts` | Login → claims → click row → approve | Claims table populated, detail view, approve success |
| `claims-reject.spec.ts` | Login → claims → click row → reject with reason | Reject flow, reason validation, list refresh |
| `policies.spec.ts` | Login → policies → click row | Policy table, detail view, endorsements list |
| `payments.spec.ts` | Login → payments → filter by status | Payment table, filter dropdown, filtered results |
| `underwriting.spec.ts` | Login → underwriting → click row → appeal | Underwriting table, detail, appeal form, submit |
| `collections.spec.ts` | Login → collections → click plan | Collections table, plan detail, installments table |
| `regulatory-license.spec.ts` | Login → regulatory → license tab → validate | Form, validation, result display |
| `regulatory-sanhab.spec.ts` | Login → regulatory → sanhab tab → inquiry | Form, inquiry, result display |
| `regulatory-warehouse.spec.ts` | Login → regulatory → warehouse tab → inquiry | Form, inquiry, result display |
| `logout.spec.ts` | Login → click logout | Cookie cleared, login page shown |
| `error-states.spec.ts` | Login → stop BFF → navigate | Error banner displayed |
| `loading-states.spec.ts` | Login → navigate to each page | Loading spinner shown before data |
| `rtl-layout.spec.ts` | Login → check all pages | RTL direction, text alignment, icon direction |
| `mobile-responsive.spec.ts` | Login → resize to 375px | Layout adapts, no horizontal scroll |

#### B3.3.2 Agent Portal E2E

| Test | Steps | Assertions |
|------|-------|------------|
| `login.spec.ts` | Navigate, enter username/password, submit | Login API called, cookies set, dashboard shown |
| `dashboard.spec.ts` | Login → dashboard | EnhancedDashboard renders with real stats |
| `policies.spec.ts` | Login → policies | Policy table with real data, status badges |
| `commissions.spec.ts` | Login → commissions | Commission table with real data |
| `portfolio.spec.ts` | Login → portfolio | Portfolio page renders |
| `leads.spec.ts` | Login → leads | Leads list with real data |
| `claims.spec.ts` | Login → claims | Claims list |
| `advocacy.spec.ts` | Login → advocacy | Advocacy cases |
| `adjuster-referrals.spec.ts` | Login → adjuster referrals | Referral list |
| `recovery.spec.ts` | Login → recovery | Recovery cases |
| `nba-actions.spec.ts` | Login → dashboard → NBA panel | NBA actions load, execute, opt-out |
| `logout.spec.ts` | Login → logout | Cookies cleared, login page |
| `error-states.spec.ts` | Login → stop BFF → navigate | Error displayed |
| `rtl-layout.spec.ts` | Login → all pages | RTL correct |
| `mobile-responsive.spec.ts` | Login → 375px | Responsive layout |

#### B3.3.3 Customer Portal E2E

| Test | Steps | Assertions |
|------|-------|------------|
| `login-otp.spec.ts` | Navigate → enter phone → receive OTP → enter OTP | OTP API called, cookie set, dashboard redirect |
| `dashboard.spec.ts` | Login → dashboard | Dashboard with personalized data |
| `policies.spec.ts` | Login → policies | Policy list with real data |
| `claims.spec.ts` | Login → claims | Claims list |
| `fnol.spec.ts` | Login → FNOL → fill wizard → submit | Multi-step wizard, form validation, submission |
| `payments.spec.ts` | Login → payments | Payment history with real data |
| `endorsement.spec.ts` | Login → endorsement → submit request | Endorsement form, submission |
| `endorsement-tracking.spec.ts` | Login → endorsement-tracking | Tracking list, status |
| `renewal.spec.ts` | Login → renewal | Renewal flow |
| `renewal-comparison.spec.ts` | Login → renewal-comparison | Comparison view |
| `complaints.spec.ts` | Login → complaints → file complaint | Complaint form, submission |
| `consent.spec.ts` | Login → consent → grant/revoke | Consent panel, state change |
| `advocacy.spec.ts` | Login → advocacy | Advocacy cases |
| `adjuster-communication.spec.ts` | Login → adjuster communication | Communication thread |
| `portfolio.spec.ts` | Login → portfolio | Portfolio summary |
| `profile.spec.ts` | Login → profile | Profile data, edit |
| `chatbot.spec.ts` | Login → chatbot → send message | Chat interface, response |
| `logout.spec.ts` | Login → logout | Cookie cleared, login page |
| `error-states.spec.ts` | Login → stop backend → navigate | Error handling |
| `rtl-layout.spec.ts` | Login → all pages | RTL correct |
| `mobile-responsive.spec.ts` | Login → 375px | Mobile layout |
| `pwa.spec.ts` | Check manifest, service worker | PWA installable |

#### B3.3.4 Web-UI (Back-Office) E2E

| Test | Steps | Assertions |
|------|-------|------------|
| `login.spec.ts` | Navigate → login | Auth flow, redirect to home |
| `claims.spec.ts` | Login → claims | Claims list with real data |
| `claims-detail.spec.ts` | Login → claims → click claim | Detail view, claim data |
| `claims-summary.spec.ts` | Login → claims/summary | Summary view |
| `policies.spec.ts` | Login → policies | Policy list |
| `underwriting.spec.ts` | Login → underwriting | Underwriting queue |
| `underwriting-detail.spec.ts` | Login → underwriting → click request | Detail view, decision |
| `payments.spec.ts` | Login → payments | Payment list |
| `collections.spec.ts` | Login → collections | Collections list |
| `party.spec.ts` | Login → party | Party/KYC list |
| `product.spec.ts` | Login → product | Product list |
| `sales-network.spec.ts` | Login → sales-network | Sales network tree |
| `sales-network-partners.spec.ts` | Login → sales-network/partners | Partners list |
| `org-units.spec.ts` | Login → org-units | Org unit tree |
| `users.spec.ts` | Login → users | User list, roles |
| `documents.spec.ts` | Login → documents | Document list |
| `document-ai.spec.ts` | Login → document-ai | AI document processing |
| `fraud.spec.ts` | Login → fraud | Fraud cases |
| `aml.spec.ts` | Login → aml | AML alerts |
| `complaints.spec.ts` | Login → complaints | Complaint list |
| `reinsurance.spec.ts` | Login → reinsurance | Reinsurance dashboard |
| `reinsurance-contracts.spec.ts` | Login → reinsurance/contracts | Contract list |
| `reporting.spec.ts` | Login → reporting | Reports |
| `sanhab.spec.ts` | Login → sanhab | Sanhab reporting |
| `monitoring.spec.ts` | Login → monitoring | System monitoring |
| `dlq.spec.ts` | Login → dlq | Dead letter queue |
| `work-items.spec.ts` | Login → work-items | Work item queue |
| `insurer-operations.spec.ts` | Login → insurer-operations | Operations dashboard |
| `loss-adjuster.spec.ts` | Login → loss-adjuster | Loss adjuster assignments |
| `ai-governance.spec.ts` | Login → ai-governance | AI governance dashboard |
| `admin-audit-log.spec.ts` | Login → admin/audit-log | Audit log entries |
| `admin-executive-bi.spec.ts` | Login → admin/executive-bi | BI dashboard |
| `admin-feature-flags.spec.ts` | Login → admin/feature-flags | Feature flag list, toggle |
| `admin-jobs.spec.ts` | Login → admin/jobs | Job list |
| `admin-organization-settings.spec.ts` | Login → admin/organization-settings | Settings form |
| `admin-tracing.spec.ts` | Login → admin/tracing | Trace viewer |
| `admin-users.spec.ts` | Login → admin/users | User management |
| `logout.spec.ts` | Login → logout | Logout flow |
| `forbidden.spec.ts` | Login → navigate to forbidden page | 403 page |
| `error-states.spec.ts` | Login → stop backend → navigate | Error handling |
| `rtl-layout.spec.ts` | Login → all pages | RTL correct |
| `mobile-responsive.spec.ts` | Login → 768px | Tablet layout |

#### B3.3.5 Channel Workspace E2E

| Test | Steps | Assertions |
|------|-------|------------|
| `overview.spec.ts` | Login → overview tab | Workspace cards |
| `offerings.spec.ts` | Login → offerings tab | Offerings table |
| `submissions.spec.ts` | Login → submissions tab | Submissions table, new button |
| `commissions.spec.ts` | Login → commissions tab | Commissions table |
| `customers.spec.ts` | Login → customers tab | Customers table |
| `dashboard.spec.ts` | Login → dashboard tab | Dashboard stat cards |
| `sub-agents.spec.ts` | Login → sub-agents tab → create | Sub-agent list, create modal, form |
| `partners.spec.ts` | Login → partners tab → create | Partner list, create modal, form |
| `broker-dashboard.spec.ts` | Login → /broker → dashboard | Broker dashboard |
| `broker-agreements.spec.ts` | Login → /broker → agreements | Agreements table |
| `broker-placements.spec.ts` | Login → /broker → placements | Placements table |
| `broker-settlements.spec.ts` | Login → /broker → settlements | Settlements table |
| `broker-claims.spec.ts` | Login → /broker → claims | Claims table |
| `broker-contracts.spec.ts` | Login → /broker → contracts | Contracts table |
| `broker-sub-agents.spec.ts` | Login → /broker → sub-agents | Sub-agent management |
| `broker-partners.spec.ts` | Login → /broker → partners | Partner management |
| `tab-switching.spec.ts` | Login → click each tab | Data loads per tab, no stale state |
| `rtl-layout.spec.ts` | Login → all tabs | RTL correct |
| `mobile-responsive.spec.ts` | Login → 375px | Responsive layout |

#### B3.3.6 Cross-App E2E

| Test | Steps | Assertions |
|------|-------|------------|
| `auth-flow.spec.ts` | Login to each app with correct credentials | Each app authenticates correctly |
| `auth-isolation.spec.ts` | Login to app A, navigate to app B | App B requires its own auth |
| `brand-switching.spec.ts` | Switch brand config in channel-workspace | Theme/colors update correctly |

### B3.4 Accessibility Tests (axe-core + Playwright)

**Scope:** Every page in every app must pass WCAG 2.1 AA  
**Tool:** `@axe-core/playwright` for automated checks + manual verification  
**No mocks:** Real pages in real browser

#### Automated A11y Tests (per app)

For each app, one `a11y.spec.ts` file that:
1. Logs in
2. Navigates to every page
3. Runs `axe-core` analysis
4. Asserts zero violations for:
   - `critical` severity
   - `serious` severity
   - WCAG 2.1 AA rules
5. Reports all violations (including minor) for tracking

#### A11y Rules to Verify

| Rule | Description |
|------|-------------|
| `color-contrast` | Text contrast ≥ 4.5:1 (normal), ≥ 3:1 (large) |
| `aria-label` | All interactive elements have accessible names |
| `keyboard-navigation` | All interactive elements reachable via keyboard |
| `focus-order` | Tab order follows visual order |
| `focus-indicator` | Visible focus indicator on all interactive elements |
| `heading-order` | Headings nested correctly (h1 → h2 → h3) |
| `landmark-regions` | Each page has header, nav, main, footer landmarks |
| `skip-link` | Skip to content link present and functional |
| `form-labels` | All form inputs have associated labels |
| `error-identification` | Form errors are announced to screen reader |
| `page-title` | Each page has a unique, descriptive title |
| `language-attribute` | `<html lang="fa" dir="rtl">` set correctly |
| `image-alt` | All images have alt text |
| `table-headers` | Data tables have proper header cells |
| `list-semantics` | Lists use proper ul/ol/li elements |

#### Manual A11y Testing Checklist (per app)

- [ ] Screen reader navigation (NVDA + Chrome on Windows)
- [ ] Keyboard-only navigation (Tab, Shift+Tab, Enter, Space, Escape)
- [ ] Voice control (Windows Voice Access)
- [ ] High contrast mode
- [ ] Zoom to 200% — no loss of functionality
- [ ] Reduced motion preference respected
- [ ] RTL layout correctness — text alignment, icon direction, spacing

### B3.5 Visual Regression Tests (Playwright Screenshots)

**Scope:** Every page in every app has baseline screenshots  
**Tool:** Playwright `toHaveScreenshot()`  
**No mocks:** Real pages with real data

#### Per-App Visual Tests

For each app, one `visual.spec.ts` that:
1. Logs in
2. Navigates to every page
3. Waits for data to load (no loading skeletons)
4. Takes full-page screenshot
5. Compares against baseline
6. Also takes screenshots at:
   - Desktop (1920×1080)
   - Tablet (768×1024)
   - Mobile (375×667)
   - RTL direction

#### Visual Regression Test Matrix

| App | Pages | Desktop | Tablet | Mobile | RTL | Total Screenshots |
|-----|-------|---------|--------|--------|-----|-------------------|
| broker-portal-ui | 8 | 8 | 8 | 8 | 8 | 32 |
| agent-portal-ui | 10 | 10 | 10 | 10 | 10 | 40 |
| customer-portal-ui | 17 | 17 | 17 | 17 | 17 | 68 |
| web-ui | 49 | 49 | 49 | 49 | 49 | 196 |
| channel-workspace-ui | 18 | 18 | 18 | 18 | 18 | 72 |
| design-system | 35 | 35 | N/A | N/A | 35 | 70 |
| **Total** | **137** | **137** | **102** | **102** | **137** | **478** |

### B3.6 Performance Tests (Lighthouse CI)

**Scope:** Each app's key pages meet performance budgets  
**Tool:** `@lhci/cli` + Playwright  
**No mocks:** Real frontend + real backend

#### Performance Budgets (per `92_quality_gates.md`)

| Metric | Target | Requirement |
|--------|--------|-------------|
| Performance | ≥ 85 | Blocking |
| Accessibility | ≥ 95 | Blocking |
| Best Practices | ≥ 90 | Warning |
| SEO | ≥ 90 | Warning |
| LCP (Largest Contentful Paint) | < 2.5s | Blocking |
| FID (First Input Delay) | < 100ms | Blocking |
| CLS (Cumulative Layout Shift) | < 0.1 | Blocking |
| FCP (First Contentful Paint) | < 1.8s | Warning |
| TBT (Total Blocking Time) | < 200ms | Warning |
| Bundle Size (JS) | < 250KB gzip | Blocking |

#### Lighthouse Test Pages

| App | Pages to Audit |
|-----|----------------|
| broker-portal-ui | Login, Dashboard, Claims, Policies |
| agent-portal-ui | Login, Dashboard, Policies, Commissions |
| customer-portal-ui | Login, Dashboard, Policies, FNOL, Payments |
| web-ui | Login, Claims, Policies, Underwriting, Dashboard |
| channel-workspace-ui | Overview, Dashboard, Broker Dashboard |

### B3.7 Security Tests (Frontend)

**Scope:** Frontend security vulnerabilities  
**No mocks:** Real app in real browser

| Test | Description |
|------|-------------|
| XSS Prevention | No `dangerouslySetInnerHTML` without sanitization; no inline event handlers |
| CSRF Protection | All state-changing requests include CSRF token or use SameSite cookies |
| Auth Token Storage | Tokens not in localStorage (use httpOnly cookies) |
| Content Security Policy | CSP headers present and correct |
| HTTPS Enforcement | Production apps redirect HTTP to HTTPS |
| Dependency Scan | `npm audit` — no high/critical vulnerabilities |
| Sensitive Data Exposure | No PII in URL params, no secrets in client code |
| Clickjacking | `X-Frame-Options: DENY` or `frame-ancestors` CSP |

## B4. Quality Gates (CI Pipeline)

Every Pull Request must pass ALL gates before merge:

| Gate | Tool | Threshold | Blocking? |
|------|------|-----------|-----------|
| TypeCheck | `tsc --noEmit` | 0 errors | ✅ |
| Lint | `eslint` | 0 errors | ✅ |
| Unit Tests | Vitest | ≥80% coverage, 0 failures | ✅ |
| Component Tests | Vitest + RTL | 0 failures | ✅ |
| A11y Tests | axe-core | 0 critical/serious violations | ✅ |
| E2E Smoke | Playwright | All smoke tests pass | ✅ |
| Lighthouse | LHCI | Perf ≥85, A11y ≥95 | ✅ |
| Visual Regression | Playwright | No unintended changes | ✅ (reviewable) |
| Bundle Size | size-limit | Within budget | ✅ |
| Security | npm audit | 0 high/critical | ✅ |

## B5. Test Execution Strategy

### B5.1 Local Development

```bash
# Run all unit + component tests
npx vitest run

# Run E2E tests (requires all services running)
npx playwright test

# Run a11y tests
npx playwright test --grep "a11y"

# Run visual regression
npx playwright test --grep "visual"

# Run performance tests
npx lhci autorun

# Run everything (CI mode)
npm run test:all
```

### B5.2 CI Pipeline Stages

```
1. Install dependencies
2. TypeCheck (tsc --noEmit)
3. Lint (eslint)
4. Unit + Component Tests (vitest --coverage)
5. Build all frontend apps
6. Start backend services (docker-compose up)
7. Start BFF services
8. Start frontend dev servers
9. E2E Smoke Tests (Playwright — smoke.spec.ts per app)
10. A11y Tests (axe-core)
11. Visual Regression (Playwright screenshots)
12. Lighthouse CI
13. Bundle Size Check
14. Security Audit (npm audit)
15. Cleanup (stop all services)
```

### B5.3 Pre-Release Full Regression

Before any production release:
1. Run **all** E2E tests (not just smoke) across all 3 browsers
2. Run full a11y audit on all pages
3. Run visual regression on all pages at all breakpoints
4. Run Lighthouse on all key pages
5. Run security scan
6. Manual exploratory testing (2 hours minimum per app)

## B6. Test Data Strategy

**No mocks:** All test data comes from real backend services.

### Test Users (real, seeded in database)

| Role | Username | Purpose |
|------|----------|---------|
| Broker Admin | `broker-admin` | Broker portal full access |
| Agent | `agent-user` | Agent portal full access |
| Customer | `customer-user` | Customer portal full access |
| Insurer Ops | `insurer-ops` | Web-ui operations |
| Claims Handler | `claims-handler` | Web-ui claims workbench |
| Underwriter | `underwriter` | Web-ui underwriting |
| Admin | `admin` | Web-ui admin panel |
| Channel Manager | `channel-manager` | Channel workspace |

### Test Data Seeding

- Database seeded via migration scripts with test organizations, tenants, parties, policies, claims, payments
- Kafka topics pre-provisioned
- Redis caches cleared before test runs
- No mock data factories — all data from real database

## B7. Estimated Test Count

| Layer | App | Test Files | Test Cases |
|-------|-----|-----------|------------|
| Unit | broker-portal-ui | 11 | ~60 |
| Unit | agent-portal-ui | 8 | ~45 |
| Unit | customer-portal-ui | 7 | ~40 |
| Unit | web-ui | 49 | ~150 |
| Unit | channel-workspace-ui | 8 | ~40 |
| Unit | design-system | 35 | ~200 |
| Component | All apps | 20 | ~80 |
| E2E | broker-portal-ui | 16 | ~50 |
| E2E | agent-portal-ui | 15 | ~45 |
| E2E | customer-portal-ui | 22 | ~60 |
| E2E | web-ui | 42 | ~120 |
| E2E | channel-workspace-ui | 19 | ~50 |
| E2E | cross-app | 3 | ~10 |
| A11y | All apps | 6 | ~137 pages |
| Visual | All apps | 6 | ~478 screenshots |
| Performance | All apps | 5 | ~20 |
| **Total** | | **~272 files** | **~1485 test cases** |

## B8. Priority Order for Implementation

### Phase 1: Foundation (Week 1-2)
1. Install Playwright, Vitest, @testing-library/react, axe-core
2. Configure Playwright with multi-browser, multi-app support
3. Configure Vitest with jsdom + coverage
4. Create test helpers (auth, RTL, visual)
5. Seed test data in database
6. Write smoke E2E tests (1 per app — login + main page)

### Phase 2: Design System Tests (Week 2-3)
1. Unit tests for all 35+ design-system components
2. Expand existing 5 component tests
3. A11y tests for all components
4. Visual regression baselines for all components

### Phase 3: Per-App E2E (Week 3-6)
1. broker-portal-ui: All 16 E2E tests
2. agent-portal-ui: All 15 E2E tests
3. customer-portal-ui: All 22 E2E tests
4. web-ui: All 42 E2E tests (largest app)
5. channel-workspace-ui: All 19 E2E tests

### Phase 4: A11y + Visual (Week 6-8)
1. axe-core scans for all pages in all apps
2. Visual regression baselines for all pages
3. Manual a11y testing with screen readers

### Phase 5: Performance + Security (Week 8-9)
1. Lighthouse CI for all key pages
2. Bundle size budgets
3. Security scan (npm audit, XSS, CSRF)

### Phase 6: Cross-App + Full Regression (Week 9-10)
1. Cross-app navigation tests
2. Auth isolation tests
3. Brand switching tests
4. Full regression run across all browsers

## B9. Definition of Done

A frontend app is considered **100% tested** when:

- [ ] All unit tests pass with ≥80% coverage
- [ ] All component tests pass
- [ ] All E2E tests pass on Chromium, Firefox, and WebKit
- [ ] Zero critical or serious axe-core violations on any page
- [ ] Visual regression baselines exist for all pages at all breakpoints
- [ ] Lighthouse Performance ≥ 85 and Accessibility ≥ 95 on all key pages
- [ ] Bundle size within budget
- [ ] npm audit shows zero high/critical vulnerabilities
- [ ] Manual a11y testing completed (screen reader + keyboard-only)
- [ ] RTL layout verified on all pages
- [ ] Mobile responsive verified on all pages
- [ ] Error states tested (backend down, network error, invalid data)
- [ ] Loading states tested (skeletons, spinners)
- [ ] All user flows tested end-to-end (login → action → logout)

---

## Appendix A: Design Document Cross-Reference

| Design Doc | Relevant Section | Apps Affected |
|------------|-----------------|---------------|
| `00_INDEX.md` | App list, stack | All |
| `02_design_system_tokens.md` | Token architecture | All (via design-system) |
| `05_component_library.md` | Component specs | design-system, all apps |
| `10_customer_portal_redesign.md` | Customer portal IA, screens | customer-portal-ui |
| `12_agent_portal_redesign.md` | Agent portal IA, workbench | agent-portal-ui |
| `13_back_office_redesign.md` | Back-office workspaces | web-ui |
| `91_tech_stack.md` | Tech stack, testing tools | All |
| `92_quality_gates.md` | Quality gates, testing pyramid | All |
| `BROKERAGE_IMPLEMENTATION_PLAN.md` §9.2 | Portal specifications | All |

## Appendix B: Existing Test Inventory

| File | Type | Status | Notes |
|------|------|--------|-------|
| `tests/e2e/broker-portal-bff.test.ts` | API E2E | ✅ Functional | Tests BFF endpoints, not UI |
| `tests/e2e/agent-portal-flow.test.ts` | API E2E | ✅ Functional | Tests agent-portal-service API |
| `tests/e2e/customer-portal-journeys.test.ts` | Playwright | ❌ Dead file | Playwright not installed, cannot run |
| `tests/e2e/channel-workspace-bff.test.ts` | API E2E | ✅ Functional | Tests BFF endpoints, not UI |
| `packages/design-system/.../*.test.tsx` (5 files) | Component | ⚠️ Basic | Only 5/35+ components, basic assertions |
| `services/customer-portal-ui/test/brand-config.spec.ts` | Unit | ⚠️ Trivial | Tests hardcoded values, not UI |
| Root jest configs (5) | Config | ✅ Backend | All backend-focused, no frontend |
