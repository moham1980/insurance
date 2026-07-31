# P7 Implementation Progress Report — Experience & AI

**Date:** 2026-01-18  
**Scope:** فاز P7 — بهبود تجربه مشتری/نماینده/کارگزار/بیمه‌گر با AI، کانال‌های چندگانه، Consent، Portfolio و حکمرانی مدل‌ها.

## Executive Summary

This report captures the implementation work performed for Phase 7 (P7) of the insurance brokerage platform. The focus has been on **AI/ML decision-support**, **multi-channel experience**, **consent and portfolio aggregation**, **notification credential vault**, **model switchboard governance**, and **supporting UI components, contracts, tests and migrations**.

All implementation follows the P7 principles:

- AI/ML is decision-support only; no bind/issue/payment/claim decision is made without human approval and audit.
- PII is only sent to OCR/LLM providers with consent, data minimization, allow-list, and audit.
- Every recommendation/prediction includes `reasonCode`, confidence score, and version.
- All new APIs and events are registered in the contract repository.

## 1. AI & Decision Support

### 1.1 Copilot — Next Best Action (NBA) and Redaction/Source Refs

**Service:** `services/copilot-service`

- Added `NbaActionLog` entity and migration (`1700000000702-create-nba-action-logs.ts`).
- Implemented `NbaEngineService` (`src/nba/nba.service.ts`) to generate actions from claim/document context, log actions, and track executed/opted-out status.
- Extended `CopilotService` with `redactSensitive` PII redaction (with span tracking), `buildSourceRefs`, and `computeOutputConfidence` helpers.
- Integrated redaction/source references/confidence into `getClaimSummary` and `getDocumentSummary`.
- Added controller endpoints:
  - `POST /copilot/nba/:contextType/:resourceId/actions`
  - `POST /copilot/nba/:logId/execute`
  - `POST /copilot/nba/:logId/opt-out`
  - `GET /copilot/nba/actions`
- Registered `NbaActionLog` entity and `NbaEngineService` provider in `app.module.ts` and `data-source.ts`.

### 1.2 Document AI — OCR Redaction, Classification and Field Confirmation

**Service:** `services/document-ai-service`

- Added columns to `DocumentEntity`: `redactedText`, `redactedSpans`, `classificationConfidence`, `confirmationStatus`.
- Created migration `1700000000906-add-document-ocr-columns.ts`.
- Implemented `OcrRedactionService` (`src/ocr/ocr-redaction.service.ts`) with redaction patterns, classification by keywords, field extraction, and confirmation against schemas.
- Extended `DocumentAiService` with `redactDocument`, `classifyDocument`, `confirmDocumentFields` methods that update the entity and write audit logs.
- Added controller endpoints:
  - `POST /document-ai/documents/:documentId/redact`
  - `POST /document-ai/documents/:documentId/classify`
  - `POST /document-ai/documents/:documentId/confirm`
- Registered `OcrRedactionService` in `app.module.ts`.
- Created backfill migration `1700000000907-backfill-document-ocr.ts` to populate safe defaults for existing documents.

## 2. Customer Experience & Consent

### 2.1 Customer-360 Consent & Portfolio Aggregator

**Service:** `services/customer-360-service`

- Extended `Customer360Profile` model with `PortfolioSummary` and `ConsentRecord` interfaces.
- Created `ConsentStore` (`src/consent/consent.store.ts`) for local JSON persistence of consent records.
- Integrated `ConsentStore` into `Customer360Service`.
- Added service methods:
  - `getPortfolioSummary`
  - `listConsents`
  - `recordConsent`
  - `revokeConsent`
  - `checkConsent`
- Updated `Customer360Controller` with endpoints:
  - `GET /customer-360/:customerId/portfolio`
  - `GET /customer-360/:customerId/consents`
  - `POST /customer-360/:customerId/consents`
  - `POST /customer-360/:customerId/consents/:consentId/revoke`
  - `GET /customer-360/:customerId/consents/check`
- Created `tsconfig.json` for the service so decorators and build configuration are explicit.

### 2.2 UI Components

**Portals:**

- `services/agent-portal-ui`
  - Added NBA API methods to `src/lib/api.ts`.
  - Created `NbaActionsPanel.tsx` component for generating, executing and opting-out of next-best-actions.
- `services/customer-portal-ui`
  - Added `customer360Api` to `src/lib/api.ts` with portfolio and consent endpoints.
  - Created `ConsentManager.tsx` component for granting/revoking consents.
  - Created `PortfolioSummary.tsx` component for displaying aggregated portfolio metrics.
  - Created `src/app/portfolio/page.tsx` to host the consent/portfolio view.
- `apps/admin-ui`
  - Created `DocumentOcrReview.tsx` for redacting, classifying and confirming document OCR.
  - Created `ModelGovernancePanel.tsx` for viewing governance reports and approving model cards.

