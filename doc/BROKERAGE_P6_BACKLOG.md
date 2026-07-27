# بکلاگ اجرایی فاز P6 — Regulatory & Reporting

هدف فاز P6 این است که سامانه الزامات نظارتی (Sanhab، unique code، گزارش‌های کارگزاری، گزارش‌های مالی/تجمیعی) را پوشش دهد و داشبورد‌های عملیاتی/اجرایی را در اختیار مدیران قرار دهد. این فاز مستقیماً روی P0 تا P5 بنا شده است.

## اصول کلی P6

- گزارش‌دهی تنها پس از اطمینان از صحت داده (data quality) انجام می‌شود.
- همه گزارش‌ها از ledger، projection و event-driven aggregation می‌آیند.
- Sanhab integration فقط با credential واقعی و در environment مجاز فعال می‌شود.
- unique code هر بیمه‌نامه در policy و projection ثبت می‌شود.
- گزارش‌های TCoR/BI دقیق و auditable هستند.
- همه APIها و eventها در contract repository ثبت می‌شوند.

---

## P6-0 — پیش‌نیازها از P0 تا P5

قبل از شروع P6 موارد زیر باید کامل باشند:

- P0-1 Organization/Tenant/Capability
- P0-2 Party/Identity/Role
- P0-4 Distribution Agreement
- P0-6 ABAC
- P0-7 RLS
- P0-8 Audit Log
- P2-6 Policy Projection
- P3-1 Policy Lifecycle
- P3-5 Ledger Posting
- P4-8 Payment Reports
- P5-1 Claim Refactor
- P5-4 Claim Projection

---

## P6-1 — Sanhab Integration

### P6-1.1 Sanhab Client & Unique Code

**هدف**: اتصال واقعی به سنهاب و دریافت/ثبت کد یکتا بیمه‌نامه.

**فایل‌ها**:
- `services/regulatory-gateway-service/src/sanhab-clients/real-sanhab.client.ts` (تکمیل)
- `services/regulatory-gateway-service/src/sanhab-clients/mock-sanhab.client.ts` (نگهداری)
- `services/regulatory-gateway-service/src/sanhab/sanhab-issuance.service.ts`
- `services/policy-service/src/entities/Policy.ts` (بازبینی unique code)

**موجودیت/فیلد**:

```typescript
interface Policy {
  ...
  uniqueCode?: string;          // کد یکتا سنهاب
  sanhabSubmissionId?: string;
  sanhabStatus: 'not_submitted' | 'pending' | 'confirmed' | 'rejected';
  sanhabResponse?: Record<string, any>;
  ...
}
```

**مهاجرت**:
- `V1860000000__add_sanhab_fields_to_policy.sql`

**معیار پذیرس**:
- در dev/mock mode فراخوان به mock client برود و unique code mock برگردد.
- در prod با WSDL/cert واقعی و rotate API key.
- Sanhab status قبل از policy `active` باید `confirmed` باشد (در صورت الزام قانونی).
- همه فراخوان‌ها log و audit می‌شوند.
- no PII در log Sanhab.

### P6-1.2 API Sanhab

**فایل‌ها**:
- `services/regulatory-gateway-service/src/sanhab/sanhab.controller.ts`

**APIهای پیشنهادی**:

```text
POST /api/v1/policies/{policyId}/sanhab-submit
GET /api/v1/policies/{policyId}/sanhab-status
POST /api/v1/policies/{policyId}/sanhab-retry
GET /api/v1/sanhab/config
```

**معیار پذیرش**:
- `sanhab-submit` فقط توسط `issuerOrganizationId` مجاز.
- retry با idempotency و exponential backoff.
- config فقط `insurer_admin` قابل مشاهده.
- mock/real switch با env var بدون تغییر کد.

**وابستگی**: P3-1.1

---

## P6-2 — Unique Code Management

### P6-2.1 Unique Code Workflow

