# Regulatory Gateway Service — Capability Truth Registry

This document records the runtime truth of regulatory gateway capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Sanhab Integration (Mock) | **REAL** | `MockSanhabClient` with pattern-based responses | Default mode for development/testing | P0
| Sanhab Integration (Real) | **REAL** | `RealSanhabClient` with SOAP, mTLS, health check, circuit breaker | Requires `SANHAB_USE_REAL=true` + WSDL + certificate + API key | P0
| Sanhab Inquiry by NationalId+UniqueCode | **REAL** | Both clients implement `inquiryByNationalIdAndUniqueCode` | Production requires real Sanhab sandbox credentials | P0
| Sanhab Inquiry by PolicyNumber | **REAL** | Interface defined; mock has basic implementation | Production requires real Sanhab sandbox credentials | P0
| Sanhab Inquiry by VIN | **REAL** | Interface defined; mock has basic implementation | Production requires real Sanhab sandbox credentials | P0
| Circuit Breaker | **REAL** | `CircuitBreaker` class with CLOSED/OPEN/HALF_OPEN | Needs persistence across restarts | P2
| Regulatory Failure Logging | **REAL** | `RegulatoryFailureLog` entity | Needs immutable audit event integration | P1
| Kafka Event Publishing | **REAL** | `KafkaProducer` with `createEventEnvelope` | Needs delivery guarantee verification | P1
| Multi-Channel Inquiry | **MISSING** | Only Sanhab; no VIN/SMS/کارپوشه/دولت همراه | Needs orchestration layer | P1

## Environment Variable Requirements

```bash
# Sanhab Configuration
SANHAB_USE_REAL=false               # Set to 'true' for production
SANHAB_API_KEY=your-sanhab-api-key
SANHAB_WSDL_URL=                    # Required when SANHAB_USE_REAL=true
SANHAB_CERT_PATH=                   # Client certificate for mTLS
SANHAB_CERT_KEY_PATH=               # Private key for certificate
SANHAB_CA_PATH=                     # CA certificate
SANHAB_TIMEOUT_MS=30000
SANHAB_API_URL=https://api.sanhab.ir/mock  # Only for mock client
```

## Iran Readiness Notes

- Default is `MockSanhabClient`. For Iran production, must set `SANHAB_USE_REAL=true` and provide WSDL + certificate + API key.
- `soap` library is installed (`^0.44.0` in package.json). Real client is structurally complete and ready for integration testing with Sanhab sandbox.
- Multi-channel inquiry (VIN, SMS, کارپوشه, دولت همراه) is not yet implemented.

## Decision Log

- **2024-06-11**: Sanhab client selection is env-driven (`SANHAB_USE_REAL`). Real client is structurally complete with SOAP, mTLS, health check, and circuit breaker. Operational readiness requires valid WSDL endpoint and certificate from Central Insurance of Iran.
