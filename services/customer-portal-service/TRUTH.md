# Customer Portal Service — Capability Truth Registry

This document records the runtime truth of customer portal backend capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| OTP Authentication | **REAL** | `initiateOtp` and `verifyOtp` with notification-service integration | None | Production-ready
| Session Management | **REAL** | `validateSession` with JWT and Redis | None | Production-ready
| Policy Proxy | **REAL** | `getPolicies`, `getPolicy` proxies to policy-service with ownership check | None | Production-ready
| Claim Proxy | **REAL** | `getClaims`, `submitFnol` proxies to claims-service with ownership check | None | Production-ready
| Endorsement Proxy | **REAL** | `requestEndorsement` forwards to policy-service with retry | None | Production-ready
| Renewal Proxy | **REAL** | `requestRenewal` forwards to policy-service with retry | None | Production-ready
| Payment Proxy | **REAL** | `getPayments` proxies to collections-service | None | Production-ready
| Complaint Proxy | **REAL** | `submitComplaint` proxies to complaints-service | None | Production-ready
| Document Upload | **REAL** | `uploadDocument` proxies to document-service | None | Production-ready
| Retry Logic | **REAL** | `fetchWithRetry` with exponential backoff | None | Production-ready

## Environment Variable Requirements

```bash
POLICY_SERVICE_URL=                  # e.g., http://policy-service:3003
CLAIMS_SERVICE_URL=                  # e.g., http://claims-service:3004
PAYMENTS_SERVICE_URL=                # e.g., http://payments-service:3005
COMPLAINTS_SERVICE_URL=            # e.g., http://complaints-service:3008
DOCUMENT_SERVICE_URL=                # e.g., http://document-service:3012
NOTIFICATION_SERVICE_URL=            # e.g., http://notification-service:3013
```
