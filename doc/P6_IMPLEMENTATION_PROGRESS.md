# P6 Regulatory & Reporting Implementation Progress

## Executive Summary

This report documents the implementation of **P6 Regulatory & Reporting** backlog items for the insurance brokerage platform. All P6 items have been coded, wired into the respective services, and backed by TypeORM migrations. Where applicable, new AsyncAPI and OpenAPI contracts have been published and new service test stubs created.

## Scope

- **P6-1**: Sanhab integration (real + mock clients, submission, status, retry)
- **P6-2**: Unique code management (authoritative assignment, duplicate detection, sync)
- **P6-3**: Broker transaction reports
- **P6-4**: Total Cost of Risk (TCoR) reports
- **P6-5**: BI aggregate service and executive dashboard API
- **P6-6**: Data quality rules, `DataQualityIssue` entity, reconciliation jobs
- **P6-7**: Audit reports module, service, and controller
- **P6-8/9/10/11-15**: Events, contracts, migrations, tests, license validation, settlement dashboard, retention

## P6-1/2: Sanhab Integration & Unique Code Management

### Policy service (`services/policy-service`)

- **`src/entities/Policy.ts`**
  - Added `sanhabStatus`, `sanhabSubmissionId`, `sanhabResponse` columns.
- **`src/migrations/1860000000000-add-sanhab-fields-to-policy.ts`**
  - Adds the Sanhab columns and index to the `policies` table; updates existing rows to `not_submitted`.
- **`src/policy.service.ts`**
  - `setUniqueCode` extended to enforce a Sanhab quality gate, set `sanhabStatus = 'confirmed'`, publish `PolicyUniqueCodeSet`.
  - New `recordSanhabResult` callback for regulatory gateway.
  - New `sanhabInquiry` / `sanhabSmsInquiry` integrations.
- **`src/policy.controller.ts`**
  - `POST /policies/:policyId/unique-code`
  - `POST /policies/:policyId/sanhab-result`
  - Guards: `JwtAuthGuard`, `PermissionsGuard`; requires `policy:set_unique_code`.
- **`src/unique-code/unique-code.service.ts`**
  - Authoritative `assignUniqueCode` with pessimistic lock and duplicate detection per tenant/authoritative tenant.
  - `findPoliciesWithoutUniqueCode` and `findDuplicateUniqueCodes`.
- **`src/unique-code/unique-code-sync.service.ts`**
  - Synchronizes unique code from `Policy` to `PolicyProjection`.
- **`src/app.module.ts`**
  - Registered `UniqueCodeService` and `UniqueCodeSyncService`.

### Regulatory gateway service (`services/regulatory-gateway-service`)

- **`src/sanhab-clients/sanhab-client.interface.ts`**
  - Added `submitPolicy` and `SanhabSubmissionRequest`/`SanhabSubmissionResponse` types.
- **`src/sanhab-clients/mock-sanhab.client.ts`**
  - `submitPolicy` simulates `OK`, `NOT_FOUND`, `MISMATCH`, `PENDING_SYNC`, `UPSTREAM_ERROR`.
- **`src/sanhab-clients/real-sanhab.client.ts`**
  - `submitPolicy` SOAP call with configurable `SANHAB_SUBMIT_POLICY_METHOD`.
- **`src/sanhab/sanhab-issuance.service.ts`**
  - Orchestrates: fetch policy, mark `pending`, call Sanhab, record `confirmed`/`rejected`, publish outbox events, log failures.
- **`src/sanhab/sanhab.controller.ts`**
  - `POST /api/v1/policies/:policyId/sanhab-submit`
  - `GET /api/v1/policies/:policyId/sanhab-status`
  - `POST /api/v1/policies/:policyId/sanhab-retry`
  - `GET /api/v1/sanhab/config`
- **`src/permissions.ts`**
  - Added `regulatory:submit` and `regulatory:status`.
- **`src/app.module.ts`**
  - Registered `SanhabController` and `SanhabIssuanceService`.

## P6-3: Broker Transaction Reports

- **`services/reporting-service/src/entities/BrokerTransactionReport.ts`**
  - Full report entity: broker, period, premium, claims, commission, technical result, status.
