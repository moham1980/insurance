# طراحی Enterprise سامانه خدمات بیمه مبتنی بر هوش مصنوعی (Blueprint اجرایی)

## 0) هدف سند و دامنه
این سند «طراحی قابل پیاده‌سازی» برای یک سامانه Enterprise جهت بهبود عملیات بیمه با کمک AI ارائه می‌کند.

- مدل استقرار: **Single-tenant per insurer (نصب اختصاصی برای هر شرکت)**
- محصول‌سازی: **Config-driven + ماژولار + Feature Flags** (بدون فورک کد)
- دامنه‌های اصلی: صدور، خسارت، وصول/مالی، شبکه فروش، شکایات، ضدتقلب، AML/KYC، اتکایی، گزارش‌دهی/هوش تجاری، یکپارچه‌سازی با سامانه‌های حاکمیتی (مثل سنهاب)
- AI: ترکیب **GenAI + ML کلاسیک + RPA** با Human-in-the-loop و Governance/Model Risk در سطح Enterprise

---

## 1) اصول طراحی (Design Principles)
- جداسازی tenant با مرزبندی محیط/DB/Secrets (هر شرکت یک نصب).
- دامنه‌محور (DDD) و تفکیک Bounded Contextها.
- API-first + Event-driven برای همگرایی با Core بیمه و سامانه‌های بیرونی.
- امنیت پیش‌فرض (Zero Trust)، ثبت‌پذیری و ممیزی‌پذیری (Auditability).
- مشاهده‌پذیری سرتاسری (Logs/Metrics/Traces) با Correlation ID.
- قابلیت تغییر مدل/ارائه‌دهنده مدل (Model Switchboard) و سیاست‌گذاری هزینه/ریسک.
- راهبری داده و مدل از ابتدا (Data/AI Governance by design).

---

## 2) معماری کلان (Enterprise Architecture)

### 2.1 لایه‌ها
- **Presentation Layer**
  - Web App (کارشناسان/مدیران)
  - Admin Console (پیکربندی محصول/Feature flags/IAM)
  - Customer/Agent Portal (در صورت نیاز)
- **Workflow & Case Management Layer**
  - موتور فرایند (BPMN/Workflow) برای صدور/خسارت/شکایت/AML
  - سیستم پرونده (Case) با وضعیت‌ها، SLA، Task Assignment
- **Domain Services Layer (Microservices/Modular Monolith)**
  - سرویس‌های دامنه (Issuance, Claims, Fraud, Complaints, Reinsurance, Sales Network, Finance)
- **AI Services Layer**
  - Document AI (OCR/Extraction)
  - Risk Scoring (ML)
  - GenAI Copilot (Summarization/Q&A/Generation)
  - Feature Store / Model Serving / Guardrails
- **Integration Layer**
  - API Gateway
  - Adapters برای Core Insurance، سنهاب، پرداخت، پیامک/ایمیل، انبارها، دولت همراه/کارپوشه
  - Message Bus (Kafka/Rabbit)
- **Data Layer**
  - OLTP DB per service
  - Data Lake/Lakehouse
  - DWH/BI
  - Vector DB + Knowledge Graph
- **Platform & Ops Layer**
  - IAM/SSO
  - Secrets/KMS
  - Observability
  - CI/CD, IaC

### 2.2 سبک استقرار برای Single-tenant
برای هر شرکت بیمه:
- یک محیط مستقل: `dev/stage/prod` (جدا)
- دیتابیس/Storage جدا
- کلیدهای رمزنگاری و Secrets جدا
- مدل‌ها و تنظیمات (Prompt/Policies) جدا
- امکان اتصال به Core داخلی همان شرکت از طریق VPN/MPLS/Private Link

---

## 2.3) انتخاب معماری: Microservices کامل + Message Bus (گزینه A)

در این گزینه، هر دامنه کلیدی به یک یا چند سرویس مستقل تبدیل می‌شود، داده‌ها **به‌صورت مالکیت‌محور** بین سرویس‌ها تقسیم می‌شوند (Database per Service)، و هماهنگی بین فرایندها عمدتاً با **رویدادها** و الگوهای **Saga/Outbox** انجام می‌گیرد.

### 2.3.1 استانداردهای پایه برای همه سرویس‌ها (Service Baseline)
- هر سرویس:
  - API اختصاصی خودش را دارد (REST/GraphQL برای Queryهای UI، و Command API برای عملیات)
  - دیتابیس اختصاصی خودش را دارد (عدم دسترسی مستقیم سرویس‌ها به DB همدیگر)
  - رویدادهای دامنه را Publish می‌کند (پس از Commit تراکنش)
  - Consumerها را Idempotent پیاده می‌کند
  - Logging/Tracing استاندارد با `correlationId` و `requestId`
- Cross-cuttingها به‌صورت پلتفرمی ارائه می‌شوند:
  - API Gateway, Rate Limit, WAF
  - Service-to-service auth (mTLS) و Policy enforcement
  - Observability, Secrets, Config, Feature Flags

### 2.3.2 فهرست سرویس‌ها و مالکیت داده (Service Catalog & Data Ownership)

این لیست «حداقل سرویس‌های لازم» برای نسخه Enterprise است؛ در عمل می‌توان برخی را در فاز اول ادغام کرد و سپس استخراج نمود، اما **هدف گزینه A تفکیک کامل** است.

| سرویس | مالک داده | APIهای اصلی (نمونه) | رویدادهای اصلی (نمونه) |
|---|---|---|---|
| **Identity & Access Service** | کاربران/نقش‌ها/سیاست‌ها | `POST /users`, `POST /roles` | `UserProvisioned`, `RoleChanged` |
| **Party Service** | Party/Contact/KYC Status | `POST /parties`, `POST /parties/{id}/kyc` | `PartyCreated`, `KycStatusChanged` |
| **Product Service** | Product/Coverage/Rules | `POST /products`, `POST /pricing/rules` | `ProductPublished`, `PricingRuleChanged` |
| **Policy Service** | Policy/Endorsement | `POST /policies/quote`, `POST /policies/{id}/issue` | `PolicyQuoted`, `PolicyIssued`, `PolicyCancelled` |
| **Underwriting Service** | UW Decisions/Workitems | `POST /uw/evaluate`, `POST /uw/approve` | `UwDecisionMade`, `UwWorkItemCreated` |
| **Claims Service** | Claim/Reserve/Payments (سطح دامنه خسارت) | `POST /claims`, `POST /claims/{id}/evaluate` | `ClaimRegistered`, `ClaimAssessed`, `ClaimApproved` |
| **Payments Service** | پرداخت‌ها/تراکنش‌های پرداخت | `POST /payments`, `POST /payments/{id}/settle` | `PaymentInitiated`, `PaymentSettled`, `PaymentFailed` |
| **Collections Service** | وصول/اقساط/بدهی | `POST /collections/installments` | `InstallmentCreated`, `InstallmentPaid` |
| **Fraud Service** | FraudCase/Signals | `POST /fraud/score`, `POST /fraud/cases` | `FraudScoreComputed`, `FraudCaseOpened`, `FraudCaseEscalated` |
| **AML Service** | AML Alerts/Investigations | `POST /aml/screen`, `POST /aml/alerts` | `AmlAlertRaised`, `AmlCaseClosed` |
| **Complaints Service** | Complaint/SLA/Resolution | `POST /complaints`, `POST /complaints/{id}/resolve` | `ComplaintCreated`, `ComplaintRouted`, `ComplaintResolved` |
| **Reinsurance Service** | Contracts/Borderaux/Recoveries | `POST /ri/contracts`, `POST /ri/borderaux` | `CededCalculated`, `BorderauxGenerated`, `RecoveryIdentified` |
| **Document Service** | Document metadata/storage refs | `POST /documents`, `GET /documents/{id}` | `DocumentUploaded`, `DocumentLinked` |
| **Document-AI Service** | Extraction jobs/results | `POST /ai/document/extract` | `DocumentExtracted`, `ExtractionFailed` |
| **GenAI Copilot Service** | جلسات/پاسخ‌ها/Policy enforcement | `POST /ai/copilot/answer` | `CopilotResponseGenerated` |
| **Reporting Service** | KPI snapshots/report jobs | `POST /reports/run` | `ReportGenerated` |
| **Regulatory Gateway Service** | تعامل با سنهاب/رگولاتور | `POST /reg/sanhab/*` | `RegulatoryRequestSent`, `RegulatoryResponseReceived` |
| **Workflow/Case Orchestrator** | Saga state / orchestration | `POST /workflows/start` | `ProcessStarted`, `ProcessStepCompleted`, `ProcessFailed` |

نکته مهم: سرویس‌های AI (Document-AI/GenAI) **مالک سیستم رکورد (System of Record)** برای Policy/Claim نیستند و فقط «Job/Inference Result» را مالک می‌شوند.

### 2.3.3 Message Bus: توپولوژی Topicها و قرارداد پیام

**پیشنهاد Topic Naming:**
- `insurance.<domain>.<event>`

**Topicهای نمونه:**
- `insurance.policy.issued`
- `insurance.claim.registered`
- `insurance.claim.assessed`
- `insurance.fraud.score_computed`
- `insurance.complaint.created`
- `insurance.ri.ceded_calculated`

**Envelope استاندارد رویداد (Schema Guidance):**
- `eventId`
- `eventType`
- `eventVersion`
- `occurredAt`
- `producer`
- `correlationId`
- `subject` (مثل `policyId` یا `claimId`)
- `payload`

### 2.3.4 الگوهای سازگاری داده و هماهنگی فرایندها

#### Outbox Pattern (الزامی)
- هر سرویس پس از Commit تراکنش، رویداد را در جدول Outbox ثبت می‌کند.
- یک Publisher جداگانه Outbox را به Message Bus ارسال می‌کند.
- نتیجه: جلوگیری از Dual-write و افزایش قابلیت اطمینان.

#### Saga Pattern (برای فرایندهای چندسرویسی)
- برای فرایندهای E2E مثل صدور/خسارت/AML، از Saga استفاده می‌شود.
- سبک ترجیحی:
  - **Choreography** برای مراحل ساده (با رویدادها)
  - **Orchestration** برای مراحل حساس و دارای SLA/مسیرهای پیچیده (در Orchestrator)

#### Idempotency (الزامی)
- همه Consumerها باید بر اساس `eventId` یا `dedupKey` تکرار پیام را مدیریت کنند.
- Command APIهای حساس باید کلید Idempotency (مثلاً `Idempotency-Key`) داشته باشند.

#### نسخه‌بندی Schema (Schema Versioning)
- رویدادها باید `eventVersion` داشته باشند.
- تغییرات ناسازگار (breaking) با انتشار نسخه جدید event type یا version مدیریت شود.

### 2.3.5 Queryهای بین‌سرویسی و Read Model
- برای UIهای عملیاتی، از الگوی **CQRS/Read Model** استفاده می‌شود:
  - سرویس Reporting یا یک BFF، Read Modelهای لازم را با Subscribe به رویدادها می‌سازد.
  - Query مستقیم چند سرویس در مسیر UI تا حد امکان ممنوع/محدود شود.

### 2.3.6 الزامات پلتفرمی برای گزینه A
- **API Gateway**: AuthN/AuthZ, Rate Limit, WAF, Routing
- **Service Mesh (اختیاری اما توصیه‌شده)**: mTLS, Traffic policy, Retries, Circuit breakers
- **Observability Stack**: Centralized logs, metrics, traces + Alerting
- **Config/Secrets/Feature Flags**: سرویس مرکزی یا ابزار استاندارد
- **CI/CD**: Build/Scan/Test/Deploy per service
- **Artifact & Container Registry**: کنترل نسخه و امضای آرتیفکت‌ها

---

## 2.4) Event Catalog (اجرایی) برای 5 دامنه حیاتی

این کاتالوگ قرارداد رویدادها را برای پیاده‌سازی Message Bus استاندارد می‌کند.

### 2.4.1 قواعد مشترک برای همه رویدادها

**Envelope ثابت (در همه رویدادها):**
- `eventId` (string, uuid, required)
- `eventType` (string, required)
- `eventVersion` (int, required)
- `occurredAt` (string, ISO-8601, required)
- `producer` (string, required)
- `correlationId` (string, required)
- `subject` (object, required)
- `payload` (object, required)

