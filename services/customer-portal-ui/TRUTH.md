# Customer Portal UI — Capability Truth Registry

This document records the runtime truth of customer portal UI capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| OTP Authentication | **REAL** | `initiateOtp` + `verifyOtp` via customer-portal-service | None | Production-ready
| Policy Listing | **REAL** | `policiesApi.list()` via BFF | None | Production-ready
| Policy Detail | **REAL** | `policiesApi.get()` via BFF | None | Production-ready
| Endorsement Request | **REAL** | `policiesApi.endorse()` via BFF to policy-service `/endorse` | None | Production-ready
| Renewal Request | **REAL** | `policiesApi.scheduleRenewal()` via BFF to policy-service `/renew` | None | Production-ready
| FNOL Submission | **REAL** | `claimsApi.submitFnol()` via BFF to claims-service | None | Production-ready
| Payment History | **REAL** | `paymentsApi.list()` via BFF to collections-service | None | Production-ready
| Complaint Submission | **REAL** | `complaintsApi.create()` via BFF to complaints-service | None | Production-ready
| Document Upload | **REAL** | `documentsApi.upload()` via BFF to document-service | None | Production-ready
| Chatbot | **SKELETON** | UI exists but may use mock responses | Needs real chat API endpoint | P1

## Environment Variable Requirements

```bash
NEXT_PUBLIC_API_URL=                 # e.g., http://localhost:3000 (API gateway)
```

## Decision Log

- **2026-06-11**: Replaced simulated success in endorsement page with real `policiesApi.endorse()` call.
- **2026-06-11**: Created renewal page (`/renewal`) with real `policiesApi.scheduleRenewal()` integration.
- **2026-06-11**: Fixed baseURL route mismatch from `/portal` to `/customer-portal` to match API gateway routing.