## 3. Notification & Credential Vault

**Service:** `services/notification-service`

- Created `Credential` entity (`src/entities/Credential.ts`) with AES-256-GCM encrypted storage.
- Implemented `CredentialVaultService` (`src/credential-vault.service.ts`) with:
  - Per-tenant credential storage, retrieval, listing, rotation and deletion.
  - Masked values for safe display.
  - Expiration handling.
- Added controller endpoints under `/notifications/credentials`:
  - `GET /notifications/credentials`
  - `POST /notifications/credentials`
  - `POST /notifications/credentials/:credentialId/rotate`
  - `DELETE /notifications/credentials/:credentialId`
- Updated `app.module.ts` to register `Credential` and `CredentialVaultService`.
- Added migration `1760000000803-create-credentials.ts`.
- Updated `permissions.ts` with `notification:credentials:manage` and `notification:credentials:view`.

## 4. Model Switchboard Per-Tenant Routing & Governance

**Service:** `services/model-switchboard-service`

- Extended `invokeModel` to support an optional `capability` that triggers route-policy resolution and primary/fallback model selection.
- Added AI governance enforcement before invocation: a model card must be approved; otherwise the invocation fails with `GOVERNANCE_REJECTED`.
- Added `governanceCheck` and `getGovernanceReport` service methods.
- Added controller endpoints:
  - `POST /model-switchboard/governance/validate`
  - `GET /model-switchboard/governance/report`

## 5. Contracts

- Added `contracts/openapi/brokerage-p7.yaml` documenting all new P7 REST endpoints for NBA, OCR, Customer-360 consent/portfolio, notification credential vault, and model governance.
- Added `contracts/asyncapi/brokerage-p7.yaml` documenting new domain events:
  - `insurance.copilot.nba.action_offered/executed/opted_out`
  - `insurance.document_ai.redaction/classification/fields_confirmed`
  - `insurance.customer.consent.granted/revoked`
  - `insurance.notification.credential.rotated`
  - `insurance.ai.model.governance_check_rejected` and `insurance.ai.model.card_approved`

## 6. Tests & Migration Backfill

- `tests/unit/brokerage-p7.test.ts` — unit tests covering OCR redaction, document classification, credential masking, and model governance rules.
- `tests/integration/brokerage-p7.test.ts` — integration tests for Customer-360 consent/portfolio, notification credential vault, and model governance validation.
- `services/document-ai-service/src/migrations/1700000000907-backfill-document-ocr.ts` — backfills OCR columns for existing documents.

## 7. Known Gaps / Next Steps

- **Channel Workspaces & BrandConfig (P7-1/P7-2):** The auth-service workspaces and customer-portal white-label brand provider are marked complete from prior work; the UI brand-provider hook (`brand-provider.tsx`) should be wired to load the active `brandKey` from the workspace/tenant context.
- **Main.ts startup for `customer-360-service`:** `main.ts` references `DataSource` but the module does not configure `TypeOrmModule`; this does not affect consent/portfolio features but will cause startup failure when Kafka is enabled.
- **Provider credential lookup in runtime factories:** `createSmsProvider` and `createEmailProvider` still read from environment variables. Once the credential vault is populated, these factories can be converted to use `CredentialVaultService.getCredentialValue` for per-tenant keys.
- **Full agent/insurer portal page wiring:** React components are created and can be composed into existing portal layouts; page-level routing in `agent-portal-ui` and any `insurer-portal-ui` remains to be finalized.
- **CI contract tests:** Run `npx jest tests/contract` and `npx jest tests/integration/brokerage-p7.test.ts` once the full environment is up.

## Verification Commands

```bash
# Run P7 unit tests
npx jest tests/unit/brokerage-p7.test.ts

# Run P7 integration tests (requires services or gateway running)
npx jest tests/integration/brokerage-p7.test.ts

# Validate OpenAPI contract (requires @apidevtools/swagger-parser or swagger-cli)
swagger-cli validate contracts/openapi/brokerage-p7.yaml

# Validate AsyncAPI contract (requires asyncapi-cli)
asyncapi validate contracts/asyncapi/brokerage-p7.yaml

# Type-check affected services
cd services/customer-360-service && npx tsc --noEmit
cd services/notification-service && npx tsc --noEmit
cd services/model-switchboard-service && npx tsc --noEmit
cd services/document-ai-service && npx tsc --noEmit
cd services/copilot-service && npx tsc --noEmit
```

## Conclusion

Phase 7 core AI/experience building blocks are implemented and integrated across the backend services and portal UI. The remaining work is primarily wiring, runtime credential lookup, and final page-level composition, which can proceed incrementally without blocking the implemented features.