**قواعد کلیدی:**
- Producer موظف است رویداد را با Outbox منتشر کند.
- Consumerها باید Idempotent باشند (Dedup بر اساس `eventId`).
- `subject` باید حداقل یک شناسه اصلی دامنه را داشته باشد (مثل `policyId` یا `claimId`).
- در Payload، داده‌های PII باید تا حد امکان حذف/ماسک شود؛ در صورت نیاز عملیاتی، با `piiTags[]` علامت‌گذاری گردد.

---

## 2.4.2 Domain: Policy (Policy Service)

### رویداد: PolicyQuoted
- **Topic:** `insurance.policy.quoted`
- **Producer:** Policy Service
- **Consumers (نمونه):** Underwriting Service (ایجاد Work Item)، Reporting Service (KPI)، Regulatory Gateway Service (در صورت نیاز به پیش‌ثبت/کنترل)

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `policyId` | string | yes | شناسه داخلی پیشنهاد/بیمه‌نامه |
| `quoteId` | string | yes | شناسه پیشنهاد |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `policyNumber` | string | no | قبل از صدور ممکن است نداشته باشد |
| `productCode` | string | yes | کد محصول |
| `insuredPartyId` | string | yes | ارجاع به Party |
| `channel` | string | no | agent/branch/digital |
| `premiumAmount` | number | yes | مبلغ حق بیمه محاسبه‌شده |
| `currency` | string | yes | IRR |
| `coverages` | object[] | yes | لیست پوشش‌ها |
| `coverages[].code` | string | yes | |
| `coverages[].limitAmount` | number | no | |
| `coverages[].deductibleAmount` | number | no | |
| `riskScore` | number | no | خروجی ML (در صورت وجود) |
| `requiresHumanApproval` | boolean | yes | برای کنترل HITL |

### رویداد: PolicyIssued
- **Topic:** `insurance.policy.issued`
- **Producer:** Policy Service
- **Consumers (نمونه):** Claims Service (فعال‌سازی پوشش‌ها)، Collections Service (ایجاد اقساط/وصول)، Reinsurance Service (محاسبه ceded)، Reporting Service، Regulatory Gateway Service (ارسال/ثبت)

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `policyId` | string | yes | |
| `policyNumber` | string | yes | شماره بیمه‌نامه |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `productCode` | string | yes | |
| `insuredPartyId` | string | yes | |
| `effectiveDate` | string | yes | ISO-8601 |
| `expiryDate` | string | yes | ISO-8601 |
| `totalPremiumAmount` | number | yes | |
| `paymentPlan` | object | no | در صورت اقساط |
| `paymentPlan.type` | string | no | cash/installment |
| `paymentPlan.installmentsCount` | int | no | |
| `issuerUserId` | string | no | برای Audit |
| `regulatory` | object | no | داده‌های لازم برای گزارش‌دهی |
| `regulatory.uniqueCode` | string | no | کد یکتا (در صورت وجود/الزام) |

### رویداد: PolicyCancelled
- **Topic:** `insurance.policy.cancelled`
- **Producer:** Policy Service
- **Consumers (نمونه):** Claims Service (کنترل پوشش)، Collections Service (تسویه)، Reporting Service، Regulatory Gateway Service

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `policyId` | string | yes | |
| `policyNumber` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `cancelledAt` | string | yes | ISO-8601 |
| `reasonCode` | string | yes | |
| `refundAmount` | number | no | در صورت برگشت |

---

## 2.4.3 Domain: Claims (Claims Service)

### رویداد: ClaimRegistered
- **Topic:** `insurance.claim.registered`
- **Producer:** Claims Service
- **Consumers (نمونه):** Fraud Service (محاسبه امتیاز)، Document Service (ایجاد container اسناد)، Reinsurance Service (بررسی شمول اتکایی)، Reporting Service

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `claimId` | string | yes | |
| `claimNumber` | string | yes | |
| `policyId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `lossDate` | string | yes | ISO-8601 |
| `lossType` | string | yes | مثلا: auto, health, fire |
| `reportingChannel` | string | no | agent/branch/digital/callcenter |
| `claimantPartyId` | string | yes | |
| `lossLocation` | object | no | |
| `lossLocation.province` | string | no | |
| `lossLocation.city` | string | no | |
| `initialReserveAmount` | number | no | |
| `requiresHumanTriage` | boolean | yes | HITL gate |

### رویداد: ClaimDocumentsAttached
- **Topic:** `insurance.claim.documents_attached`
- **Producer:** Claims Service (یا Document Service در صورت ownership متفاوت)
- **Consumers (نمونه):** Document-AI Service (Extraction job)، Fraud Service (signals)، Reporting Service

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `claimId` | string | yes | |
| `documentIds` | string[] | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `documents` | object[] | yes | |
| `documents[].documentId` | string | yes | |
| `documents[].type` | string | yes | invoice, report, photo, ... |
| `documents[].source` | string | no | upload/email/scan |
| `documents[].storageRef` | string | yes | مسیر/URI امن |

### رویداد: ClaimAssessed
- **Topic:** `insurance.claim.assessed`
- **Producer:** Claims Service
- **Consumers (نمونه):** Payments Service (آماده‌سازی پرداخت)، Reinsurance Service (محاسبه recoverable)، Fraud Service (بازنگری score)، Reporting Service

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `claimId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `assessedAmount` | number | yes | مبلغ ارزیابی |
| `currency` | string | yes | IRR |
| `assessmentMethod` | string | yes | adjuster/rules/ai_assist |
| `explainabilityRef` | string | no | لینک/شناسه گزارش دلایل |
| `requiresHumanApproval` | boolean | yes | |

### رویداد: ClaimApproved
- **Topic:** `insurance.claim.approved`
- **Producer:** Claims Service
- **Consumers (نمونه):** Payments Service (پرداخت)، Reporting Service، Regulatory Gateway Service (در صورت الزام)

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `claimId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `approvedAmount` | number | yes | |
| `approvedAt` | string | yes | ISO-8601 |
| `approverUserId` | string | no | |
| `paymentInstructionsRef` | string | no | ارجاع به Payments |

---

## 2.4.4 Domain: Fraud (Fraud Service)

### رویداد: FraudScoreComputed
- **Topic:** `insurance.fraud.score_computed`
- **Producer:** Fraud Service
- **Consumers (نمونه):** Claims Service (routing/triage)، Workflow/Case Orchestrator (ایجاد پرونده SIU)، Reporting Service

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `claimId` | string | yes | |
| `fraudCaseId` | string | no | اگر همزمان Case ایجاد شود |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `score` | number | yes | 0..1 یا 0..100 |
| `modelVersion` | string | yes | برای Governance |
| `signals` | object[] | no | لیست نشانه‌ها |
| `signals[].code` | string | yes | |
| `signals[].weight` | number | no | |
| `recommendedAction` | string | yes | allow/hold/escalate |
| `requiresHumanReview` | boolean | yes | |

### رویداد: FraudCaseOpened
- **Topic:** `insurance.fraud.case_opened`
- **Producer:** Fraud Service
- **Consumers (نمونه):** Workflow/Case Orchestrator، Claims Service (hold)، Reporting Service

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `fraudCaseId` | string | yes | |
| `claimId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `openedAt` | string | yes | ISO-8601 |
| `severity` | string | yes | low/medium/high |
| `assigneeUserId` | string | no | |
| `reasonCodes` | string[] | no | |

---

## 2.4.5 Domain: Complaints (Complaints Service)

### رویداد: ComplaintCreated
- **Topic:** `insurance.complaint.created`
- **Producer:** Complaints Service
- **Consumers (نمونه):** Workflow/Case Orchestrator (routing)، Reporting Service، Policy/Claims Service (ایجاد لینک/annotation)

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `complaintId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `channel` | string | yes | web/callcenter/regulatory |
| `category` | string | yes | issuance/claims/agent/... |
| `complainantPartyId` | string | yes | |
| `relatedEntityRef` | object | no | link به policy/claim/agent |
| `relatedEntityRef.type` | string | no | policy/claim/party/... |
| `relatedEntityRef.id` | string | no | |
| `slaHours` | int | yes | |
| `summary` | string | no | بدون PII تا حد ممکن |
| `requiresHumanReview` | boolean | yes | |

### رویداد: ComplaintResolved
- **Topic:** `insurance.complaint.resolved`
- **Producer:** Complaints Service
- **Consumers (نمونه):** Reporting Service، Regulatory Gateway Service (در صورت گزارش به رگولاتور)

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `complaintId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `resolvedAt` | string | yes | ISO-8601 |
| `resolutionCode` | string | yes | |
| `resolutionSummary` | string | no | |
| `rootCauseCodes` | string[] | no | برای بهبود فرایند |

---

## 2.4.6 Domain: Reinsurance (Reinsurance Service)

### رویداد: CededCalculated
- **Topic:** `insurance.ri.ceded_calculated`
- **Producer:** Reinsurance Service
- **Consumers (نمونه):** Reporting Service، Finance Service (در صورت اتصال)، Claims Service (نمایش recoverable)

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `policyId` | string | no | بسته به محاسبه بر پایه صدور |
| `claimId` | string | no | بسته به محاسبه بر پایه خسارت |
| `contractId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `calculationBasis` | string | yes | policy/claim |
| `grossAmount` | number | yes | مبلغ ناخالص |
| `cededAmount` | number | yes | مبلغ واگذار شده |
| `retainedAmount` | number | yes | مبلغ نگهداری |
| `currency` | string | yes | IRR |
| `layerRef` | object | no | در قراردادهای لایه‌ای |
| `layerRef.layerId` | string | no | |
| `counterpartyId` | string | no | reinsurer |

### رویداد: BorderauxGenerated
- **Topic:** `insurance.ri.borderaux_generated`
- **Producer:** Reinsurance Service
- **Consumers (نمونه):** Reporting Service، Finance Service، Document Service (بایگانی)

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `borderauxId` | string | yes | |
| `contractId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `periodStart` | string | yes | ISO-8601 |
| `periodEnd` | string | yes | ISO-8601 |
| `itemsCount` | int | yes | |
| `documentId` | string | no | اگر فایل تولید شده در Document Service ذخیره شود |

---

## 2.4.7 رویدادهای وضعیت/Workflow (تکمیلی)

این رویدادها برای پوشش کامل چرخه عمر و وضعیت‌ها، و همچنین هماهنگی Sagaها (به‌خصوص در گزینه A) توصیه می‌شوند.

### Policy (Policy Service)

#### رویداد: PolicyEndorsed
- **Topic:** `insurance.policy.endorsed`
- **Producer:** Policy Service
- **Consumers (نمونه):** Claims Service (به‌روزرسانی پوشش)، Reinsurance Service (بازمحاسبه ceded)، Reporting Service، Regulatory Gateway Service

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `policyId` | string | yes | |
| `endorsementId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `endorsementType` | string | yes | increase/decrease/correction/... |
| `effectiveDate` | string | yes | ISO-8601 |
| `premiumDeltaAmount` | number | no | تغییر حق بیمه |
| `coveragesDelta` | object[] | no | تغییرات پوشش |
| `requiresHumanApproval` | boolean | yes | |

#### رویداد: PolicyRenewed
- **Topic:** `insurance.policy.renewed`
- **Producer:** Policy Service
- **Consumers (نمونه):** Collections Service، Reinsurance Service، Reporting Service، Regulatory Gateway Service

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `oldPolicyId` | string | yes | |
| `newPolicyId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `oldPolicyNumber` | string | no | |
| `newPolicyNumber` | string | no | |
| `renewalAt` | string | yes | ISO-8601 |
| `termStart` | string | yes | ISO-8601 |
| `termEnd` | string | yes | ISO-8601 |

### Claims (Claims Service)

