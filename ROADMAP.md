# Roadmap & Known Gaps (UI & Backend)

## UI Gaps & TODOs

### 1) Claims Detail Page (`/claims/[claimId]`)
- **Missing**: There is no detail page for individual claims. Claims list only shows summary and navigates to a non-existent route.
- **Impact**: Users cannot view claim details, documents, payments, or timeline.
- **Proposed**: Create `claims/[claimId]/page.tsx` with tabs (Overview, Documents, Payments, Timeline, Actions).

### 2) Policy Management UI
- **Missing**: No UI for creating, viewing, or editing policies. Only product catalog exists.
- **Impact**: End-to-end claim-to-policy workflow is incomplete.
- **Proposed**: Add `/policies` page with CRUD and linking to claims.

### 3) Document Management UI
- **Missing**: No UI for uploading, viewing, or managing documents. Document service exists but no front-end.
- **Impact**: Claims, complaints, and KYC workflows cannot attach or view documents.
- **Proposed**: Add `/documents` page with upload, preview, and metadata.

### 4) User & Role Management UI
- **Missing**: No UI for managing users or assigning roles. Currently only script-based test user creation.
- **Impact**: Admins cannot manage permissions via UI.
- **Proposed**: Add `/admin/users` and `/admin/roles` pages.

### 5) Sales Network & Agency UI
- **Missing**: No UI for sales network, agencies, or brokers.
- **Impact**: Business users cannot manage sales channels.
- **Proposed**: Add `/sales` and `/agencies` pages.

### 6) Reinsurance UI
- **Missing**: No UI for reinsurance contracts or bordereaux.
- **Impact**: Reinsurance ops rely on API/exports only.
- **Proposed**: Add `/reinsurance` page with contract and bordereaux management.

### 7) Audit / Activity Log UI
- **Missing**: No UI to view audit trails or activity logs.
- **Impact**: Compliance and debugging are harder.
- **Proposed**: Add `/admin/audit` page.

### 8) Export & Bulk Actions
- **Partial**: Some pages have export (e.g., AML, Reporting), but many lack bulk actions.
- **Impact**: Inefficient bulk operations.
- **Proposed**: Standardize export and bulk select across list pages.

### 9) Real-time Updates
- **Missing**: No WebSocket or SSE for real-time updates (e.g., new alerts, status changes).
- **Impact**: Users must manually refresh to see updates.
- **Proposed**: Add SSE for alerts, claim status, and monitoring.

### 10) Mobile Responsiveness
- **Partial**: Pages are responsive but some forms/drawers may be cramped on mobile.
- **Impact**: Poor mobile UX.
- **Proposed**: Audit and improve mobile layouts.

---

## Backend Gaps & TODOs

### 1) Event Sourcing / Snapshots
- **Partial**: Some services use outbox/event publishing, but no snapshotting for long-running aggregates.
- **Impact**: Read models may be slow for large histories.
- **Proposed**: Add snapshotting for claims, policies, and parties.

### 2) Distributed Tracing
- **Missing**: No correlation ID propagation across services (except some manual logging).
- **Impact**: Hard to trace requests across microservices.
- **Proposed**: Add OpenTelemetry tracing.

### 3) Circuit Breaker / Resilience
- **Missing**: No circuit breaker or retry policies for downstream calls.
- **Impact**: Cascading failures possible.
- **Proposed**: Add resilience policies (e.g., via opossum or similar).

### 4) Idempotency Enforcement
- **Partial**: Some endpoints manually enforce idempotency (e.g., payments), but not standardized.
- **Impact**: Risk of duplicate operations.
- **Proposed**: Add middleware for idempotency keys.

### 5) Background Job Processing
- **Missing**: No durable job queue (e.g., Bull, Agenda). Document AI uses in-memory queue.
- **Impact**: Jobs lost on restart; no retries.
- **Proposed**: Add persistent job queue (BullMQ/Agenda).

### 6) Data Archival / Purging
- **Missing**: No automated archival or purging of old data.
- **Impact**: Database bloat, compliance issues.
- **Proposed**: Add archival jobs and retention policies.

### 7) API Rate Limiting
- **Missing**: No rate limiting on public or internal APIs.
- **Impact**: Abuse risk.
- **Proposed**: Add rate limiting middleware.

### 8) Feature Flag Service Integration
- **Partial**: Feature flag service exists but not used in UI or other services.
- **Impact**: No runtime feature toggling.
- **Proposed**: Integrate feature flags in UI and downstream services.

### 9) Health Checks Deepening
- **Partial**: Basic health endpoints exist but no dependency checks.
- **Impact**: Health checks may report OK even if downstream services are down.
- **Proposed**: Add dependency health checks (DB, Kafka, external APIs).

### 10) Security Hardening
- **Partial**: JWT auth and RBAC exist, but no input validation schemas, CSRF protection, or content security policy.
- **Impact**: Potential security gaps.
- **Proposed**: Add validation schemas, CSRF, CSP, and audit logging.

---

## Integration & Ops Gaps

