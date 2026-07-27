# Policy Service — Capability Truth Registry

This document records the runtime truth of policy capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Policy Issuance | **REAL** | `issuePolicy` with full lifecycle and outbox events | None | Production-ready
| Policy Inquiry | **REAL** | `createInquiry` with Sanhab integration | None | Production-ready
| Endorsement | **REAL** | `endorsePolicy` with validation and change tracking | None | Production-ready
| Renewal | **REAL** | `scheduleRenewal`, `approveRenewal`, `rejectRenewal` with state transitions | None | Production-ready
| Sanhab Integration | **REAL** | `performSanhabInquiry` with real HTTP call | Needs real `SANHAB_BASE_URL` | P0
| Unique Code Assignment | **REAL** | `setUniqueCode` with regulator compliance | None | Production-ready
| Policy Timeline | **REAL** | `getPolicyTimeline` with audit events | None | Production-ready
| Outbox Integration | **REAL** | `OutboxPublisher` for policy lifecycle events | None | Production-ready
| Audit Logging | **REAL** | `auditLogger` for all state changes | None | Production-ready

## Environment Variable Requirements

```bash
SANHAB_BASE_URL=                     # Iran Sanhab inquiry API endpoint
SANHAB_API_KEY=                      # Sanhab API key
```

## Decision Log

- **2024-06-11**: Policy service implements full lifecycle with real Sanhab inquiry integration.