#### رویداد: ClaimRejected
- **Topic:** `insurance.claim.rejected`
- **Producer:** Claims Service
- **Consumers (نمونه):** Reporting Service، Complaints Service (برای پایش ریسک شکایت)، Regulatory Gateway Service (در صورت الزام)

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `claimId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `rejectedAt` | string | yes | ISO-8601 |
| `rejectionCode` | string | yes | |
| `rejectionSummary` | string | no | |
| `explainabilityRef` | string | no | ارجاع دلایل/قواعد |
| `requiresHumanConfirmation` | boolean | yes | |

#### رویداد: ClaimClosed
- **Topic:** `insurance.claim.closed`
- **Producer:** Claims Service
- **Consumers (نمونه):** Reporting Service، Reinsurance Service (بستن recoveries)، Fraud Service (بستن case در صورت open)، Complaints Service (تحلیل)

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `claimId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `closedAt` | string | yes | ISO-8601 |
| `closureReasonCode` | string | yes | paid/rejected/withdrawn/... |
| `totalPaidAmount` | number | no | |
| `totalRecoveriesAmount` | number | no | |

#### رویداد: ClaimPaymentRequested
- **Topic:** `insurance.claim.payment_requested`
- **Producer:** Claims Service
- **Consumers (نمونه):** Payments Service (ایجاد payment instruction)، AML Service (کنترل AML روی پرداخت)، Reporting Service

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `claimId` | string | yes | |
| `paymentRequestId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `amount` | number | yes | |
| `currency` | string | yes | IRR |
| `beneficiaryPartyId` | string | yes | |
| `bankAccountRef` | string | no | به‌صورت reference (عدم نگهداری داده حساس در event) |
| `requestedAt` | string | yes | ISO-8601 |
| `requiresAmlCheck` | boolean | yes | |

#### رویداد: ClaimPaid
- **Topic:** `insurance.claim.paid`
- **Producer:** Payments Service
- **Consumers (نمونه):** Claims Service (به‌روزرسانی وضعیت و ارقام)، Reporting Service، Reinsurance Service (محاسبه recoverable/payback)، Regulatory Gateway Service

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `claimId` | string | yes | |
| `paymentId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `paidAt` | string | yes | ISO-8601 |
| `amount` | number | yes | |
| `currency` | string | yes | IRR |
| `paymentMethod` | string | yes | bank_transfer/card/... |
| `referenceNumber` | string | no | شماره پیگیری بانکی |

### Fraud (Fraud Service)

#### رویداد: FraudCaseEscalated
- **Topic:** `insurance.fraud.case_escalated`
- **Producer:** Fraud Service
- **Consumers (نمونه):** Workflow/Case Orchestrator (ارجاع به SIU)، Claims Service (hold)، Reporting Service

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `fraudCaseId` | string | yes | |
| `claimId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `escalatedAt` | string | yes | ISO-8601 |
| `toUnit` | string | yes | SIU/legal |
| `reasonCodes` | string[] | no | |
| `requiresHumanApproval` | boolean | yes | |

#### رویداد: FraudCaseClosed
- **Topic:** `insurance.fraud.case_closed`
- **Producer:** Fraud Service
- **Consumers (نمونه):** Claims Service (release/continue)، Reporting Service

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `fraudCaseId` | string | yes | |
| `claimId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `closedAt` | string | yes | ISO-8601 |
| `outcome` | string | yes | confirmed/cleared/inconclusive |
| `notes` | string | no | |

### Complaints (Complaints Service)

#### رویداد: ComplaintEscalated
- **Topic:** `insurance.complaint.escalated`
- **Producer:** Complaints Service
- **Consumers (نمونه):** Workflow/Case Orchestrator، Reporting Service، Regulatory Gateway Service (در صورت escalation به رگولاتور)

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `complaintId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `escalatedAt` | string | yes | ISO-8601 |
| `escalationLevel` | string | yes | manager/legal/regulator |
| `reasonCode` | string | yes | sla_breach/complex_case/... |

#### رویداد: ComplaintSlaBreached
- **Topic:** `insurance.complaint.sla_breached`
- **Producer:** Complaints Service
- **Consumers (نمونه):** Reporting Service، Workflow/Case Orchestrator، Notification Service (اگر وجود داشته باشد)

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `complaintId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `breachedAt` | string | yes | ISO-8601 |
| `slaHours` | int | yes | |
| `elapsedHours` | int | yes | |

### Reinsurance (Reinsurance Service)

#### رویداد: RecoveryIdentified
- **Topic:** `insurance.ri.recovery_identified`
- **Producer:** Reinsurance Service
- **Consumers (نمونه):** Reporting Service، Finance Service، Claims Service (نمایش recoverable)

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `claimId` | string | yes | |
| `contractId` | string | yes | |
| `recoveryId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `recoverableAmount` | number | yes | |
| `currency` | string | yes | IRR |
| `counterpartyId` | string | no | reinsurer |
| `identifiedAt` | string | yes | ISO-8601 |

#### رویداد: RecoveryReceived
- **Topic:** `insurance.ri.recovery_received`
- **Producer:** Finance Service (یا Reinsurance Service، بسته به مالکیت مالی)
- **Consumers (نمونه):** Reinsurance Service (تطبیق و بستن)، Reporting Service، Claims Service

**Subject**

| field | type | required | notes |
|---|---:|---:|---|
| `recoveryId` | string | yes | |
| `claimId` | string | yes | |
| `contractId` | string | yes | |

**Payload**

| field | type | required | notes |
|---|---:|---:|---|
| `receivedAt` | string | yes | ISO-8601 |
| `amount` | number | yes | |
| `currency` | string | yes | IRR |
| `referenceNumber` | string | no | |

---

## 2.4.8 نمونه JSON Schema برای رویدادهای کلیدی

این بخش برای اینکه تیم پیاده‌سازی بتواند قراردادها را سریع‌تر به Schema Registry/Validation منتقل کند، چند Schema نمونه ارائه می‌دهد.

### JSON Schema: `insurance.policy.issued` (PolicyIssued)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PolicyIssuedEvent",
  "type": "object",
  "required": ["eventId", "eventType", "eventVersion", "occurredAt", "producer", "correlationId", "subject", "payload"],
  "properties": {
    "eventId": {"type": "string", "format": "uuid"},
    "eventType": {"type": "string", "const": "PolicyIssued"},
    "eventVersion": {"type": "integer", "minimum": 1},
    "occurredAt": {"type": "string", "format": "date-time"},
    "producer": {"type": "string", "const": "policy-service"},
    "correlationId": {"type": "string"},
    "subject": {
      "type": "object",
      "required": ["policyId", "policyNumber"],
      "properties": {
        "policyId": {"type": "string"},
        "policyNumber": {"type": "string"}
      },
      "additionalProperties": false
    },
    "payload": {
      "type": "object",
      "required": ["productCode", "insuredPartyId", "effectiveDate", "expiryDate", "totalPremiumAmount"],
      "properties": {
        "productCode": {"type": "string"},
        "insuredPartyId": {"type": "string"},
        "effectiveDate": {"type": "string", "format": "date-time"},
        "expiryDate": {"type": "string", "format": "date-time"},
        "totalPremiumAmount": {"type": "number"},
        "paymentPlan": {
          "type": "object",
          "properties": {
            "type": {"type": "string", "enum": ["cash", "installment"]},
            "installmentsCount": {"type": "integer", "minimum": 1}
          },
          "additionalProperties": false
        },
        "issuerUserId": {"type": "string"},
        "regulatory": {
          "type": "object",
          "properties": {
            "uniqueCode": {"type": "string"}
          },
          "additionalProperties": true
        }
      },
      "additionalProperties": true
    }
  },
  "additionalProperties": false
}
```

### JSON Schema: `insurance.claim.registered` (ClaimRegistered)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ClaimRegisteredEvent",
  "type": "object",
  "required": ["eventId", "eventType", "eventVersion", "occurredAt", "producer", "correlationId", "subject", "payload"],
  "properties": {
    "eventId": {"type": "string", "format": "uuid"},
    "eventType": {"type": "string", "const": "ClaimRegistered"},
    "eventVersion": {"type": "integer", "minimum": 1},
    "occurredAt": {"type": "string", "format": "date-time"},
    "producer": {"type": "string", "const": "claims-service"},
    "correlationId": {"type": "string"},
    "subject": {
      "type": "object",
      "required": ["claimId", "claimNumber", "policyId"],
      "properties": {
        "claimId": {"type": "string"},
        "claimNumber": {"type": "string"},
        "policyId": {"type": "string"}
      },
      "additionalProperties": false
    },
    "payload": {
      "type": "object",
      "required": ["lossDate", "lossType", "claimantPartyId", "requiresHumanTriage"],
      "properties": {
        "lossDate": {"type": "string", "format": "date-time"},
        "lossType": {"type": "string"},
        "reportingChannel": {"type": "string"},
        "claimantPartyId": {"type": "string"},
        "lossLocation": {
          "type": "object",
          "properties": {
            "province": {"type": "string"},
            "city": {"type": "string"}
          },
          "additionalProperties": true
        },
        "initialReserveAmount": {"type": "number"},
        "requiresHumanTriage": {"type": "boolean"}
      },
      "additionalProperties": true
    }
  },
  "additionalProperties": false
}
```

### JSON Schema: `insurance.fraud.score_computed` (FraudScoreComputed)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FraudScoreComputedEvent",
  "type": "object",
  "required": ["eventId", "eventType", "eventVersion", "occurredAt", "producer", "correlationId", "subject", "payload"],
  "properties": {
    "eventId": {"type": "string", "format": "uuid"},
    "eventType": {"type": "string", "const": "FraudScoreComputed"},
    "eventVersion": {"type": "integer", "minimum": 1},
    "occurredAt": {"type": "string", "format": "date-time"},
    "producer": {"type": "string", "const": "fraud-service"},
    "correlationId": {"type": "string"},
    "subject": {
      "type": "object",
      "required": ["claimId"],
      "properties": {
        "claimId": {"type": "string"},
        "fraudCaseId": {"type": "string"}
      },
      "additionalProperties": false
    },
    "payload": {
      "type": "object",
      "required": ["score", "modelVersion", "recommendedAction", "requiresHumanReview"],
      "properties": {
        "score": {"type": "number"},
        "modelVersion": {"type": "string"},
        "signals": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["code"],
            "properties": {
              "code": {"type": "string"},
              "weight": {"type": "number"}
            },
            "additionalProperties": true
          }
        },
        "recommendedAction": {"type": "string", "enum": ["allow", "hold", "escalate"]},
        "requiresHumanReview": {"type": "boolean"}
      },
      "additionalProperties": true
    }
  },
  "additionalProperties": false
}
```

---

## 2.5) Schema Registry Strategy (Versioning/Compatibility/CI)

هدف این بخش این است که قرارداد رویدادها در گزینه A «قابل اداره» باشد و تغییرات، بدون شکستن Consumerها، کنترل شود.

### 2.5.1 قرارداد نام‌گذاری
- **Event Type (Logical):** مثل `PolicyIssued`
- **Topic (Transport):** مثل `insurance.policy.issued`
- **Schema Subject (Registry):** پیشنهاد:
  - `insurance.policy.issued-value`
  - `insurance.policy.issued-key` (در صورت نیاز)

### 2.5.2 قوانین سازگاری (Compatibility Rules)

**حالت پیشنهادی:**
- برای رویدادهای دامنه حیاتی (Policy/Claims/Fraud/Complaints/Reinsurance):
  - Compatibility Mode: **BACKWARD** (یا **FULL** اگر سازمان بسیار سخت‌گیر است)

**Non-breaking changes (مجاز):**
- افزودن فیلد جدید با `required: false` و مقدار پیش‌فرض منطقی در consumer
- افزودن enum value جدید (به شرط مدیریت default در consumer)
- افزودن رویداد جدید (topic جدید) بدون تغییر رویدادهای موجود
- افزودن nested fields در objectهایی که `additionalProperties: true` دارند

**Breaking changes (ممنوع بدون نسخه جدید):**
- حذف یا rename فیلد
- تغییر type فیلد (مثلاً string به number)
- required کردن فیلدی که قبلاً optional بوده
- تغییر semantics (معنی) فیلد بدون تغییر version/eventType