**هدف**: تضمین یکتایی و صحت کد یکتا در policy و projection.

**فایل‌ها**:
- `services/policy-service/src/unique-code/unique-code.service.ts`
- `services/policy-service/src/unique-code/unique-code-sync.service.ts`

**معیار پذیرش**:
- `uniqueCode` فقط از Sanhab یا منبع authoritative دریافت شود.
- projection نیز `uniqueCode` را نگهداری کند.
- duplicate `uniqueCode` در یک tenant رد شود.
- اگر Sanhab fail شود، policy در status `pending` می‌ماند.

### P6-2.2 Unique Code Reports

**APIهای پیشنهادی**:

```text
GET /api/v1/reports/policies-without-unique-code
GET /api/v1/reports/duplicate-unique-codes
```

**معیار پذیرش**:
- گزارش فقط داده tenant کاربر.
- duplicate در سطح `authoritativeTenantId` تشخیص داده شود.

**وابستگی**: P6-1.1

---

## P6-3 — Broker Transaction Reports

### P6-3.1 موجودیت BrokerTransactionReport

**هدف**: گزارش تراکنش‌های کارگزار برای بیمه مرکزی و داخلی.

**فایل‌ها**:
- `services/reporting-service/src/entities/BrokerTransactionReport.ts`
- `services/reporting-service/src/broker-report/broker-report-generator.ts`

**موجودیت**:

```typescript
interface BrokerTransactionReport {
  reportId: string;
  tenantId: string;
  brokerOrganizationId: string;
  periodId: string;                 // سال/ماه گزارش
  reportType: 'monthly' | 'quarterly' | 'annual';
  status: 'draft' | 'generated' | 'submitted' | 'accepted' | 'rejected';
  generatedAt: Date;
  submittedAt?: Date;
  payload: Record<string, any>;     // aggregate numbers
  fileRef?: string;
}
```

**مهاجرت**:
- `V1860000010__create_broker_transaction_report.sql`

**معیار پذیرس**:
- گزارش از ledger و policy/claim projection aggregate می‌شود.
- همه مبالغ با currency و decimal دقیق.
- گزارش قبل از submit approval داخلی دارد.
- submit به بیمه مرکزی فقط پس از approval.

### P6-3.2 API Broker Reports

**APIهای پیشنهادی**:

```text
POST /api/v1/broker-reports
GET /api/v1/broker-reports
GET /api/v1/broker-reports/{reportId}
POST /api/v1/broker-reports/{reportId}/generate
POST /api/v1/broker-reports/{reportId}/approve
POST /api/v1/broker-reports/{reportId}/submit
```

**معیار پذیرش**:
- generate از آخرین داده‌های پایدار ledger.
- approve توسط `broker_admin` یا `broker_finance`.
- submit به بیمه مرکزی با idempotency.

**وابستگی**: P3-5.1

---

## P6-4 — TCoR Reports

### P6-4.1 Total Cost of Risk

**هدف**: محاسبه TCoR برای سازمان‌های بزرگ (premium + claims + retained risk + risk control costs).

**فایل‌ها**:
- `services/reporting-service/src/tcor/tcor-calculator.ts`
- `services/reporting-service/src/tcor/tcor-report.controller.ts`

**موجودیت**:

```typescript
interface TCoRReport {
  reportId: string;
  tenantId: string;
  customerPartyId: string;
  organizationId: string;
  periodId: string;
  premium: Money;
  claimsPaid: Money;
  outstandingClaims: Money;
  retainedRisk: Money;
  riskControlCosts: Money;
  tcor: Money;
  generatedAt: Date;
}
```

**مهاجرت**:
- `V1860000020__create_tcor_report.sql`

**معیار پذیرس**:
- `tcor = premium + claimsPaid + outstandingClaims + retainedRisk + riskControlCosts`.
- داده از ledger، policy و claim projection.
- گزارش قابل drill-down به policy/lineOfBusiness.
- فقط `customer` یا `broker` مرتبط به party/organization دسترسی دارد.