- **`src/migrations/1700000001300-add-broker-issuer-to-rm-policies.ts`**
  - Adds `unique_code`, `broker_organization_id`, `issuer_organization_id` to `rm_policies`.
- **`src/migrations/1700000001400-create-broker-transaction-report.ts`**
  - Creates `broker_transaction_reports` table and indexes.
- **`src/broker-report/broker-report-generator.ts`**
  - Draft, generate, list, get, approve, submit.
  - Aggregates premium from `rm_policies`, claims from `rm_claim_payments`, commission from `rm_sales_network`.
- **`src/broker-report/broker-report.controller.ts`**
  - `POST /reporting/broker-reports`
  - `GET /reporting/broker-reports`
  - `GET /reporting/broker-reports/:reportId`
  - `POST /reporting/broker-reports/:reportId/generate`
  - `POST /reporting/broker-reports/:reportId/approve`
  - `POST /reporting/broker-reports/:reportId/submit`
- **`src/kpi.consumer.ts`** / **`src/entities/RmPolicy.ts`**
  - `RmPolicy` projection now includes broker/issuer/unique code and is updated from policy events.
- `tsconfig.json` updated to `src/**/*` so new modules compile.

## P6-4: TCoR Reports

- **`services/reporting-service/src/entities/TCoRReport.ts`**
- **`src/migrations/1700000001500-create-tcor-report.ts`**
- **`src/tcor-report/tcor-report.calculator.ts`**
  - Calculates total premium, claims, acquisition cost, operating expense, reinsurance cost, total cost of risk, combined/loss/expense ratios.
- **`src/tcor-report/tcor-report.controller.ts`**
  - Full CRUD + generate/approve/submit under `/reporting/tcor-reports`.
- Registered in `app.module.ts` and `data-source.ts`.

## P6-5: BI Aggregate & Executive Dashboard

- **`services/reporting-service/src/bi-aggregate/bi-aggregate.service.ts`**
  - Aggregates policy, claim, fraud, underwriting, sales network, KPI snapshots.
  - `getExecutiveDashboard` and `getCockpit` (revenue/claims/expenses/profit/ratios).
- **`src/bi-aggregate/bi-aggregate.controller.ts`**
  - `GET /reporting/bi/executive`
  - `GET /reporting/bi/cockpit`
- Registered in `app.module.ts`.

## P6-6: Data Quality Rules & Reconciliation

- **`services/reporting-service/src/entities/DataQualityIssue.ts`**
- **`src/migrations/1700000001600-create-data-quality-issues.ts`**
- **`src/data-quality/data-quality.service.ts`**
  - Rules: `unique_code_missing`, `negative_premium`, `broker_org_missing`, `claim_no_policy`, `policy_no_payment`.
  - `runReconciliation` creates deduplicated `DataQualityIssue` rows.
- **`src/data-quality/data-quality.controller.ts`**
  - `POST /reporting/data-quality/reconcile`
  - `GET /reporting/data-quality/issues`
  - `GET /reporting/data-quality/issues/:issueId`
  - `POST /reporting/data-quality/issues/:issueId/resolve`
- Registered in `app.module.ts` and `data-source.ts`.

## P6-7: Audit Reports

- **`services/reporting-service/src/entities/AuditReport.ts`**
- **`src/migrations/1700000001700-create-audit-reports.ts`**
- **`src/audit-report/audit-report.service.ts`**
  - Supports `policy_issuance`, `claim_payments`, `sanhab_submissions`, `permission_usage`.
- **`src/audit-report/audit-report.controller.ts`**
  - `POST /reporting/audit-reports`
  - `GET /reporting/audit-reports`
  - `GET /reporting/audit-reports/:reportId`
  - `POST /reporting/audit-reports/:reportId/generate`
- Registered in `app.module.ts` and `data-source.ts`.

## P6-8/9/10/11-15: Events, Contracts, Migrations, Tests, License Validation, Settlement, Retention

### Events

New event types published through the outbox pattern:

- `insurance.policy.unique_code_set`
- `insurance.policy.sanhab_result_recorded`
- `insurance.regulatory.sanhab.submission_sent`
- `insurance.regulatory.sanhab.confirmation_received`
- `insurance.regulatory.sanhab.submission_failed`
- `insurance.reporting.broker_transaction_report_generated`
- `insurance.reporting.tcor_report_generated`
- `insurance.reporting.data_quality_issue_created`
- `insurance.reporting.audit_report_generated`
- `insurance.reporting.settlement_summary_generated`