### 2.5.3 سیاست نسخه‌بندی
- `eventVersion` داخل Envelope:
  - افزایش `eventVersion` برای تغییرات سازگار هم قابل انجام است (اختیاری)
  - برای تغییرات Breaking، **الزاماً** یکی از این دو باید رخ دهد:
    - انتشار event type جدید (مثلاً `PolicyIssuedV2`) و topic جدید
    - یا حفظ `eventType` و تغییر topic به `...issued.v2` (کمتر توصیه می‌شود)

### 2.5.4 تست و اعتبارسنجی در CI/CD
- در Pipeline هر سرویس Producer:
  - تولید/به‌روزرسانی schema و ثبت در Registry در محیط `dev`
  - اجرای تست Compatibility با آخرین نسخه منتشرشده
  - Contract Test برای payloadهای نمونه
- در Pipeline هر Consumer:
  - اجرای Consumer-driven contract tests (نمونه پیام‌ها)
  - تست Idempotency و Dedup

### 2.5.5 سیاست نگهداری و پیری (Retention)
- نگهداری نسخه‌های schema حداقل تا پایان دوره پشتیبانی Consumerهای قدیمی.
- برای رویدادهای حساس ممیزی (PolicyIssued/ClaimApproved/ClaimPaid):
  - نگهداری payload خام در آرشیو امن (با ماسک PII) برای Audit.

---

## 2.6) Saga Catalog و State Machine متنی (فرایندهای کلیدی)

در گزینه A، هماهنگی فرایندهای چندسرویسی با Saga انجام می‌شود. در این بخش، Sagaهای اصلی و وضعیت‌های پیشنهادی ارائه می‌شود.

### 2.6.1 Saga: صدور بیمه‌نامه (Issuance Saga)
- **Orchestrator:** Workflow/Case Orchestrator
- **هدف:** صدور قابل ممیزی با کنترل‌های HITL/AML و آماده‌سازی اقساط/اتکایی

**مراحل و رویدادها (happy path):**
- `PolicyQuoted` (Policy)
- `UwDecisionMade` (Underwriting) یا تایید دستی
- `PolicyIssued` (Policy)
- `InstallmentCreated` (Collections) (اگر اقساط)
- `CededCalculated` (Reinsurance) (اگر مشمول)
- `RegulatoryRequestSent/Received` (Reg Gateway) (اگر الزام)

**State Machine (متنی):**
- `START`
- `QUOTED`
- `UW_PENDING`
- `UW_APPROVED | UW_REJECTED`
- `ISSUING`
- `ISSUED`
- `POST_ISSUE_SYNC` (collections/reinsurance/regulatory)
- `COMPLETED`
- `FAILED` (با مسیرهای جبرانی)

**Compensation (نمونه):**
- اگر بعد از `PolicyIssued` ارسال رگولاتوری fail شود: حالت `POST_ISSUE_SYNC` با retry و ticket.
- اگر ایجاد اقساط fail شود: policy می‌تواند issued بماند ولی workflow در `POST_ISSUE_SYNC` قفل شود تا اصلاح.

### 2.6.2 Saga: پرداخت خسارت (Claim Payment Saga)
- **Orchestrator:** Workflow/Case Orchestrator
- **هدف:** از ارزیابی تا پرداخت با کنترل تقلب/AML و قابلیت توقف/بازگشت

**مراحل و رویدادها (happy path):**
- `ClaimRegistered` (Claims)
- `FraudScoreComputed` (Fraud)
- `ClaimAssessed` (Claims)
- `ClaimApproved` (Claims)
- `ClaimPaymentRequested` (Claims)
- (AML) `AmlAlertRaised` در صورت ریسک
- `PaymentSettled` (Payments) + `ClaimPaid` (Payments)
- `ClaimClosed` (Claims)

**State Machine (متنی):**
- `START`
- `REGISTERED`
- `TRIAGE_PENDING` (documents/initial checks)
- `FRAUD_CHECK_PENDING`
- `ASSESSMENT_PENDING`
- `APPROVAL_PENDING`
- `PAYMENT_REQUESTED`
- `AML_CHECK_PENDING` (optional)
- `PAYMENT_IN_PROGRESS`
- `PAID`
- `CLOSED`
- `FAILED`

**Stop-the-line gates:**
- اگر `FraudScoreComputed.recommendedAction = hold/escalate` → رفتن به `FRAUD_HOLD`
- اگر AML alert raise شد → `AML_HOLD`

**Compensation (نمونه):**
- اگر پرداخت fail شد (`PaymentFailed`) → بازگشت به `PAYMENT_REQUESTED` و retry/alternative route.

### 2.6.3 Saga: مدیریت تقلب (Fraud Investigation Saga)
- **Orchestrator:** Workflow/Case Orchestrator یا خود Fraud Service (در سادگی)

**رویدادهای کلیدی:**
- `FraudScoreComputed`
- `FraudCaseOpened`
- `FraudCaseEscalated`
- `FraudCaseClosed`

**State Machine (متنی):**
- `NO_CASE`
- `CASE_OPEN`
- `UNDER_REVIEW`
- `ESCALATED`
- `CLOSED_CONFIRMED | CLOSED_CLEARED | CLOSED_INCONCLUSIVE`

### 2.6.4 Saga: رسیدگی به شکایت (Complaint Handling Saga)
- **Orchestrator:** Workflow/Case Orchestrator

**رویدادهای کلیدی:**
- `ComplaintCreated`
- `ComplaintRouted` (پیشنهادی: توسط Orchestrator منتشر شود)
- `ComplaintSlaBreached`
- `ComplaintEscalated`
- `ComplaintResolved`

**State Machine (متنی):**
- `NEW`
- `ROUTED`
- `IN_PROGRESS`
- `ESCALATED`
- `RESOLVED`
- `CLOSED`

### 2.6.5 Saga: اتکایی و بازیافت (Reinsurance Recovery Saga)
- **Orchestrator:** Reinsurance Service (یا Orchestrator عمومی)

**رویدادهای کلیدی:**
- `CededCalculated`
- `BorderauxGenerated`
- `RecoveryIdentified`
- `RecoveryReceived`

**State Machine (متنی):**
- `NOT_APPLICABLE`
- `CEDED_CALCULATED`
- `BORDERAUX_READY`
- `RECOVERY_IDENTIFIED`
- `RECOVERY_IN_PROGRESS`
- `RECOVERY_RECEIVED`
- `CLOSED`

---

## 2.7) Workflow/Case Orchestrator: API و Command Contract (اجرایی)

این بخش قرارداد اجرایی سرویس Orchestrator را مشخص می‌کند تا تیم پیاده‌سازی بتواند Sagaها را با قابلیت مشاهده‌پذیری، Retry، و کنترل انسانی (HITL) عملیاتی کند.

### 2.7.1 مفاهیم کلیدی
- **processInstanceId**: شناسه اجرای Saga
- **processType**: نوع Saga (مثلاً `issuance`, `claim_payment`, `complaint_handling`)
- **state**: وضعیت جاری
- **workItem**: کار قابل ارجاع به انسان/واحد (Task) با SLA
- **command**: دستور برای حرکت فرایند (start/approve/reject/retry/abort)

### 2.7.2 Endpoints پیشنهادی

#### شروع Saga
- `POST /workflows/processes/{processType}/start`

**Request (نمونه):**

| field | type | required | notes |
|---|---:|---:|---|
| `correlationId` | string | yes | از لایه ورودی دریافت شود |
| `subject` | object | yes | مثل policyId/claimId |
| `subject.policyId` | string | no | |
| `subject.claimId` | string | no | |
| `initiatorUserId` | string | no | |
| `inputs` | object | no | داده‌های اولیه فرایند |

**Response (نمونه):**

| field | type | required |
|---|---:|---:|
| `processInstanceId` | string | yes |
| `state` | string | yes |

#### دریافت وضعیت
- `GET /workflows/processes/{processInstanceId}`

#### اعمال Command روی فرایند (کنترل انسانی/سیستمی)
- `POST /workflows/processes/{processInstanceId}/commands`

**Command Payload (نمونه):**

| field | type | required | notes |
|---|---:|---:|---|
| `commandType` | string | yes | `approve`, `reject`, `retry_step`, `skip_step`, `abort`, `resume` |
| `targetStep` | string | no | مثلا `UW_PENDING` یا `AML_CHECK_PENDING` |
| `reasonCode` | string | no | |
| `comment` | string | no | |
| `actorUserId` | string | no | |

#### Query برای Work Itemهای انسانی
- `GET /workflows/work-items?assigneeUserId=...&state=open`

#### Claim/Resolve Work Item
- `POST /workflows/work-items/{workItemId}/claim`
- `POST /workflows/work-items/{workItemId}/complete`

### 2.7.3 رویدادهای پیشنهادی Orchestrator
- `insurance.workflow.process_started`
- `insurance.workflow.state_changed`
- `insurance.workflow.work_item_created`
- `insurance.workflow.work_item_completed`
- `insurance.workflow.process_failed`

هر رویداد باید `processInstanceId` و `processType` را در subject/payload داشته باشد.

---

## 2.8) Message Delivery Policy (Timeout/Retry/DLQ/Idempotency)

این بخش سیاست‌های اجرایی پیام‌رسانی را استاندارد می‌کند تا رفتار سیستم در خطاها قابل پیش‌بینی باشد.

### 2.8.1 Timeout و Retry (پیشنهادی)
- **HTTP بین سرویس‌ها (Sync)**
  - timeout: 2s تا 5s (بر اساس endpoint)
  - retry: حداکثر 2 بار با backoff نمایی
  - circuit breaker برای سرویس‌های بیرونی/ناپایدار
- **Message consumption (Async)**
  - retry سریع: 3 بار (درجا)
  - retry با backoff: 5 بار (مثلاً 1m, 5m, 15m, 30m, 60m)
  - پس از شکست: انتقال به **DLQ**

### 2.8.2 DLQ و فرآیند رسیدگی
- DLQ per topic یا per domain (بسته به ابزار)
- هر پیام DLQ باید:
  - `errorCode`, `errorMessage`, `failedAt`, `consumer`, `attemptCount` را در metadata داشته باشد
- Runbook:
  - triage → fix → replay با `dedupKey` ثابت

### 2.8.3 Idempotency و Dedup (الزامی)
- Consumerها باید جدول `consumed_events` داشته باشند:
  - کلید: `eventId` (یا `eventId+consumerName`)
  - TTL/Retention: حداقل 30 روز (قابل تنظیم)
- Command APIها:
  - پشتیبانی از `Idempotency-Key`
  - ذخیره نتیجه Command برای پاسخ مجدد در صورت تکرار

### 2.8.4 Ordering
- اگر ordering لازم است (مثلاً وضعیت claim):
  - partition key = `claimId`
  - پرهیز از طراحی که ordering سراسری بخواهد

### 2.8.5 Exactly-once vs At-least-once
- فرض اجرایی: **At-least-once delivery**
- نتیجه: طراحی Consumerها باید Idempotent باشد.

---

## 2.9) CQRS/Read Models و BFF برای داشبوردهای حیاتی

در معماری microservices، برای UIهای عملیاتی باید Read Model ساخته شود تا UI به Fan-out call چند سرویس وابسته نشود.

### 2.9.1 الگوی پیشنهادی
- **Dashboard BFF Service** (یا Reporting Service توسعه‌یافته)
  - Subscribe به رویدادها
  - ساخت Projectionهای denormalized برای UI
  - ارائه APIهای Query برای UI

### 2.9.2 Read Model: داشبورد خسارت (Claims Ops Dashboard)

**هدف UI:** لیست پرونده‌ها با وضعیت، SLA، مبلغ‌ها، ریسک تقلب، وضعیت پرداخت.

**منابع رویداد (Consumers):**
- از Claims: `ClaimRegistered`, `ClaimAssessed`, `ClaimApproved`, `ClaimRejected`, `ClaimClosed`
- از Payments: `ClaimPaid` (و در صورت وجود `PaymentFailed`)
- از Fraud: `FraudScoreComputed`, `FraudCaseOpened/Closed`

**Projection Table (نمونه):** `rm_claims_cases`