### P6-4.2 TCoR API

**APIهای پیشنهادی**:

```text
POST /api/v1/tcor/generate
GET /api/v1/tcor/reports
GET /api/v1/tcor/reports/{reportId}
GET /api/v1/tcor/reports/{reportId}/drilldown?by=policy
```

**وابستگی**: P3-5.1، P5-1.1

---

## P6-5 — Executive BI Dashboards

### P6-5.1 BI Aggregate Service

**هدف**: تهیه aggregate برای داشبورد مدیران.

**فایل‌ها**:
- `services/reporting-service/src/bi/bi-aggregate.service.ts`
- `services/reporting-service/src/bi/bi.controller.ts`

**metrics**:

```text
Written premium by line of business / carrier / broker / channel
Policy count and retention rate
Claim frequency and severity
Loss ratio and combined ratio
Commission accrual vs paid
Settlement outstanding
Customer NPS / complaint count
```

**معیار پذیرس**:
- aggregate از materialized views یا event-sourced projection.
- داده با tenant/organization isolation.
- refresh schedule قابل پیکربندی.
- هیچ PII در aggregate.

### P6-5.2 Executive Dashboard API

**APIهای پیشنهادی**:

```text
GET /api/v1/bi/executive-summary?period=...
GET /api/v1/bi/underwriting-performance?period=...
GET /api/v1/bi/claims-performance?period=...
GET /api/v1/bi/financial-summary?period=...
```

**معیار پذیرس**:
- هر metric با `organizationId` scope.
- تغییرات نسبت به دوره قبل.
- export به Excel/PDF.

**وابستگی**: P6-3.1

---

## P6-6 — Data Quality & Validation

### P6-6.1 Data Quality Rules

**هدف**: اطمینان از صحت داده‌های گزارشی.

**فایل‌ها**:
- `services/reporting-service/src/data-quality/quality-rule.service.ts`
- `services/reporting-service/src/data-quality/quality-check.service.ts`

**rules**:

```text
- هر policy دارای uniqueCode یا دلیل معتبر نداشتن باشد
- جمع premium در policy با journal entry برابر باشد
- هر claim دارای policyId معتبر و claimantPartyId باشد
- هیچ payment بدون sourceId و idempotencyKey نباشد
- duplicate nationalId blind index در یک tenant بررسی شود
```

**معیار پذیرس**:
- quality check قبل از generate report اجرا شود.
- هر violation در `data_quality_issue` table ثبت شود.
- report فقط در صورت `critical violations = 0` submit می‌شود.

### P6-6.2 Reconciliation Jobs

**فایل‌ها**:
- `services/reporting-service/src/reconciliation/policy-ledger-reconciliation.ts`
- `services/reporting-service/src/reconciliation/payment-ledger-reconciliation.ts`

**معیار پذیرس**:
- reconcile policy premium totals با ledger.
- reconcile claim paid amounts با payment-service.
- discrepancy alert و ticket.

**وابستگی**: P3-5.1

---

## P6-7 — Audit & Compliance Reports

### P6-7.1 Audit Report Generator

**هدف**: گزارش‌های audit log برای compliance.

**فایل‌ها**:
- `services/audit-service/src/audit-report.service.ts` (جدید)
- `services/audit-service/src/audit-report.controller.ts`

**APIهای پیشنهادی**:

```text
GET /api/v1/audit/reports/access-log?from=...&to=...
GET /api/v1/audit/reports/data-modifications?resourceType=Policy&from=...
GET /api/v1/audit/reports/consent-log?partyId=...
```

**معیار پذیرس**:
- گزارش از Elasticsearch/Loki یا audit DB.
- PII mask در گزارش‌های export.
- tamper-evident signature برای log integrity.

**وابستگی**: P0-8.1

---

## P6-8 — Event‌ها و Contract

### P6-8.1 Eventهای P6

**eventهای پیشنهادی**:

```text
SanhabSubmissionSent.v1
SanhabConfirmationReceived.v1
UniqueCodeAssigned.v1
BrokerReportGenerated.v1
BrokerReportSubmitted.v1
TCoRReportGenerated.v1
BIAggregateRefreshed.v1
DataQualityIssueFound.v1
ReconciliationDiscrepancyDetected.v1
```

**معیار پذیرس**:
- همه eventها در AsyncAPI ثبت شوند.
- producer/consumer contract tests pass شوند.
- Outbox pattern.

### P6-8.2 OpenAPI

**فایل‌ها**:
- `D:\CascadeProjects\ecosystem\contracts\openapi\regulatory-gateway-service\openapi.yaml`
- `D:\CascadeProjects\ecosystem\contracts\openapi\reporting-service\openapi.yaml`
- `D:\CascadeProjects\ecosystem\contracts\asyncapi\regulatory\asyncapi.yaml`

**وابستگی**: P5-8.2

---

## P6-9 — تست‌ها

### P6-9.1 Unit/Integration Tests

**فایل‌ها**:
- `services/regulatory-gateway-service/test/sanhab.client.spec.ts`
- `services/reporting-service/test/broker-report.spec.ts`
- `services/reporting-service/test/tcor.spec.ts`
- `services/reporting-service/test/data-quality.spec.ts`

**تست‌های الزامی**:

- Sanhab mock/real switch.
- unique code assignment و duplicate detection.
- broker report aggregate با decimal دقیق.
- TCoR calculation.
- data quality violations.
- reconciliation discrepancy.

### P6-9.2 E2E Tests

**فایل‌ها**:
- `e2e/regulatory-reporting.spec.ts`

**سناریوها**:

- policy issued → Sanhab submit → unique code → broker report generate → submit.
- claim paid → TCoR update.
- data quality violation prevents report submission.

**وابستگی**: P6-6.1

---

## P6-10 — Migration

### P6-10.1 Backfill Reports & Sanhab

**اقدامات**:
- backfill `uniqueCode` برای policyهای تاریخی (اگر موجود).
- تولید `BrokerTransactionReport` اولیه از تاریخچه.
- backfill `TCoRReport` به‌صورت batch.
- اجرای data quality check اولیه.

### P6-10.2 Reconciliation

**معیار پذیرس**:
- تعداد policyهای با uniqueCode با Sanhab reconcile.
- aggregate broker report با ledger برابر است.
- رکوردهای مبهم در `migration_quarantine` قرار گیرند.

**وابستگی**: P5-10.2

---

## نقشه زمانی P6

```text
Week 1:
  P6-1.1, P6-1.2 (Sanhab Integration)
  P6-2.1, P6-2.2 (Unique Code Management)

Week 2:
  P6-3.1, P6-3.2 (Broker Transaction Reports)
  P6-4.1, P6-4.2 (TCoR Reports)

Week 3:
  P6-5.1, P6-5.2 (Executive BI Dashboards)
  P6-6.1, P6-6.2 (Data Quality & Reconciliation)
  P6-7.1 (Audit Reports)

Week 4:
  P6-8.1, P6-8.2 (Event & Contract)
  P6-9.1, P6-9.2 (Tests)
  P6-10.1, P6-10.2 (Migration)
  Bug fixing, compliance review, demo
```

---

## معیارهای خروج P6

P6 کامل است اگر و فقط اگر:

- Sanhab integration واقعی با WSDL/cert/API key قابل اجرا باشد.
- کد یکتا برای بیمه‌نامه‌ها دریافت و ثبت شود.
- گزارش‌های کارگزاری قابل تولید، approval و submit باشند.
- TCoR با drill-down دقیق محاسبه شود.
- داشبورد‌های BI با aggregate و tenant isolation کار کنند.
- data quality rules و reconciliation jobs اجرا شوند.
- گزارش‌های audit/compliance قابل استخراج باشند.
- تست‌های E2E برای Sanhab/unique code/report submission pass شوند.
- OpenAPI/AsyncAPI برای API/eventهای جدید ثبت شده باشد.
- migration با reconciliation موفق انجام شده باشد.