### 1) CI/CD Pipeline
- **Missing**: No automated CI/CD pipeline.
- **Proposed**: Add GitHub Actions or similar for build/test/deploy.

### 2) Infrastructure as Code
- **Missing**: Docker Compose only; no Terraform/CloudFormation.
- **Proposed**: Add IaC for cloud deployment.

### 3) Monitoring & Alerting
- **Partial**: Basic monitoring page exists but no external alerting.
- **Proposed**: Integrate Prometheus/Grafana and alertmanager.

### 4) Backup & Disaster Recovery
- **Missing**: No automated backups or DR plan.
- **Proposed**: Add scheduled DB backups and restore procedures.

### 5) Load Testing
- ✅ **Implemented**: k6 load testing suite for Claims and Payments APIs
- **Scripts**: `tests/load/claims-api.js`, `tests/load/payments-api.js`
- **Features**: Multi-stage load testing, thresholds, authentication

---

## Prioritization (Suggested)

| Priority | Items |
|----------|-------|
| **None** | All items completed |

---

## Recent UAT Findings (Feb 2026)

### Confirmed Working
- RBAC enforcement across all roles
- All CRUD operations for implemented pages
- Export functionality (AML, Reporting, Product, Collections)
- OTP flow in Complaints
- Idempotency in Payments and Collections
- Archive functionality in Product
- Cross-browser compatibility (Chrome, Firefox, Edge)
- Mobile responsiveness (drawers, forms)
- **Claims Detail Page**: Full implementation with tabs (Overview, Documents, Payments, Timeline)
- **Document Management UI**: Upload, download, preview, and management features
- **Policy Management UI**: Complete policy lifecycle (Quote, Docs, Risk Assessment, Underwriting, Sanhab Inquiry, Quality Gate Override)
- **User/Role Management UI**: Complete user management with CRUD operations, role assignment, and status management
- **Real-time Updates**: SSE implementation with connection status, event subscription, and test interface
- **Background Job Queue**: Job management UI with status tracking, retry, and cancellation
- **Sales/Agency UI**: Partner management with CRUD operations, commission rates, and contract management
- **Reinsurance UI**: Contract management with CRUD operations, retention limits, and broker commission
- **Feature Flag Integration**: Complete flag management with environment-based targeting and role-based rollout
- **Distributed Tracing**: Complete trace viewing with span details, service filtering, and timeline visualization
- **Bulk Actions**: Reusable component for bulk selection and operations with confirmation dialogs
- **Audit Log UI**: Complete audit log viewing with change tracking, user filtering, and detailed change history

### Newly Identified Gaps
- **Underwriting UI**: No UI for underwriting workflows (role exists but no pages)
- **Loss Adjustment UI**: Role exists but only shares Claims UI; no dedicated workflows

### Minor Issues
- None

### Completed High Priority Items
- ✅ **Claims Detail Page**: Fully implemented with tabs for Overview, Documents, Payments, and Timeline
- ✅ **Document Management UI**: Complete with upload, download, preview, and filtering
- ✅ **Policy Management UI**: Comprehensive policy lifecycle management
- ✅ **User/Role Management UI**: Full CRUD operations, role assignment, status management
- ✅ **Real-time Updates**: SSE implementation with connection status and event subscription
- ✅ **Background Job Queue**: Job management UI with status tracking, retry, and cancellation

### Completed Medium Priority Items
- ✅ **Sales/Agency UI**: Partner management with CRUD operations, commission rates, and contract management
- ✅ **Reinsurance UI**: Contract management with CRUD operations, retention limits, and broker commission
- ✅ **Feature Flag Integration**: Complete flag management with environment-based targeting and role-based rollout
- ✅ **Distributed Tracing**: Complete trace viewing with span details, service filtering, and timeline visualization

### Completed Low Priority Items
- ✅ **Bulk Actions**: Reusable component for bulk selection and operations with confirmation dialogs
- ✅ **Audit Log UI**: Complete audit log viewing with change tracking, user filtering, and detailed change history
- ✅ **Loading Indicators**: Reusable LoadingSpinner and LoadingOverlay components added to key pages
- ✅ **Confirmation Dialogs**: Reusable ConfirmDialog component with useConfirmDialog hook for destructive actions
- ✅ **Mobile Responsiveness**: CSS improvements for horizontal scroll on mobile with custom scrollbar styling
- ✅ **CI/CD**: GitHub Actions workflow for automated testing, building, and deployment
- ✅ **IaC**: Kubernetes manifests for PostgreSQL, Kafka, Claims Service, and Web UI with HPA and Ingress
- ✅ **Monitoring Integration**: Prometheus and Grafana deployment with metrics scraping and dashboards
- ✅ **Security Hardening**: Network policies, Pod Security Standards, Secrets management, and security best practices documentation

---

**Notes**
- This roadmap is based on current codebase inspection (Feb 2026).
- Items marked “Missing” are not present at all; “Partial” means some implementation exists but incomplete.
- Priorities can be adjusted based on business needs and resource availability.