| field | type | notes |
|---|---:|---|
| `claimId` | string | PK |
| `claimNumber` | string | |
| `policyId` | string | |
| `lossDate` | string | |
| `status` | string | registered/assessed/approved/paid/closed/rejected |
| `assessedAmount` | number | |
| `approvedAmount` | number | |
| `paidAmount` | number | |
| `fraudScore` | number | آخرین score |
| `fraudCaseStatus` | string | open/closed/... |
| `slaDueAt` | string | برای کارتابل |
| `lastUpdatedAt` | string | |

**Query APIs (نمونه):**
- `GET /bff/claims/cases?status=...&minFraudScore=...&sla=breached`
- `GET /bff/claims/cases/{claimId}`

### 2.9.3 Read Model: داشبورد تقلب (SIU/Fraud Dashboard)

**هدف UI:** صف بررسی، پرونده‌های escalated، دلایل/سیگنال‌ها.

**منابع رویداد:**
- `FraudScoreComputed`, `FraudCaseOpened`, `FraudCaseEscalated`, `FraudCaseClosed`
- از Claims: `ClaimRegistered`, `ClaimAssessed` (برای context)

**Projection Table (نمونه):** `rm_fraud_cases`

| field | type | notes |
|---|---:|---|
| `fraudCaseId` | string | PK |
| `claimId` | string | |
| `score` | number | |
| `recommendedAction` | string | |
| `severity` | string | |
| `status` | string | open/escalated/closed |
| `openedAt` | string | |
| `assigneeUserId` | string | |
| `lastUpdatedAt` | string | |

**Query APIs:**
- `GET /bff/fraud/cases?status=open&minScore=...`
- `GET /bff/fraud/cases/{fraudCaseId}`

### 2.9.4 Read Model: داشبورد شکایات (Complaints Dashboard)

**هدف UI:** SLA، علت‌های پرتکرار، ارجاعات، وضعیت حل.

**منابع رویداد:**
- `ComplaintCreated`, `ComplaintEscalated`, `ComplaintSlaBreached`, `ComplaintResolved`
- از Workflow: `work_item_created/completed` (در صورت استفاده)

**Projection Table (نمونه):** `rm_complaints`

| field | type | notes |
|---|---:|---|
| `complaintId` | string | PK |
| `category` | string | |
| `channel` | string | |
| `status` | string | new/routed/in_progress/escalated/resolved/closed |
| `slaHours` | int | |
| `createdAt` | string | |
| `slaBreached` | boolean | |
| `rootCauseCodes` | string[] | |
| `lastUpdatedAt` | string | |

**Query APIs:**
- `GET /bff/complaints?status=...&slaBreached=true&category=claims`
- `GET /bff/complaints/{complaintId}`

---

## 2.10) Service-to-Service Security (Zero Trust) و SoD عملیاتی

این بخش امنیت ارتباطات داخلی در معماری microservices را مشخص می‌کند تا هم انطباق و هم امنیت عملیاتی تضمین شود.

### 2.10.1 اصول
- **Zero Trust:** هیچ سرویس/شبکه‌ای به‌صورت پیش‌فرض قابل اعتماد نیست.
- **Least Privilege:** هر سرویس فقط به حداقل Scope/Permission لازم دسترسی دارد.
- **Defense in Depth:** ترکیب mTLS + JWT + Policy enforcement + WAF.
- **Auditability:** همه Commandهای حساس قابل ممیزی باشند.

### 2.10.2 هویت سرویس (Service Identity) و mTLS
- استفاده از **mTLS** برای همه ترافیک‌های east-west.
- هر سرویس یک **SPIFFE ID** یا معادل آن دارد:
  - مثال: `spiffe://insurer-prod/policy-service`
- Certificate rotation خودکار (روزانه/هفتگی) توسط پلتفرم.

### 2.10.3 JWT Propagation و Scoped Tokens
- لایه ورودی (API Gateway) کاربر را authenticate می‌کند و یک **Access Token** صادر/پاس می‌دهد.
- در سرویس‌های داخلی:
  - یا token کاربر propagate می‌شود (با محدودیت TTL)
  - یا **token تبادلی (exchange token)** صادر می‌شود (ترجیحی برای کنترل دقیق scope)
- هر call داخلی باید شامل:
  - `Authorization: Bearer <token>`
  - `X-Correlation-Id`
  - `X-Actor-UserId` (در صورت نیاز و مجاز)

### 2.10.4 Policy Decision Point (PDP) و Policy Enforcement
- پیشنهاد: **OPA** یا سرویس PDP مشابه.
- مدل تصمیم:
  - تصمیم‌گیری مرکزی بر اساس role/attribute/risk (ABAC)
  - Enforcement در Gateway و همچنین در سرویس‌های حساس (Claims/Payments/Policy)

### 2.10.5 SoD عملیاتی برای Commandها (Separation of Duties)

**قاعده:** یک نفر/نقش نباید هم «پیشنهاد» و هم «تایید نهایی» تصمیم‌های حساس را انجام دهد.

نمونه سیاست‌ها:
- `ClaimApproved` برای مبالغ بالا:
  - نقش مجاز برای پیشنهاد: `claims_adjuster`
  - نقش مجاز برای تایید: `claims_manager`
  - نقش‌های ممنوع همزمان: `claims_adjuster` و `claims_manager` روی یک پرونده در یک بازه
- `PolicyIssued` در موارد high-risk:
  - پیشنهاد: `uw_analyst`
  - تایید: `uw_manager`

**اجرایی‌سازی در Orchestrator:**
- Command API `POST /workflows/processes/{id}/commands` قبل از اعمال، PDP را صدا می‌زند.
- Orchestrator باید:
  - `actorUserId`, `actorRoles`, `caseId`, `amount`, `riskLevel` را به PDP بدهد.

### 2.10.6 Audit Logging برای Commandهای حساس
- برای همه Commandهای حساس ثبت شود:
  - `commandId`, `processInstanceId`, `commandType`, `targetStep`, `actorUserId`
  - `decision` (allowed/denied)
  - `policyVersion`
  - `timestamp`, `correlationId`

---

## 2.11) Step-level Specification برای Sagaهای کلیدی (Issuance/Claim Payment)

این بخش Sagaها را به گام‌های قابل پیاده‌سازی تبدیل می‌کند: ورودی/خروجی هر Step، timeout/retry، و مسیرهای جبرانی.

### 2.11.1 Issuance Saga (Step-level)

**Orchestrator:** Workflow/Case Orchestrator

| Step | Trigger | Action (Command/API) | Success Signal | Timeout/Retry | Compensation/Failure |
|---|---|---|---|---|---|
| `S1_CAPTURE_QUOTE` | `start(issuance)` | فراخوانی Policy: `POST /policies/quote` | `PolicyQuoted` | HTTP 5s / retry 2 | Fail → `FAILED` + workItem اصلاح داده |
| `S2_UW_DECISION` | `PolicyQuoted` | Underwriting: `POST /uw/evaluate` یا ایجاد workItem انسانی | `UwDecisionMade` یا `work_item_completed` | Async retry via workflow | Reject → `UW_REJECTED` + notify |
| `S3_ISSUE_POLICY` | UW approved | Policy: `POST /policies/{id}/issue` | `PolicyIssued` | HTTP 5s / retry 2 | Fail → retry محدود، سپس workItem برای صدور دستی |
| `S4_CREATE_COLLECTIONS` | `PolicyIssued` | Collections: `POST /collections/installments` (اگر اقساط) | `InstallmentCreated` | Async retry + DLQ | Fail → `POST_ISSUE_SYNC` stuck + ticket |
| `S5_REINSURANCE_CEDED` | `PolicyIssued` | Reinsurance: `POST /ri/calc/ceded` | `CededCalculated` | Async retry + DLQ | Fail → allow proceed ولی flag برای follow-up |
| `S6_REGULATORY_SYNC` | `PolicyIssued` | Reg Gateway: `POST /reg/sanhab/policy` | `RegulatoryResponseReceived` | Async retry با backoff | Fail → queue + workItem + audit |
| `S7_COMPLETE` | همه syncها یا سیاست tolerate | بستن process | `ProcessCompleted` | - | - |

**نکته HITL:**
- اگر در `PolicyQuoted` یا `UwDecisionMade` ریسک High بود، Orchestrator باید workItem تایید انسانی ایجاد کند قبل از `S3`.

### 2.11.2 Claim Payment Saga (Step-level)

**Orchestrator:** Workflow/Case Orchestrator

| Step | Trigger | Action (Command/API) | Success Signal | Timeout/Retry | Compensation/Failure |
|---|---|---|---|---|---|
| `C1_REGISTER_CLAIM` | `start(claim_payment)` یا درخواست UI | Claims: `POST /claims` | `ClaimRegistered` | HTTP 5s / retry 2 | Fail → `FAILED` |
| `C2_COLLECT_DOCS` | `ClaimRegistered` | ایجاد container در Document Service و انتظار اسناد | `ClaimDocumentsAttached` | SLA-based | اگر SLA breach → `ComplaintSlaBreached` یا workItem |
| `C3_FRAUD_SCORE` | docs ready یا ثبت claim | Fraud: `POST /fraud/score` | `FraudScoreComputed` | HTTP 5s / retry 2 | Fail → DLQ + workItem |
| `C4_FRAUD_GATE` | `FraudScoreComputed` | اگر hold/escalate → ایجاد case | `FraudCaseOpened` یا `FraudCaseClosed` | Async | Hold → توقف فرایند تا تایید انسانی |
| `C5_ASSESS` | fraud ok | Claims: `POST /claims/{id}/evaluate` | `ClaimAssessed` | HTTP 5s / retry 2 | Fail → workItem |
| `C6_APPROVE` | assessed | Command انسانی (manager) یا rule | `ClaimApproved` یا `ClaimRejected` | SLA-based | Reject → پایان فرایند + ثبت دلایل |
| `C7_PAYMENT_REQUEST` | approved | Claims: `POST /claims/{id}/pay` یا `POST /payments` | `ClaimPaymentRequested` | HTTP 5s / retry 2 | Fail → retry + workItem |
| `C8_AML_CHECK` | payment requested | AML: `POST /aml/screen` | no alert یا `AmlAlertRaised` | HTTP 5s / retry 2 | Alert → `AML_HOLD` تا تایید انسانی |
| `C9_SETTLE_PAYMENT` | AML ok | Payments: `POST /payments/{id}/settle` | `PaymentSettled` + `ClaimPaid` | Async retry + DLQ | Fail → `PaymentFailed` و برگشت به `C7` |
| `C10_CLOSE_CLAIM` | paid | Claims: close | `ClaimClosed` | HTTP 5s / retry 2 | Fail → retry/ DLQ |
| `C11_COMPLETE` | closed | بستن process | `ProcessCompleted` | - | - |

**نکته‌های ریسک/انطباق:**
- برای `C6_APPROVE` و `C9_SETTLE_PAYMENT` باید SoD اعمال شود.
- برای پرداخت‌های بزرگ، thresholdهای جداگانه و امضای دو مرحله‌ای توصیه می‌شود.

### 2.11.3 Fraud Investigation Saga (Step-level)

**Orchestrator:** Workflow/Case Orchestrator (یا Fraud Service برای orchestration ساده)

| Step | Trigger | Action (Command/API) | Success Signal | Timeout/Retry | Compensation/Failure |
|---|---|---|---|---|---|
| `F1_OPEN_CASE` | `FraudScoreComputed` با `hold/escalate` | Fraud: `POST /fraud/cases` | `FraudCaseOpened` | HTTP 5s / retry 2 | Fail → DLQ + workItem |
| `F2_ASSIGN_INVESTIGATOR` | `FraudCaseOpened` | Orchestrator: ایجاد workItem و تخصیص | `work_item_created` | SLA-based | SLA breach → escalation |
| `F3_COLLECT_EVIDENCE` | workItem open | Document Service: لینک اسناد/شواهد | `DocumentLinked` | SLA-based | در صورت نقص، درخواست تکمیل |
| `F4_INVESTIGATE_DECISION` | investigator completes | Command: `POST /workflows/processes/{id}/commands` (`approve/reject`) | `FraudCaseClosed` | SLA-based | Fail → retry/ workItem |
| `F5_RELEASE_OR_HOLD_CLAIM` | `FraudCaseClosed` | Orchestrator: ارسال Command به Claims (continue/hold) | `insurance.workflow.state_changed` | HTTP 5s / retry 2 | Fail → retry + ticket |

