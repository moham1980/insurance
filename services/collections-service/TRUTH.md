# Collections Service — Capability Truth Registry

This document records the runtime truth of collections capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Payment Record Creation | **REAL** | `createPayment` with DB persistence | None | Production-ready
| Payment Allocation | **REAL** | `allocatePayment` to policies/installments | None | Production-ready
| Refund Processing | **REAL** | `processRefund` with approval workflow | None | Production-ready
| Receipt Generation | **REAL** | `generateReceipt` with Iran-compliant formatting | None | Production-ready
| Outbox Integration | **REAL** | `OutboxPublisher` for payment events | None | Production-ready
