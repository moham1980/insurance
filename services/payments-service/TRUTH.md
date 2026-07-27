# Payments Service — Capability Truth Registry

This document records the runtime truth of payments capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Payment Intent Orchestration | **REAL** | `preparePayment` with idempotency + outbox event | None | Production-ready
| Finance Approval Workflow | **REAL** | `approvePayment` with status transition + outbox | Needs SoD enforcement (same user cannot prepare + approve) | P1
| Payment Execution | **REAL** | `executePayment` with gateway provider selection | Gateway URL is sandbox/example only | P0
| Gateway Callback Handling | **REAL** | `handleGatewayCallback` for success/failed/pending | Needs real PSP signature verification | P0
| Outbox Integration | **REAL** | `OutboxPublisher` for all state transitions | None | Production-ready
| Currency Default | **REAL** | Defaults to `IRR` (Iranian Rial) | None | Iran-ready
| Idempotency | **REAL** | `idempotencyKey` deduplication in `preparePayment` | None | Production-ready
| Partial Payments | **REAL** | `isPartial`, `partialIndex`, `totalPartialCount` | None | Production-ready
| PSP Real Integration | **REAL** | `IranPspProvider` with initiate, HMAC verify callback, reconcile, refund | Needs real Iran PSP `PSP_BASE_URL` + merchant credentials | P0
| Reconciliation | **REAL** | `IranPspProvider.reconcile` with date-range and transaction matching | Needs real PSP reconciliation endpoint | P0
| Refund/Dispute | **REAL** | `IranPspProvider.refund` with reason tracking; dispute endpoint in controller | Needs real PSP refund endpoint | P1

## Environment Variable Requirements

```bash
# Payment Gateway (Iran PSP)
GATEWAY_PAYMENT_BASE_URL=https://real-psp-iran.example.com/pay
PSP_MERCHANT_ID=
PSP_API_KEY=
PSP_TERMINAL_ID=
PSP_VERIFY_URL=                     # For callback verification
PSP_CALLBACK_SECRET=                # For HMAC signature verification

# Internal
PAYMENTS_URL=http://localhost:3004
```

## Iran Readiness Notes

- `PSP_BASE_URL` defaults to sandbox if not configured. For Iran production, set `PSP_PROVIDER=iran-psp` and provide real PSP `PSP_BASE_URL`.
- `IranPspProvider` implements HMAC signature verification for callbacks, reconciliation, and refund workflows.
- For Iran deployment, replace with real PSP (e.g., Asan Pardakht, Mellat, Saderat) base URL, merchant ID, API key, and terminal ID.
- Settlement and reconciliation endpoints must be verified against the specific PSP contract.

## Decision Log

- **2024-06-11**: `IranPspProvider` is structurally complete with initiate, HMAC verify callback, reconcile, and refund. Production readiness requires real PSP `PSP_BASE_URL` and merchant credentials.