**Outcome mapping:**
- `FraudCaseClosed.outcome = confirmed` → Claim در وضعیت `FRAUD_HOLD` و ارجاع حقوقی/SIU
- `cleared` → ادامه مسیر پرداخت
- `inconclusive` → مسیر تصمیم مدیریتی

### 2.11.4 Complaint Handling Saga (Step-level)

**Orchestrator:** Workflow/Case Orchestrator

| Step | Trigger | Action (Command/API) | Success Signal | Timeout/Retry | Compensation/Failure |
|---|---|---|---|---|---|
| `P1_CREATE_COMPLAINT` | `start(complaint_handling)` یا UI | Complaints: `POST /complaints` | `ComplaintCreated` | HTTP 5s / retry 2 | Fail → `FAILED` |
| `P2_TRIAGE_ROUTE` | `ComplaintCreated` | Orchestrator: route به واحد مربوط + workItem | `ComplaintRouted` (پیشنهادی) | SLA-based | Fail → retry + manual route |
| `P3_COLLECT_CONTEXT` | routed | Query context از Read Model یا لینک‌دهی به claim/policy | `work_item_created` | - | - |
| `P4_RESOLVE` | workItem complete | Complaints: `POST /complaints/{id}/resolve` | `ComplaintResolved` | SLA-based | Fail → retry + ticket |
| `P5_REGULATORY_SYNC` | resolved یا escalated | Reg Gateway: `POST /reg/sanhab/complaint` (اگر لازم) | `RegulatoryResponseReceived` | Async retry + DLQ | Fail → queue + audit |
| `P6_CLOSE` | همه تکمیل | بستن process | `ProcessCompleted` | - | - |

**SLA guardrails:**
- تولید `ComplaintSlaBreached` به‌صورت زمان‌بندی‌شده و ایجاد escalation خودکار.

### 2.11.5 Reinsurance Recovery Saga (Step-level)

**Orchestrator:** Reinsurance Service (یا Orchestrator عمومی)

| Step | Trigger | Action (Command/API) | Success Signal | Timeout/Retry | Compensation/Failure |
|---|---|---|---|---|---|
| `R1_CALC_CEDED` | `PolicyIssued` یا `ClaimAssessed/Approved` | Reinsurance: `POST /ri/calc/ceded` | `CededCalculated` | HTTP 5s / retry 2 | Fail → DLQ + workItem |
| `R2_GENERATE_BORDEREAUX` | schedule یا threshold | Reinsurance: `POST /ri/borderaux/generate` | `BorderauxGenerated` | Async retry + DLQ | Fail → retry + manual export |
| `R3_IDENTIFY_RECOVERY` | `ClaimPaid` یا `ClaimClosed` | Reinsurance: محاسبه recoverable و ثبت | `RecoveryIdentified` | Async | Fail → retry |
| `R4_FINANCE_RECEIVE` | وصول وجه | Finance: ثبت دریافت و publish | `RecoveryReceived` | Async | Fail → reconcile job |
| `R5_CLOSE` | recovery received | Reinsurance: close | `insurance.workflow.state_changed` | HTTP 5s / retry 2 | Fail → retry |

---

## 2.12) API Spec (اجرایی) برای سرویس‌های دامنه

این بخش حداقل APIهای لازم را با فیلدهای کلیدی مشخص می‌کند. هدف این نیست که جایگزین OpenAPI کامل شود، بلکه «قرارداد تیم‌ها» را مشخص می‌کند.

### 2.12.1 Policy Service

**Commands**
- `POST /policies/quote`

| field | type | required | notes |
|---|---:|---:|---|
| `correlationId` | string | yes | |
| `productCode` | string | yes | |
| `insuredPartyId` | string | yes | |
| `termStart` | string | yes | ISO-8601 |
| `termEnd` | string | yes | ISO-8601 |
| `coverages` | object[] | yes | |
| `channel` | string | no | |

- `POST /policies/{policyId}/issue`

| field | type | required | notes |
|---|---:|---:|---|
| `correlationId` | string | yes | |
| `issuerUserId` | string | no | |
| `paymentPlan` | object | no | |
| `paymentPlan.type` | string | no | cash/installment |
| `paymentPlan.installmentsCount` | int | no | |

- `POST /policies/{policyId}/endorsements`

| field | type | required |
|---|---:|---:|
| `correlationId` | string | yes |
| `endorsementType` | string | yes |
| `effectiveDate` | string | yes |
| `changes` | object | yes |

**Queries**
- `GET /policies/{policyId}`
- `GET /policies?policyNumber=...`

### 2.12.2 Claims Service

**Commands**
- `POST /claims`

| field | type | required |
|---|---:|---:|
| `correlationId` | string | yes |
| `policyId` | string | yes |
| `claimantPartyId` | string | yes |
| `lossDate` | string | yes |
| `lossType` | string | yes |
| `description` | string | no |

- `POST /claims/{claimId}/evaluate`

| field | type | required |
|---|---:|---:|
| `correlationId` | string | yes |
| `method` | string | yes |
| `inputs` | object | no |

- `POST /claims/{claimId}/approve`
- `POST /claims/{claimId}/reject`

| field | type | required | notes |
|---|---:|---:|---|
| `correlationId` | string | yes | |
| `actorUserId` | string | no | برای Audit |
| `amount` | number | yes | برای approve |
| `reasonCode` | string | yes | برای reject |

- `POST /claims/{claimId}/payment-request`

| field | type | required |
|---|---:|---:|
| `correlationId` | string | yes |
| `amount` | number | yes |
| `beneficiaryPartyId` | string | yes |
| `bankAccountRef` | string | no |

**Queries**
- `GET /claims/{claimId}`
- `GET /claims?claimNumber=...`

### 2.12.3 Fraud Service

**Commands**
- `POST /fraud/score`

| field | type | required |
|---|---:|---:|
| `correlationId` | string | yes |
| `claimId` | string | yes |
| `contextRef` | object | no |

- `POST /fraud/cases`

| field | type | required |
|---|---:|---:|
| `correlationId` | string | yes |
| `claimId` | string | yes |
| `initialScore` | number | no |

- `POST /fraud/cases/{fraudCaseId}/close`

| field | type | required |
|---|---:|---:|
| `correlationId` | string | yes |
| `outcome` | string | yes |
| `notes` | string | no |

**Queries**
- `GET /fraud/cases/{fraudCaseId}`
- `GET /fraud/cases?status=open&minScore=...`

### 2.12.4 Complaints Service

**Commands**
- `POST /complaints`

| field | type | required |
|---|---:|---:|
| `correlationId` | string | yes |
| `channel` | string | yes |
| `category` | string | yes |
| `complainantPartyId` | string | yes |
| `relatedEntityRef` | object | no |
| `summary` | string | no |

- `POST /complaints/{complaintId}/resolve`

| field | type | required |
|---|---:|---:|
| `correlationId` | string | yes |
| `resolutionCode` | string | yes |
| `resolutionSummary` | string | no |
| `rootCauseCodes` | string[] | no |

**Queries**
- `GET /complaints/{complaintId}`
- `GET /complaints?status=...&slaBreached=true`

### 2.12.5 Reinsurance Service

**Commands**
- `POST /ri/calc/ceded`

| field | type | required | notes |
|---|---:|---:|---|
| `correlationId` | string | yes | |
| `calculationBasis` | string | yes | policy/claim |
| `policyId` | string | no | |
| `claimId` | string | no | |

- `POST /ri/borderaux/generate`

| field | type | required |
|---|---:|---:|
| `correlationId` | string | yes |
| `contractId` | string | yes |
| `periodStart` | string | yes |
| `periodEnd` | string | yes |

**Queries**
- `GET /ri/contracts/{contractId}`
- `GET /ri/recoveries?claimId=...`

### 2.12.6 Payments Service

**Commands**
- `POST /payments`

| field | type | required |
|---|---:|---:|
| `correlationId` | string | yes |
| `claimId` | string | yes |
| `amount` | number | yes |
| `currency` | string | yes |
| `beneficiaryPartyId` | string | yes |
| `bankAccountRef` | string | no |

- `POST /payments/{paymentId}/settle`

| field | type | required |
|---|---:|---:|
| `correlationId` | string | yes |
| `settlementRef` | string | no |

**Queries**
- `GET /payments/{paymentId}`
- `GET /payments?claimId=...`

---

## 2.13) DB Schema پیشنهادی (سطح جدول) + Outbox/Consumed/Inbox

این بخش «پیشنهاد اجرایی» برای طراحی DB هر سرویس است. نوع DB می‌تواند PostgreSQL/MS SQL باشد.

### 2.13.1 جدول‌های مشترک (برای همه سرویس‌ها)

#### `outbox_events`

| column | type | notes |
|---|---:|---|
| `id` | uuid | PK |
| `occurred_at` | timestamptz | |
| `topic` | text | |
| `event_type` | text | |
| `event_version` | int | |
| `correlation_id` | text | |
| `subject_json` | jsonb | |
| `payload_json` | jsonb | |
| `status` | text | pending/sent/failed |
| `attempt_count` | int | |

**Indexهای پیشنهادی:**
- `(status, occurred_at)`
- `(correlation_id)`

#### `consumed_events`

| column | type | notes |
|---|---:|---|
| `event_id` | uuid | PK |
| `consumer_name` | text | PK(part) |
| `consumed_at` | timestamptz | |
| `topic` | text | |

**Indexهای پیشنهادی:**
- `(consumed_at)`

#### `inbox_commands` (اختیاری برای command dedup)

| column | type | notes |
|---|---:|---|
| `idempotency_key` | text | PK |
| `request_hash` | text | |
| `response_json` | jsonb | |
| `created_at` | timestamptz | |

---

### 2.13.2 Policy Service DB (پیشنهادی)

#### `policies`

| column | type | notes |
|---|---:|---|
| `policy_id` | uuid | PK |
| `policy_number` | text | unique |
| `product_code` | text | |
| `insured_party_id` | uuid | |
| `status` | text | quoted/issued/cancelled |
| `effective_date` | timestamptz | |
| `expiry_date` | timestamptz | |
| `total_premium_amount` | numeric | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Indexها:**
- unique `(policy_number)`
- `(insured_party_id, status)`

#### `policy_coverages`

| column | type | notes |
|---|---:|---|
| `policy_id` | uuid | FK policies |
| `coverage_code` | text | |
| `limit_amount` | numeric | |
| `deductible_amount` | numeric | |

**Indexها:**
- `(policy_id)`

#### `endorsements`

| column | type | notes |
|---|---:|---|
| `endorsement_id` | uuid | PK |
| `policy_id` | uuid | FK |
| `endorsement_type` | text | |
| `effective_date` | timestamptz | |
| `changes_json` | jsonb | |
| `status` | text | pending/approved/applied |

---

### 2.13.3 Claims Service DB (پیشنهادی)

#### `claims`

| column | type | notes |
|---|---:|---|
| `claim_id` | uuid | PK |
| `claim_number` | text | unique |
| `policy_id` | uuid | |
| `claimant_party_id` | uuid | |
| `loss_date` | timestamptz | |
| `loss_type` | text | |
| `status` | text | registered/assessed/approved/paid/closed/rejected |
| `assessed_amount` | numeric | |
| `approved_amount` | numeric | |
| `paid_amount` | numeric | |
| `requires_human_triage` | boolean | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Indexها:**
- unique `(claim_number)`
- `(policy_id)`
- `(status, updated_at)`

#### `claim_decisions`

| column | type | notes |
|---|---:|---|
| `decision_id` | uuid | PK |
| `claim_id` | uuid | FK |
| `decision_type` | text | assess/approve/reject |
| `actor_user_id` | text | |
| `amount` | numeric | |
| `reason_code` | text | |
| `explainability_ref` | text | |
| `created_at` | timestamptz | |

---

### 2.13.4 Fraud Service DB (پیشنهادی)

#### `fraud_cases`

