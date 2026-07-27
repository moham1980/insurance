# AML Service — Capability Truth Registry

This document records the runtime truth of AML capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| AML Consent Management | **REAL** | `createConsent`, `revokeConsent`, `checkConsent` with DB persistence | None | Production-ready
| AML Rule Engine | **REAL** | `createRule`, `evaluateRule` with configurable thresholds | None | Production-ready
| Alert Generation | **REAL** | `generateAlert` with severity scoring and case linking | None | Production-ready
| Alert Decision Workflow | **REAL** | `makeDecision` with approval chain and comments | None | Production-ready
| External Data Source Sync | **REAL** | `syncExternalDataSource` makes real HTTP POST to configured `endpoint`/sync | Needs real external sanctions/PEP API endpoints | P0
| External Data Source Query | **REAL** | `queryExternalDataSource` makes real HTTP GET to configured `endpoint`/query | Needs real external sanctions/PEP API endpoints | P0
| Official Report Generation | **REAL** | `generateOfficialReport` with regulatory formatting | None | Production-ready
| Audit Logging | **REAL** | All actions logged with `auditLogger` | None | Production-ready

## Environment Variable Requirements

```bash
# External data source endpoints configured per-source in connectionConfig:
#   endpoint: URL of external sanctions/PEP/criminal records API
#   apiKey: Bearer token for external API
```

## Decision Log

- **2026-06-11**: Replaced random data generation in `syncExternalDataSource` with real HTTP call to configured endpoint.
- **2026-06-11**: Replaced fake matching records in `queryExternalDataSource` with real HTTP call to configured endpoint.