---

## اصلاحات و تکمیلی پس از تطبیق با BROKERAGE_IMPLEMENTATION_PLAN.md

### P6-11 — Broker License Validation

**هدف**: بررسی اعتبار مجوز کارگزار قبل از صدور بیمه‌نامه و گزارش‌دهی.

**فایل‌ها**:
- `services/regulatory-gateway-service/src/license/broker-license-validation.service.ts`
- `services/regulatory-gateway-service/src/license/license-verification.client.ts`

**اقدامات**:
- validate `BrokerLicense` active، `expiryDate` و `scope` lineOfBusiness.
- reject صدور بیمه‌نامه در صورت مجوز منقضی/غیرمجاز.
- audit log برای هر validation.

**معیار پذیرس**:
- تست منفی: صدور بیمه‌نامه با مجوز منقضی rejected می‌شود.
- تست: مجوز خارج از scope رشته reject می‌شود.

### P6-12 — Regulatory Reports per Issuer + Broker

**هدف**: گزارش‌های نظارتی برای بیمه مرکزی به تفکیک `issuerOrganizationId` و `brokerOrganizationId`.

**فایل‌ها**:
- `services/reporting-service/src/regulatory/carrier-broker-report.service.ts`
- `services/reporting-service/src/regulatory/regulatory-report.controller.ts`

**اقدامات**:
- گزارش تراکنش‌های کارگزاری و صدور بیمه‌نامه per `(issuer, broker, period)`.
- امکان export XML/PDF مطابق فرمت بیمه مرکزی.

**معیار پذیرس**:
- aggregate با decimal دقیق و با ledger reconcile.
- submit با idempotency و tamper-evident signature.

### P6-13 — AML / Fraud Regulatory Integration

**هدف**: ادغام `fraud-service`/`aml-service` با گزارش‌دهی نظارتی.

**فایل‌ها**:
- `services/fraud-service/src/aml-report.service.ts`
- `services/reporting-service/src/regulatory/aml-report.controller.ts`

**اقدامات**:
- گزارش‌دهی تراکنش‌های پرریسک به بیمه مرکزی/سایر نهادهای نظارتی.
- alert و case management برای suspicious patterns.

### P6-14 — Observability & Settlement Reconciliation Dashboard

**هدف**: dashboard observability برای تسویه و reconciliation.

**فایل‌ها**:
- `services/reporting-service/src/bi/settlement-reconciliation-dashboard.service.ts`
- `grafana/dashboards/settlement-reconciliation.json`

**معیار پذیرس**:
- نمایش real-time settlement status، discrepancies و payment lag.
- alert در صورت divergence بین ledger و payment-service.

### P6-15 — Data Retention & Archival

**هدف**: سیاست نگهداری داده مطابق بخش ۱۲ سند طراحی.

**اقدامات**:
- archive audit logs و eventها پس از دوره تعیین‌شده.
- PII purge بر اساس policy retention.

---

## نکات اجرایی

- Sanhab credential در Vault نگهداری شود؛ هیچ secret در repo نباشد.
- unique code فقط از Sanhab یا منبع authoritative باید گرفته شود.
- گزارش‌ها باید قبل از submit از data quality check عبور کنند.
- aggregate BI نباید PII داشته باشد.
- broker transaction report باید با ledger و policy projection reconcile شود.
- tamper-evident logging برای compliance ضروری است.
- Sanhab mock در dev فعال باشد تا توسعه‌دهندگان بدون نیاز به شبکه واقعی تست کنند.

این بکلاگ مستقیماً از `BROKERAGE_IMPLEMENTATION_PLAN.md` مشتق شده و آماده پیاده‌سازی فاز Regulatory & Reporting است.