| column | type | notes |
|---|---:|---|
| `fraud_case_id` | uuid | PK |
| `claim_id` | uuid | |
| `status` | text | open/escalated/closed |
| `severity` | text | low/medium/high |
| `score` | numeric | |
| `recommended_action` | text | allow/hold/escalate |
| `model_version` | text | |
| `assignee_user_id` | text | |
| `opened_at` | timestamptz | |
| `closed_at` | timestamptz | |
| `outcome` | text | confirmed/cleared/inconclusive |

**Indexها:**
- `(claim_id)`
- `(status, score)`

#### `fraud_signals`

| column | type | notes |
|---|---:|---|
| `fraud_case_id` | uuid | FK |
| `code` | text | |
| `weight` | numeric | |
| `details_json` | jsonb | |

---

### 2.13.5 Complaints Service DB (پیشنهادی)

#### `complaints`

| column | type | notes |
|---|---:|---|
| `complaint_id` | uuid | PK |
| `channel` | text | |
| `category` | text | |
| `complainant_party_id` | uuid | |
| `related_entity_type` | text | policy/claim/party/... |
| `related_entity_id` | text | |
| `status` | text | new/routed/in_progress/escalated/resolved/closed |
| `sla_hours` | int | |
| `created_at` | timestamptz | |
| `resolved_at` | timestamptz | |
| `resolution_code` | text | |
| `root_cause_codes` | text[] | |

**Indexها:**
- `(status, created_at)`
- `(category, status)`

---

### 2.13.6 Reinsurance Service DB (پیشنهادی)

#### `ri_contracts`

| column | type | notes |
|---|---:|---|
| `contract_id` | uuid | PK |
| `type` | text | quota_share/surplus/xl |
| `period_start` | date | |
| `period_end` | date | |
| `retention_amount` | numeric | |
| `limit_amount` | numeric | |

#### `ri_ceded_items`

| column | type | notes |
|---|---:|---|
| `ceded_item_id` | uuid | PK |
| `contract_id` | uuid | FK |
| `calculation_basis` | text | policy/claim |
| `policy_id` | uuid | |
| `claim_id` | uuid | |
| `gross_amount` | numeric | |
| `ceded_amount` | numeric | |
| `retained_amount` | numeric | |
| `created_at` | timestamptz | |

**Indexها:**
- `(claim_id)`
- `(policy_id)`
- `(contract_id, created_at)`

#### `ri_recoveries`

| column | type | notes |
|---|---:|---|
| `recovery_id` | uuid | PK |
| `claim_id` | uuid | |
| `contract_id` | uuid | |
| `recoverable_amount` | numeric | |
| `received_amount` | numeric | |
| `status` | text | identified/in_progress/received/closed |
| `identified_at` | timestamptz | |
| `received_at` | timestamptz | |

---

## 2.14) Message Bus Operational Spec (Topics/Partitions/Retention/DLQ)

این بخش «کانفیگ عملیاتی» پیام‌رسانی را استاندارد می‌کند تا تیم Platform/SRE بتواند Kafka/Rabbit را با قواعد ثابت راه‌اندازی کند.

### 2.14.1 استانداردهای Topic
- **Topic naming:** `insurance.<domain>.<event>`
- **Environment prefix (پیشنهادی):**
  - `prod.insurance.policy.issued`
  - `stage.insurance.policy.issued`
- **کلید پارتیشن (Partition Key):**
  - Policy events: `policyId`
  - Claims events: `claimId`
  - Fraud events: `fraudCaseId` (در صورت نبود: `claimId`)
  - Complaints events: `complaintId`
  - Reinsurance events: `contractId` یا `claimId` (بسته به event)

### 2.14.2 فهرست Topicهای حیاتی (Minimum Set)

| Topic | Partition Key | Retention | Notes |
|---|---|---|---|
| `insurance.policy.quoted` | `policyId` | 7d | عملیات کوتاه‌مدت |
| `insurance.policy.issued` | `policyId` | 365d | ممیزی/تطبیق |
| `insurance.policy.cancelled` | `policyId` | 365d | ممیزی |
| `insurance.policy.endorsed` | `policyId` | 365d | ممیزی |
| `insurance.claim.registered` | `claimId` | 365d | ممیزی |
| `insurance.claim.assessed` | `claimId` | 365d | ممیزی |
| `insurance.claim.approved` | `claimId` | 365d | ممیزی |
| `insurance.claim.rejected` | `claimId` | 365d | ممیزی |
| `insurance.claim.paid` | `claimId` | 365d | ممیزی/مالی |
| `insurance.claim.closed` | `claimId` | 365d | ممیزی |
| `insurance.fraud.score_computed` | `claimId` | 90d | تحلیلی/عملیاتی |
| `insurance.fraud.case_opened` | `fraudCaseId` | 365d | ممیزی SIU |
| `insurance.fraud.case_closed` | `fraudCaseId` | 365d | ممیزی SIU |
| `insurance.complaint.created` | `complaintId` | 365d | ممیزی/پاسخگویی |
| `insurance.complaint.resolved` | `complaintId` | 365d | ممیزی |
| `insurance.complaint.sla_breached` | `complaintId` | 90d | عملیاتی |
| `insurance.ri.ceded_calculated` | `contractId` | 365d | مالی/اتکایی |
| `insurance.ri.borderaux_generated` | `contractId` | 365d | مالی/اتکایی |
| `insurance.ri.recovery_identified` | `contractId` | 365d | مالی/اتکایی |
| `insurance.ri.recovery_received` | `contractId` | 365d | مالی |

**نکته:** Retentionهای 365d بر اساس «نیاز ممیزی/پاسخگویی» پیشنهاد شده و باید با سیاست نگهداری داده هر شرکت همسو شود.

### 2.14.3 اندازه پیام و قواعد Payload
- **حد پیشنهادی سایز پیام:** 256KB
- Payload نباید شامل فایل/باینری باشد؛ فقط `documentId/storageRef`.
- داده‌های حساس:
  - عدم ارسال شماره حساب/کد ملی کامل در payload تا حد امکان
  - استفاده از reference + کنترل دسترسی در query

### 2.14.4 DLQ و Retry Topics

**الگو:** برای هر topic حیاتی، یک retry و یک DLQ تعریف می‌شود.

| Base Topic | Retry Topic | DLQ Topic |
|---|---|---|
| `insurance.claim.approved` | `insurance.claim.approved.retry` | `insurance.claim.approved.dlq` |
| `insurance.policy.issued` | `insurance.policy.issued.retry` | `insurance.policy.issued.dlq` |
| `insurance.fraud.score_computed` | `insurance.fraud.score_computed.retry` | `insurance.fraud.score_computed.dlq` |

**DLQ handling:**
- پیام DLQ باید شامل metadata خطا باشد (consumer/attemptCount/errorCode).
- replay فقط بعد از رفع علت ریشه‌ای و با dedup فعال.

### 2.14.5 Integrate با Schema Registry
- Producerها schema را قبل از publish validate کنند.
- Consumerها schema را در start-up load/validate کنند.
- در Production، publish بدون schema ثبت‌شده ممنوع.

### 2.14.6 مانیتورینگ و Alerting پیام‌رسانی
- lag per consumer group
- DLQ rate و message failure rate
- publish rate per topic
- message size percentile

---

## 2.15) NFR عددی + ظرفیت‌سنجی (SLO/SLI/Load/Cost)

این اعداد «baseline پیشنهادی» هستند و در هر شرکت باید با داده واقعی کالیبره شوند.

### 2.15.1 SLO/SLI per Journey (پیشنهادی)

| Journey | SLI | SLO |
|---|---|---|
| صدور (quote→issue) | P95 latency | <= 5s (بدون HITL) |
| ثبت خسارت | P95 latency | <= 3s |
| ارزیابی خسارت (assist) | P95 latency | <= 10s |
| پرداخت خسارت | End-to-end time | <= 2h (بسته به کنترل‌ها) |
| پاسخ شکایت | SLA compliance | >= 95% در SLA |
| Copilot پاسخ/خلاصه | P95 latency | <= 8s |

### 2.15.2 ظرفیت و Load (Baseline)
- کاربران همزمان (Ops): 200 تا 2000 (بسته به شرکت)
- RPS متوسط UI API: 50 تا 300
- RPS پیک: 300 تا 1500
- پیام‌های bus (میانگین): 5k تا 50k پیام/روز
- پیام‌های bus (پیک): 5 تا 50 پیام/ثانیه

### 2.15.3 بودجه Latency/Timeout برای سرویس‌ها
- API Gateway budget: 200ms
- Service processing budget: 300ms تا 1500ms (بر اساس دامنه)
- Downstream calls budget: 1s تا 3s

### 2.15.4 ظرفیت AI و کنترل هزینه

**Document AI:**
- throughput هدف: 1k تا 20k صفحه/روز
- latency هدف per page: 1s تا 5s (وابسته به OCR)

**GenAI Copilot:**
- محدودیت توکن ورودی/خروجی per request (policy-based)
- cache برای سوالات پرتکرار
- rate limit per user/role

**Cost guardrails:**
- سقف هزینه روزانه/ماهانه per tenant
- آلارم هزینه (budget burn rate)
- fallback به مدل ارزان‌تر در فشار (Model Switchboard policy)

### 2.15.5 Back-pressure و حفاظت از سیستم
- در overload:
  - degrade features (غیرفعال‌سازی خلاصه‌سازی سنگین، کاهش context)
  - صف‌بندی jobهای Document-AI
  - اعمال rate limit شدیدتر

---

## 2.16) Roadmap اجرایی (MVP → Phase 2) + Sprint Plan

هدف این بخش این است که از روی همین سند بتوان برنامه اجرا، تیم‌بندی و خروجی‌های قابل تحویل تعریف کرد.

### 2.16.1 پیش‌نیازهای شروع (Week 0 - آماده‌سازی)
- آماده‌سازی محیط نصب اختصاصی (dev/stage/prod) برای یک شرکت نمونه
- انتخاب ابزارهای پلتفرمی:
  - Message Bus (Kafka/Rabbit)
  - Observability stack
  - CI/CD و IaC
  - Schema Registry
- تعریف استانداردهای کدنویسی و قراردادهای بین تیمی:
  - Correlation ID
  - Outbox/ConsumedEvents
  - Contract tests

**Definition of Ready (DoR) برای Sprint 1:**
- Repo/mono-repo structure و template سرویس آماده
- مسیر دیپلوی خودکار برای یک سرویس نمونه
- API Gateway و Auth اولیه بالا آمده

---

## 2.16.2 MVP (فاز 1) — هدف: «اولین ارزش عملیاتی + ستون فقرات پلتفرم»

### دامنه MVP پیشنهادی
- **Claims Ops + Fraud Triage + Document Intake + Basic Copilot (Summarize)**

### اپیک‌های MVP
- **E1 - Platform Foundation:** Gateway, IAM, Secrets, Observability, CI/CD
- **E2 - Messaging Foundation:** Kafka/Rabbit + Schema Registry + Outbox/Consumed baseline
- **E3 - Claims Service (core):** ثبت خسارت، وضعیت‌ها، رویدادها
- **E4 - Document Service + Document-AI:** آپلود/لینک سند + استخراج اولیه
- **E5 - Fraud Service (score + case):** امتیازدهی + ایجاد پرونده + hold/release
- **E6 - Workflow/Orchestrator (Claim Payment subset):** state machine حداقلی و کارتابل انسانی
- **E7 - Read Models + BFF:** داشبورد خسارت/تقلب (نسخه حداقلی)
- **E8 - Governance baseline:** Model registry حداقلی، audit log، policy enforcement پایه

### Sprint Plan پیشنهادی (2 هفته‌ای)

#### Sprint 1 — ستون فقرات پلتفرم
- **Deliverables**
  - یک سرویس نمونه با:
    - DB + migrations
    - `outbox_events` + publisher
    - `consumed_events` + idempotency
  - Observability پایه (logs/metrics/traces)
  - API Gateway + Auth اولیه
- **Done criteria**
  - trace یک درخواست end-to-end تا DB و event publish

#### Sprint 2 — Claims ثبت و رویدادها
- **Deliverables**
  - Claims Service: `POST /claims` + `ClaimRegistered`
  - Read Model حداقلی `rm_claims_cases`
- **Done criteria**
  - پیام `ClaimRegistered` در bus دیده شود و projection ساخته شود

