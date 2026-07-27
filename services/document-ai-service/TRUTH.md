# Document AI Service — Capability Truth Registry

This document records the runtime truth of document AI capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Image Extraction (OCR) | **REAL** | `extractWithFallback` using Google Gemini with DeepSeek/OCR fallback | Needs real `GOOGLE_AI_API_KEY` | P0
| Text Analysis | **REAL** | `analyzeWithFallback` using DeepSeek with Gemini fallback | Needs real `DEEPSEEK_API_KEY` | P0
| Confidence Scoring | **REAL** | `computeConfidence` based on provider success; `parseConfidence` from response | None | Production-ready
| Business Validation | **REAL** | `validateExtractedFields` with document-type rules (invoice, national_id_card, driving_license) | Needs cross-service claim/policy ground-truth lookup | P1
| Work Item Routing | **REAL** | `routeToWorkItem` POSTs to orchestrator for human review | Needs real `ORCHESTRATOR_URL` | P0
| Budget Assertion | **REAL** | Daily usage limit enforcement per provider | None | Production-ready
| Fallback Chain | **REAL** | Gemini → DeepSeek → OCR; honest failure reporting instead of mock data | None | Production-ready
| Outbox Integration | **REAL** | `OutboxPublisher` for `DocumentExtracted` and `DocumentExtractionNeedsReview` events | None | Production-ready

## Environment Variable Requirements

```bash
GOOGLE_AI_API_KEY=                   # For Gemini image extraction
DEEPSEEK_API_KEY=                    # For text analysis
OCR_API_URL=                         # Fallback OCR provider
ORCHESTRATOR_URL=                    # For work-item routing on review
```

## Decision Log

- **2026-06-11**: Removed `mockExtract` fallback; now uses `createFailedExtraction` that reports honest failures.
- **2026-06-11**: Replaced hardcoded `confidence: 0.85` with `computeConfidence` based on provider success.
- **2026-06-11**: Added `validateExtractedFields` with document-type-specific rules (invoice amount, Iranian national ID format, driving license format).
- **2026-06-11**: Added `routeToWorkItem` integration with orchestrator for documents needing review.
