# AI Governance Service — Capability Truth Registry

This document records the runtime truth of AI governance capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Model Card Management | **REAL** | `createModelCard` with metadata and lifecycle | None | Production-ready
| Model Inventory | **REAL** | `registerModel` with version tracking | None | Production-ready
| Validation Workflow | **REAL** | `runValidation` calls `MODEL_VALIDATION_URL` for real test scores; falls back to `needs_review` when no endpoint configured | None | Production-ready
| Bias Detection | **REAL** | `detectBias` with metric calculation | None | Production-ready
| Explainability Audit | **REAL** | `logExplainability` with SHAP/LIME tracking | None | Production-ready
| Audit Logging | **REAL** | `auditLogger` for all governance events | None | Production-ready

## Environment Variable Requirements

```bash
MODEL_VALIDATION_URL=                # Optional endpoint for real model validation scores
```

## Decision Log

- **2026-06-12**: Replaced random score generation in `runTest` with real HTTP call to `MODEL_VALIDATION_URL`; falls back to `needs_review` status when no endpoint is configured.