#### Sprint 3 — Document Intake + Extraction
- **Deliverables**
  - Document Service: upload/link
  - Document-AI: extraction job + رویداد `DocumentExtracted`
- **Done criteria**
  - فایل در storage + نتیجه extraction در DB و قابل مشاهده در UI

#### Sprint 4 — Fraud Triage
- **Deliverables**
  - Fraud Score API + `FraudScoreComputed`
  - `FraudCaseOpened/Closed` + UI queue حداقلی
- **Done criteria**
  - مسیر hold/release برای claim قابل انجام باشد

#### Sprint 5 — Orchestrator (Claim Payment subset) + HITL
- **Deliverables**
  - شروع process برای claim
  - workItem انسانی برای تصمیم‌های حساس
  - policy enforcement پایه (PDP)
- **Done criteria**
  - یک case از start تا decision انسانی قابل اجرا و audit شود

#### Sprint 6 — Copilot حداقلی + Guardrails
- **Deliverables**
  - خلاصه پرونده claim با grounding روی extraction
  - ثبت prompt/version و rate limit
- **Done criteria**
  - گزارش ممیزی برای درخواست Copilot (بدون PII)

---

## 2.16.3 Phase 2 — هدف: «گسترش به Policy/Payments/Reinsurance/Complaints + سخت‌گیری انطباق»

### اپیک‌های Phase 2
- **E9 - Policy/Issuance Service + Underwriting:** quote/issue/endorse/renew
- **E10 - Payments/Collections:** پرداخت و اقساط + اتصال بانکی
- **E11 - Complaints:** SLA کامل، escalation، گزارش‌گیری
- **E12 - Reinsurance:** ceded + borderaux + recovery
- **E13 - Regulatory Gateway (سازمان‌دهی سنهاب):** کیفیت داده، صف‌بندی، گزارش‌ها
- **E14 - Mature AI/LLMOps:** drift monitoring، eval suite، red teaming
- **E15 - Enterprise DR/SRE:** RPO/RTO drills، chaos tests، capacity test

### وابستگی‌های کلیدی
- Payments وابسته به استانداردهای امنیتی و اتصال بانکی
- Regulatory gateway وابسته به data quality gates و audit log کامل
- Reinsurance وابسته به یکپارچگی Claims/Policy و حسابداری/مالی

---

## 2.16.4 Team Topology (پیشنهاد)
- **Platform Team:** gateway, mesh, CI/CD, observability, secrets
- **Claims & Ops Team:** claims + orchestrator + BFF
- **AI Team:** document-ai + copilot + eval/guardrails
- **Risk/Compliance Team (Product/Control):** policies, SoD, audit, regulatory mapping
- **Integration Team:** core adapters + regulatory gateway

---

## 2.16.5 معیارهای پذیرش Enterprise (Exit Criteria)
- حداقل 2 مسیر E2E در Production-like محیط:
  - Claim: register → docs → fraud triage → decision → close
  - Complaint: create → route → resolve → report
- Observability: dashboardهای lag/DLQ/SLO فعال
- Audit: گزارش ممیزی برای تصمیم‌های حساس قابل استخراج
- Security: mTLS + policy enforcement فعال
- Data: PII masking و retention policy اعمال‌شده

---

## 3) دامنه‌ها و Bounded Contextها (DDD)

### 3.1 نقشه دامنه (High level)
- **Customer & Party**: اشخاص حقیقی/حقوقی، ذی‌نفع، نماینده، کارگزار
- **Product & Pricing**: محصولات، پوشش‌ها، نرخ‌گذاری، شرایط
- **Policy (Issuance)**: پیشنهاد، ارزیابی ریسک، صدور، الحاقیه، فسخ
- **Claims**: اعلام، تشکیل پرونده، ارزیابی، پرداخت، بازیافت
- **Fraud & SIU**: امتیاز تقلب، شبکه ارتباطات، ارجاع به SIU
- **AML/KYC**: احراز هویت، پایش تراکنش، هشدار مشکوک
- **Complaints**: ثبت، دسته‌بندی، رسیدگی، پاسخ، گزارش به رگولاتور
- **Reinsurance**: قراردادها، سشن‌ها، Borderaux، تسویه
- **Sales Network**: نمایندگان، کارمزد، عملکرد، آموزش
- **Finance**: وصول، بدهی/بستانکاری، IFRS/گزارشات (در حد اتصال)
- **Regulatory Reporting**: سنهاب/کد یکتا/استعلام‌ها/کیفیت داده
- **Analytics & BI**: KPIها، داشبورد مدیران

### 3.2 قراردادهای بین دامنه‌ای
- Policy → Claims (پوشش/اعتبار)
- Claims → Fraud (triage و risk routing)
- Claims → Reinsurance (ceded calculation)
- Finance ↔ Policy/Claims (وصول/پرداخت)
- Complaints ↔ Policy/Claims/Sales (ارجاع موضوع)
- AML ↔ Finance/Sales (پایش تراکنش و KYC)

---

## 4) مدل داده مرجع (Canonical Data Model - سطح اجرای API)

> هدف: یک مدل «مرجع» برای یکپارچه‌سازی و AI، بدون اجبار به یک دیتابیس واحد.

### 4.1 موجودیت‌های کلیدی
- **Party**: `partyId, nationalId, type, contacts, addresses, kycStatus`
- **Policy**: `policyId, policyNumber, productCode, insuredPartyId, status, effectiveDate, expiryDate, premium, coverages[]`
- **Claim**: `claimId, claimNumber, policyId, lossDate, lossType, status, reserveAmount, paidAmount, documents[]`
- **Document**: `documentId, type, source, storageRef, extractedFields{}, confidence, piiTags[]`
- **FraudCase**: `fraudCaseId, relatedClaimId, score, signals[], status, assignee`
- **Complaint**: `complaintId, channel, category, relatedEntityRef, status, sla, resolutionSummary`
- **ReinsuranceContract**: `contractId, type, layers[], limits, retention, period`
- **AuditEvent**: `eventId, actor, action, entityRef, timestamp, correlationId, metadata`

### 4.2 قواعد کلیدی
- همه رکوردهای عملیاتی باید `correlationId` قابل ردیابی داشته باشند.
- تمام تغییرات حساس باید `AuditEvent` تولید کند.
- برای داده‌های حساس، فیلدهای `piiTags` و سیاست ماسک/حذف باید لحاظ شوند.

---

## 5) معماری یکپارچه‌سازی (Integration Architecture)

### 5.1 الگوی ارتباط با Core شرکت بیمه
- **Adapter Service per Core** (پیکربندی‌شونده)
- الگوها:
  - Sync: REST/SOAP با Timeouts/Retry/Circuit Breaker
  - Async: Events + Outbox Pattern

### 5.2 اتصال به سنهاب/رگولاتور
- Gateway/Connector اختصاصی با:
  - کنترل کیفیت داده (Data Quality Gates)
  - مدیریت نسخه API
  - لاگ کامل درخواست/پاسخ (با ماسک PII)
  - صف‌بندی و Retry (برای قطعی‌ها)

---

## 6) طراحی سرویس‌های AI (AI/ML/GenAI)

### 6.1 کاتالوگ سرویس‌های AI در سامانه
- **Document AI**
  - OCR + Layout
  - Extraction (فرم‌ها، فاکتور، کروکی، گزارش پزشکی)
  - Validation rules (سازگاری با policy/claim)
- **Risk Scoring (ML)**
  - Underwriting risk score
  - Claim severity/triage
  - Fraud score
- **GenAI Copilot**
  - خلاصه پرونده (Policy/Claim/Complaint)
  - تولید پیش‌نویس پاسخ شکایت/نامه/پیام
  - Q&A با grounding روی اسناد و دانش‌نامه داخلی
  - راهنمایی کارشناس (Next best action)

### 6.2 Guardrails و کنترل‌ها
- Input validation و PII redaction
- Prompt injection defense
- Output filtering (عدم افشای داده حساس)
- Grounding (Vector DB/Knowledge Graph)
- Rate limiting و هزینه‌سنجی

### 6.3 Human-in-the-loop
- نقاط الزام‌آور تایید انسانی:
  - رد/پذیرش صدور
  - پرداخت خسارت بالای آستانه
  - اعلام تقلب high-confidence
  - ارسال گزارش AML

---

## 7) LLMOps/MLOps (عملیات مدل)

### 7.1 Model Registry و Versioning
- ثبت نسخه:
  - مدل ML
  - Prompt/Template
  - سیاست‌ها و Guardrails
  - Feature flags

### 7.2 محیط‌ها و استقرار
- Canary / Blue-Green برای مدل‌ها
- Rollback plan
- Monitoring برای:
  - Drift
  - Performance
  - Latency/Cost
  - Safety incidents

---

## 8) امنیت، IAM و انطباق

### 8.1 IAM
- RBAC/ABAC
- SSO (OIDC/SAML) در نصب هر شرکت
- تفکیک نقش‌ها (SoD) برای مدل‌ها و داده

### 8.2 Data Security
- Encryption at rest/in transit
- KMS/Secrets management per tenant
- سیاست نگهداری داده و حذف

### 8.3 Auditability
- Audit log غیرقابل‌تغییر (append-only)
- Traceability با Correlation ID

---

## 9) Observability و SRE
- لاگ ساخت‌یافته
- Metrics (SLI/SLO)
- Distributed tracing
- Dashboardهای:
  - عملکرد سرویس‌ها
  - KPI عملیاتی بیمه
  - KPI مدل‌های AI

---

## 10) جریان‌های E2E (فرایندهای اجرایی)

### 10.1 صدور (Issuance)
- Intake اطلاعات → استعلام‌ها → Risk scoring → پیشنهاد نرخ/شرایط → تایید انسانی (در نقاط حساس) → صدور → ثبت رویداد/ممیزی

### 10.2 خسارت (Claims)
- اعلام خسارت → تشکیل پرونده → Document AI → Triage → Fraud scoring → ارزیابی → پرداخت/بازیافت → گزارش‌دهی

### 10.3 شکایت
- ثبت → دسته‌بندی خودکار → ارجاع به واحد مربوط → SLA → پاسخ → تحلیل علل پرتکرار

### 10.4 AML/KYC
- KYC → پایش تراکنش/رفتار → هشدار مشکوک → بررسی انسانی → ثبت گزارش

### 10.5 اتکایی
- ثبت قرارداد → شناسایی ریسک‌های مشمول → محاسبه ceded → Borderaux → تسویه

---

## 11) ماژول پیکربندی محصول (Config-driven Productization)
- Product catalog و Rules
- Workflow configuration
- Feature flags per line of business
- Thresholds و policies (Fraud/Claims/Underwriting)
- Templateها (نامه‌ها/پیام‌ها)

---

## 12) نقشه API (نمونه قراردادهای کلیدی)

### 12.1 Policy APIs
- `POST /policies/quote`
- `POST /policies/{id}/issue`
- `POST /policies/{id}/endorsements`

### 12.2 Claims APIs
- `POST /claims`
- `POST /claims/{id}/documents`
- `POST /claims/{id}/evaluate`
- `POST /claims/{id}/pay`

### 12.3 AI APIs
- `POST /ai/document/extract`
- `POST /ai/risk/score`
- `POST /ai/copilot/summarize`
- `POST /ai/copilot/answer`

### 12.4 Complaints APIs
- `POST /complaints`
- `POST /complaints/{id}/triage`
- `POST /complaints/{id}/resolve`

---

## 13) Non-Functional Requirements (NFR)
- Availability: 99.9% (قابل تنظیم)
- Latency: تعریف per endpoint (صدور/خسارت/AI)
- RPO/RTO: بر اساس Tier سرویس
- Security: OWASP, secrets, least privilege
- Compliance: قابلیت گزارش‌دهی و ممیزی

---

## 14) ضمیمه: چک‌لیست تحویل برای شروع پیاده‌سازی
- معماری منطقی و فیزیکی تایید شده
- دامنه‌ها و قراردادها نهایی
- Data inventory و طبقه‌بندی
- MLOps/LLMOps pipeline تعریف شده
- Runbook و Observability baseline آماده
- برنامه rollout و آموزش کاربران