### Contracts

- `contracts/asyncapi/brokerage-p6.yaml` — P6 AsyncAPI channels and schemas.
- `contracts/openapi/brokerage-p6.yaml` — P6 REST endpoints and request/response schemas.

### Migrations summary

| Migration | Purpose |
|-----------|---------|
| `1860000000000-add-sanhab-fields-to-policy.ts` | Policy Sanhab fields |
| `1700000001300-add-broker-issuer-to-rm-policies.ts` | RmPolicy broker/issuer/unique code |
| `1700000001400-create-broker-transaction-report.ts` | Broker transaction report table |
| `1700000001500-create-tcor-report.ts` | TCoR report table |
| `1700000001600-create-data-quality-issues.ts` | Data quality issue table |
| `1700000001700-create-audit-reports.ts` | Audit report table |

### Tests

Test spec files created for the new P6 modules (using `bun:test` / Jest patterns already present in the repo):

- `services/policy-service/test/unique-code.service.spec.ts`
- `services/regulatory-gateway-service/test/sanhab-issuance.service.spec.ts`
- `services/reporting-service/test/broker-report-generator.spec.ts`
- `services/reporting-service/test/data-quality.service.spec.ts`

These tests target pure business logic and mock repository/HTTP boundaries. They should be expanded with live integration fixtures once the Docker stack is available.

### License Validation

- `services/regulatory-gateway-service/src/license-validation.service.ts` and `regulatory.controller.ts` already expose `POST /reg/broker-license/validate`; P6-11 considered satisfied.

### Settlement Dashboard

- **`services/reporting-service/src/settlement/settlement-dashboard.service.ts`**
  - Aggregates per-broker and per-period premium, commission, claims, net settlement.
- **`src/settlement/settlement-dashboard.controller.ts`**
  - `GET /reporting/settlement/dashboard`
  - `GET /reporting/settlement/brokers`
- Registered in `app.module.ts`.

### Retention

- **`services/reporting-service/src/retention/report-retention.service.ts`**
  - `applyRetention` removes old rows from `broker_transaction_reports`, `tcor_reports`, `audit_reports`, `data_quality_issues` based on `REPORT_RETENTION_DAYS`.
- **`src/retention/report-retention.controller.ts`**
  - `POST /reporting/retention/apply`
- Registered in `app.module.ts`.

## Configuration & Environment Variables

| Variable | Purpose |
|----------|---------|
| `SANHAB_USE_REAL` | Toggle real vs mock Sanhab client |
| `SANHAB_WSDL_URL`, `SANHAB_API_KEY`, `SANHAB_CERT_PATH` | Real Sanhab SOAP config |
| `SANHAB_SUBMIT_POLICY_METHOD` | SOAP method for `submitPolicy` |
| `POLICY_SERVICE_URL` | Regulatory gateway -> policy service URL |
| `REPORT_RETENTION_DAYS` | Report retention (default 2,555 days) |
| `KAFKA_BROKERS` | Outbox/Kafka delivery |

## Verification Notes

- All new controllers use `JwtAuthGuard`, `PermissionsGuard`, and `TenantGuard`.
- Correlation IDs are propagated through all new endpoints.
- No PII is logged in Sanhab submission paths; only submission and result codes are recorded.
- Pessimistic locking is used in `assignUniqueCode` to guarantee uniqueness per tenant.

## Known Next Steps

1. Run `policy-service` and `reporting-service` migrations against a clean database.
2. Build and run the new test specs; fix any runtime TypeScript/SQL issues.
3. Validate the new reporting endpoints with real `rm_policies` / `rm_claim_payments` projection data.
4. Expand contract tests to cover the new P6 OpenAPI and AsyncAPI definitions.
5. Add `BrokerTransactionReport` / `TCoRReport` status transition event publishing if consumers need them.

## Conclusion

P6 Regulatory & Reporting backlog is fully implemented in code across the policy, regulatory-gateway, and reporting services. All required entities, migrations, services, controllers, events, contracts, and retention rules have been added and wired into the application modules. The next phase is runtime verification and test hardening.
