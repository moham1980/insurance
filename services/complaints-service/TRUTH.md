# Complaints Service — Capability Truth Registry

This document records the runtime truth of complaints capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Complaint Creation | **REAL** | `createComplaint` with DB persistence and outbox events | None | Production-ready
| Status Workflow | **REAL** | `updateStatus` with validation and audit logging | None | Production-ready
| Attachment Management | **REAL** | `addAttachment` with document linking | None | Production-ready
| Mobile OTP Verification | **REAL** | `initiateMobileOtp` and `verifyMobileOtp` with OTP service | None | Production-ready
| Central Insurance Integration | **REAL** | `sendToCentralInsurance` makes real HTTP POST to `CENTRAL_INSURANCE_API_URL` | Needs real `CENTRAL_INSURANCE_API_URL` and `CENTRAL_INSURANCE_API_KEY` | P0
| Auto-Send on Resolution | **REAL** | `autoSendOnResolution` triggers Central Insurance API | None | Production-ready
| Audit Logging | **REAL** | `writeAudit` for all complaint events | None | Production-ready

## Environment Variable Requirements

```bash
CENTRAL_INSURANCE_API_URL=           # Iran Central Insurance complaint submission endpoint
CENTRAL_INSURANCE_API_KEY=           # API key for Central Insurance
```

## Decision Log

- **2026-06-11**: Replaced `simulateCentralInsuranceApiCall` with real `callCentralInsuranceApi` making HTTP POST to configured endpoint.
