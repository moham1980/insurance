# بکلاگ اجرایی فاز P2 — Quote-to-Bind

هدف فاز P2 این است که چرخه کامل RFQ، دریافت quote از یک یا چند بیمه‌گر، مقایسه، انتخاب و bind/Placement پیاده‌سازی شود. این فاز به P0 (Foundation) و P1 (Distribution & Product) وابسته است و برای اولین بار flow چندسازمانی (carrier ↔ broker) را در سطح یک instance اجرا می‌کند. federation در P8 به این flow متصل می‌شود، اما مدل‌های P2 برای federation آماده هستند.

## اصول کلی P2

- `Submission` متعلق به کارگزار است.
- `QuoteRequest` و `QuoteResponse` قابل trace، snapshot و idempotent هستند.
- `Placement` در کارگزار ثبت و `bind` به سمت بیمه‌گر ارسال می‌شود.
- در نهایت `Policy` authoritative در بیمه‌گر ایجاد می‌شود.
- همه فراخوان‌ها به بیمه‌گر از طریق `CarrierConnectorHub` با adapter واضح انجام می‌شوند.
- هر عملیات quote-to-bind باید دارای Saga با compensating action باشد.
- quote comparison فقط بر اساس فاکتورهای قابل explain انجام می‌شود.
- همه APIها idempotency key می‌پذیرند.

---

## P2-0 — پیش‌نیازها از P0 و P1

قبل از شروع P2 موارد زیر باید کامل شوند:

- P0-1 Organization/Tenant/Capability
- P0-2 Party/Identity/Role
- P0-3 Broker License
- P0-4 Distribution Agreement (basic CRUD + binding authority)
- P0-6 ABAC
- P0-7 RLS
- P0-8 Audit Log
- P1-1 Product Versioning
- P1-2 Product Visibility
- P1-3 Broker Product Offering
- P1-4 Agreement Eligibility
- P1-6 Event Contract Repository

---

## P2-1 — Submission Service

### P2-1.1 موجودیت Submission

**هدف**: ثبت درخواست مشتری و آماده‌سازی برای RFQ.

**فایل‌ها**:
- `services/submission-placement-service/src/entities/Submission.ts`
- `services/submission-placement-service/src/entities/CoverageRequest.ts`
- `services/submission-placement-service/src/entities/DocumentRef.ts`

**موجودیت**:

```typescript
interface Submission {
  submissionId: string;
  tenantId: string;
  brokerOrganizationId: string;
  customerPartyId: string;
  lineOfBusiness: string;
  exposure: Record<string, any>;
  requestedCoverages: CoverageRequest[];
  documents: DocumentRef[];
  idempotencyKey: string;
  status: 'draft' | 'submitted' | 'quoted' | 'selected' | 'placed' | 'rejected' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

interface CoverageRequest {
  requestId: string;
  submissionId: string;
  coverageCode: string;
  limit?: Money;
  deductible?: Money;
  requested: boolean;
}
```

**مهاجرت**:
- `V1820000000__create_submission.sql`
- `V1820000001__create_coverage_request.sql`

**معیار پذیرش**:
- submission فقط در tenant کارگزار ایجاد می‌شود.
- `customerPartyId` باید نقش `CUSTOMER` یا `INSURED` در همان tenant داشته باشد.
- تست idempotency: duplicate با کلید یکسان همان submissionId را برمی‌گردارد.
- تاریخ انقضا quote بعد از `createdAt` باشد.

### P2-1.2 API Submission

**فایل‌ها**:
- `services/submission-placement-service/src/submission.controller.ts`
- `services/submission-placement-service/src/submission.service.ts`

**APIهای پیشنهادی**:

```text
POST /api/v1/submissions
GET /api/v1/submissions
GET /api/v1/submissions/{submissionId}
PATCH /api/v1/submissions/{submissionId}
POST /api/v1/submissions/{submissionId}/submit
POST /api/v1/submissions/{submissionId}/expire
```

**معیار پذیرش**:
- کارگزار فقط submissionهای خود را می‌بیند.
- submit فقط در status `draft` مجاز است.
- `PATCH` روی submitted فقط برای افزودن سند مجاز است؛ exposure تغییر نمی‌کند.

**وابستگی**: P0-2.3

---

## P2-2 — Carrier Connector Hub

### P2-2.1 طراحی Adapter Interface

**هدف**: abstraction برای اتصال به بیمه‌گران داخلی، خارجی یا manual.

**فایل‌ها**:
- `services/submission-placement-service/src/carrier-connectors/carrier-connector.interface.ts`
- `services/submission-placement-service/src/carrier-connectors/carrier-connector.registry.ts`
- `services/submission-placement-service/src/carrier-connectors/carrier-connector.factory.ts`

**interface**:

```typescript
interface CarrierConnector {
  submitRisk(risk: RiskSubmission): Promise<QuoteRequestRef>;
  requestQuote(ref: QuoteRequestRef): Promise<CanonicalQuoteResponse>;
  pollQuote(ref: QuoteRequestRef): Promise<CanonicalQuoteResponse>;
  acceptQuote(quoteId: string): Promise<BindResult>;
  uploadDocument(doc: CarrierDocument): Promise<DocumentRef>;
  cancelRequest(ref: QuoteRequestRef): Promise<void>;
  supports(carrierOrganizationId: string, productId: string): boolean;
}

interface RiskSubmission {
  submissionId: string;
  exposure: Record<string, any>;
  requestedCoverages: CoverageRequest[];
  documents: DocumentRef[];
}

interface QuoteRequestRef {
  quoteRequestId: string;
  carrierOrganizationId: string;
  externalQuoteRequestId?: string;
}

interface CanonicalQuoteResponse {
  quoteResponseId?: string;
  sourceQuoteId?: string;
  status: 'quoted' | 'referral' | 'declined' | 'expired';
  premium: Money;
  taxes: Money;
  fees: FeeLine[];
  coverages: CoverageOffer[];
  deductibles: Deductible[];
  exclusions: string[];
  subjectivities: Subjectivity[];
  validUntil: Date;
  quoteSnapshot: Record<string, any>;
  reasonCodes?: string[];
}

interface CarrierDocument {
  documentType: string;
  storageRef: string;
  checksum: string;
}

interface ConnectorConfig {
  carrierOrganizationId: string;
  connectorType: 'internal' | 'rest' | 'soap' | 'kafka' | 'manual';
  endpoint?: string;
  authType?: 'oauth2_client_credentials' | 'mtls' | 'api_key';
  credentialRef?: string;
  timeoutMs: number;
  retryPolicy: RetryPolicy;
  adapterImpl: string;
}
```

**معیار پذیرش**:
- connector ها pluggable و config-driven هستند.
- اضافه کردن connector جدید فقط نیاز به ثبت adapter در registry دارد.
- credential در Vault نگهداری می‌شود و صرفاً ref در config سرویس است.

### P2-2.2 Implementations پیش‌فرض

**هدف**: پیاده‌سازی adapterهای internal، REST، SOAP، Kafka و manual مطابق CarrierConnector رسمی.

**فایل‌ها**:
- `services/submission-placement-service/src/carrier-connectors/internal-connector.adapter.ts`
- `services/submission-placement-service/src/carrier-connectors/rest-connector.adapter.ts`
- `services/submission-placement-service/src/carrier-connectors/soap-connector.adapter.ts`
- `services/submission-placement-service/src/carrier-connectors/kafka-connector.adapter.ts`
- `services/submission-placement-service/src/carrier-connectors/manual-connector.adapter.ts`

**معیار پذیرش**:
- `internal`: فراخوان داخلی به `product-service` + `quote-engine`.
- `rest`: فراخوان REST خارجی با timeout و retry.
- `soap`: فراخوان SOAP خارجی با WSDL/XML mapping و retry.
- `kafka`: ارسال/دریافت quote از طریق topicهای Kafka با Outbox.
- `manual`: ایجاد task برای کاربر و ثبت نتیجه دستی.
- هر adapter error را به `QuoteError` یا `BindError` استاندارد map می‌کند.
- هر adapter درخواست و پاسخ را به‌صورت immutable snapshot ذخیره می‌کند.

**وابستگی**: P2-2.1

### P2-2.3 Carrier Connector Config API

**فایل‌ها**:
- `services/submission-placement-service/src/connector-config.controller.ts`

**APIهای پیشنهادی**:

```text
POST /api/v1/carrier-connectors
GET /api/v1/carrier-connectors
GET /api/v1/carrier-connectors/{carrierOrganizationId}/health
POST /api/v1/carrier-connectors/{carrierOrganizationId}/test
```

**معیار پذیرش**:
- فقط `insurer_admin` یا `system_admin` می‌تواند config ویرایش کند.
- test endpoint بدون تغییر داده، صرفاً connectivity را بررسی می‌کند.
- secret هیچ‌گاه در response نمایش داده نمی‌شود.

---

## P2-3 — Quote Request / Response

### P2-3.1 موجودیت‌ها

**هدف**: پیگیری درخواست و پاسخ quote به همراه snapshot و agreement version.

**فایل‌ها**:
- `services/submission-placement-service/src/entities/QuoteRequest.ts`
- `services/submission-placement-service/src/entities/QuoteResponse.ts`
- `services/submission-placement-service/src/entities/QuoteError.ts`

**موجودیت‌ها**:

```typescript
interface QuoteRequest {
  quoteRequestId: string;
  tenantId: string;
  submissionId: string;
  distributionAgreementId: string;
  agreementVersion: number;
  carrierOrganizationId: string;
  productId: string;
  productVersion: number;
  connectorType: 'internal' | 'rest' | 'soap' | 'kafka' | 'manual';
  connectorRequestId?: string;
  requestPayload: Record<string, any>;
  idempotencyKey: string;
  attempt: number;
  sentAt?: Date;
  slaDeadline: Date;
  status: 'pending' | 'sent' | 'received' | 'timeout' | 'error' | 'cancelled';
}

interface QuoteResponse {
  quoteResponseId: string;
  tenantId: string;
  quoteRequestId: string;
  receivedAt: Date;
  carrierOrganizationId: string;
  productId: string;
  productVersion: number;
  rateTableVersion: string;
  agreementVersion: number;
  sourceSystemId: string;
  sourceQuoteId?: string;
  premium: Money;
  taxes: Money;
  fees: FeeLine[];
  coverages: CoverageOffer[];
  deductibles: Deductible[];
  exclusions: string[];
  subjectivities: Subjectivity[];
  validUntil: Date;
  quoteSnapshot: Record<string, any>;
  status: 'valid' | 'expired' | 'withdrawn';
}
```

**مهاجرت**:
- `V1820000010__create_quote_request.sql`
- `V1820000011__create_quote_response.sql`

**معیار پذیرش**:
- `QuoteRequest` فقط برای submission در همان tenant ایجاد می‌شود.
- `distributionAgreementId` باید active و شامل `productId` باشد.
- `QuoteResponse` فقط از روی `QuoteRequest` معتبر قابل ثبت است.
- `quoteSnapshot` immutable و غیرقابل تغییر است.
- تاریخ `validUntil` بعد از `receivedAt` باشد.

### P2-3.2 RFQ Engine

**فایل‌ها**:
- `services/submission-placement-service/src/rfq/rfq-engine.ts`
- `services/submission-placement-service/src/rfq/quote-dispatcher.ts`

**وظایف RFQ Engine**:

- تعیین لیست carrierها بر اساس `BrokerProductOffering` یا `ProductVisibility`.
- بررسی `DistributionAgreement` و binding authority.
- ارسال `QuoteRequest` به هر carrier از طریق `CarrierConnectorHub`.
- مدیریت timeout، retry، circuit breaker.
- ثبت `QuoteResponse` یا `QuoteError`.
- انتشار event `QuoteRequested.v1` و `CarrierQuoteReceived.v1`.

**معیار پذیرش**:
- برای هر submission حداقل یک quote request موفق یا failed با دلیل ثبت شود.
- timeout با retry مشخص اجرا شود.
- circuit breaker پس از سه خطای متوالی باز شود.
- eventها با Outbox منتشر شوند.

**APIهای پیشنهادی**:

```text
POST /api/v1/submissions/{submissionId}/rfq
GET /api/v1/submissions/{submissionId}/quotes
GET /api/v1/submissions/{submissionId}/quotes/{quoteResponseId}
```

**وابستگی**: P2-1.1، P2-2.2، P1-4.2

---

## P2-4 — Quote Comparison

### P2-4.1 Comparison Engine

**هدف**: مقایسه quoteها بدون تمرکز صرف بر کمیسیون.

**فایل‌ها**:
- `services/submission-placement-service/src/comparison/comparison-engine.ts`
- `services/submission-placement-service/src/comparison/ranking-rule.ts`

**input**:

- لیست `QuoteResponse` + `CoverageRequest` مشتری
- `RecommendationRule` از `BrokerProductOffering`
- وزن‌های مجاز: premium، coverage، deductible، exclusions، SLA/quality، solvency

**output**:

- رتبه‌بندی با `reasonCode` و `rankWeight` برای هر dimension.
- نمایش conflict of interest و commission disclosure.

**معیار پذیرش**:
- ranking قابل توضیح و auditable است.
- هر recommendation دارای `reasonCodes` است.
- کاربر می‌تواند ببیند کدام quote بیشترین کمیسیون را دارد (disclosure).
- پیشنهاد پیش‌فرض بر اساس rule، نه صرفاً کمیسیون، انتخاب می‌شود.

### P2-4.2 UI Components

**فایل‌ها**:
- `packages/ui/QuoteComparisonTable.tsx` (تکمیل)
- `packages/ui/QuoteScoreBreakdown.tsx` (جدید)

**معیار پذیرش**:
- نمایش side-by-side premium، پوشش، franchise، exclusions.
- نمایش score با breakdown.
- دکمه انتخاب quote همراه با confirmation dialog.

**وابستگی**: P1-3.2

---

## P2-5 — Placement و Bind

### P2-5.1 موجودیت Placement

**هدف**: ثبت انتخاب مشتری و ارسال bind به بیمه‌گر.

**فایل‌ها**:
- `services/submission-placement-service/src/entities/Placement.ts`

**موجودیت**:

```typescript
interface Placement {
  placementId: string;
  tenantId: string;
  distributionAgreementId: string;
  agreementVersion: number;
  submissionId: string;
  selectedQuoteResponseId: string;
  carrierOrganizationId: string;
  brokerOrganizationId: string;
  customerPartyId: string;
  bindDate: Date;
  boundPremium: Money;
  confirmationDeadline?: Date;
  status: 'bound' | 'issued' | 'cancelled' | 'referred';
  bindRequestPayload: Record<string, any>;
  bindResponsePayload?: Record<string, any>;
  policyId?: string;
  policyNumber?: string;
}
```

**مهاجرت**:
- `V1820000020__create_placement.sql`

**معیار پذیرش**:
- placement فقط از روی `QuoteResponse` با status `valid` و `validUntil` معتبر ایجاد می‌شود.
- agreement و product در زمان bind هنوز active باشند.
- `boundPremium` با `QuoteResponse.premium` یکسان یا مطابق rule markup باشد.
- به‌روزرسانی placement با `policyId` از بیمه‌گر امکان‌پذیر است.

### P2-5.2 Bind Saga

**هدف**: اجرای چندمرحله‌ای bind با compensating action.

**فایل‌ها**:
- `services/orchestrator-service/src/workflows/quote-to-bind.saga.ts`
- `services/orchestrator-service/src/entities/SagaStep.ts` (بازبینی)
- `services/submission-placement-service/src/placement/placement-orchestrator.ts`

**مراحل Saga**:

```text
1. Validate Quote & Agreement
2. Reserve Premium / Client Money (billing-service)
3. Send Bind Request to Carrier (CarrierConnectorHub)
4. Receive Bind Confirmation / Policy Number
5. Create Policy Projection / Placement Issued
6. Emit PlacementIssued / PolicyProjected event
7. Notify Customer and Broker
```

**Compensating Actions**:

- شکست در مرحله ۳: release premium reservation.
- شکست در مرحله ۴: cancel bind با carrier connector (در صورت پشتیبانی).
- شکست در مرحله ۵: ثبت `PlacementFailed` و refund / rollback.

**معیار پذیرش**:
- Saga state machine با persistence قابل مشاهده است.
- هر step دارای `startedAt`، `completedAt`، `status`، `error` و compensating action است.
- در صورت failure، وضعیت نهایی `cancelled` یا `referred` می‌شود.
- تست end-to-end bind success و bind failure اجرا شود.

**APIهای پیشنهادی**:

```text
POST /api/v1/quotes/{quoteResponseId}/select
POST /api/v1/placements
GET /api/v1/placements/{placementId}
POST /api/v1/placements/{placementId}/retry
POST /api/v1/placements/{placementId}/cancel
```

**وابستگی**: P2-3.2، P2-2.2، P0-8 Audit Log

---

## P2-6 — Policy Projection

### P2-6.1 موجودیت Policy Projection

**هدف**: نگهداری projection سیاست صادرشده از سوی بیمه‌گر در کارگزار.

**فایل‌ها**:
- `services/policy-service/src/entities/PolicyProjection.ts`

**موجودیت**:

```typescript
interface PolicyProjection {
  projectionId: string;
  tenantId: string;
  brokerOrganizationId: string;
  issuerOrganizationId: string;
  policyId: string;
  policyNumber: string;
  uniqueCode?: string;
  placementId: string;
  sourceSystemId: string;
  sourceVersion: number;
  receivedAt: Date;
  payload: Record<string, any>;
  status: 'active' | 'superseded' | 'revoked';
}
```

**مهاجرت**:
- `V1820000030__create_policy_projection.sql`

**معیار پذیرس**:
- projection فقط read-only است.
- هر projection به `placementId` مربوط به کارگزار map می‌شود.
- دریافت نسخه جدید منجر به supersede شدن projection قبلی می‌شود.
- projection با sourceVersion و `receivedAt` ثبت می‌شود.

**وابستگی**: P2-5.2

---

## P2-7 — Manual و External Carrier Connector

### P2-7.1 Manual Connector Workflow

**هدف**: پشتیبانی از بیمه‌گرانی که API ندارند.

**فایل‌ها**:
- `services/submission-placement-service/src/carrier-connectors/manual-connector.adapter.ts`
- `services/workflow-engine-service/src/processes/manual-quote.process.ts`

**معیار پذیرش**:
- درخواست quote به صورت task برای کارمند بیمه‌گر ارسال می‌شود.
- پس از دریافت پاسخ دستی، `QuoteResponse` ثبت می‌شود.
- تاریخچه task در workflow-service قابل مشاهده است.

### P2-7.2 REST/SOAP Adapter Template

**هدف**: یک template قابل config برای اتصال REST/SOAP.

**فایل‌ها**:
- `services/submission-placement-service/src/carrier-connectors/rest-connector.adapter.ts`
- `services/submission-placement-service/src/carrier-connectors/soap-connector.adapter.ts`

**معیار پذیرش**:
- هر adapter بدون تغییر کد core قابل پیکربندی برای carrier جدید است.
- mapping request/response با JSON config تعریف می‌شود.
- error و timeout به‌درستی log و event می‌شوند.

**وابستگی**: P2-2.2

---

## P2-8 — Event‌ها و Contract

### P2-8.1 Eventهای P2

**eventهای الزامی**:

```text
SubmissionCreated.v1
QuoteRequested.v1
CarrierQuoteReceived.v1
QuoteExpired.v1
QuoteSelected.v1
RiskReferred.v1
BindRequested.v1
BindConfirmed.v1
BindFailed.v1
PlacementIssued.v1
PolicyProjected.v1
PlacementCancelled.v1
```

**معیار پذیرش**:
- همه eventها در `contract repository` AsyncAPI ثبت شوند.
- producer و consumer contract test pass شوند.
- هر event دارای `correlationId`, `idempotencyKey`, `schemaVersion` باشد.
- انتشار با Outbox انجام شود.

### P2-8.2 OpenAPI/AsyncAPI

**فایل‌ها**:
- `D:\CascadeProjects\ecosystem\contracts\openapi\submission-placement-service\openapi.yaml`
- `D:\CascadeProjects\ecosystem\contracts\asyncapi\quote-to-bind\asyncapi.yaml`

**معیار پذیرش**:
- تمام endpointهای جدید در OpenAPI ثبت شوند.
- تمام eventهای جدید در AsyncAPI ثبت شوند.
- contract tests در CI اجرا شوند.

**وابستگی**: P1-6.1

---

## P2-9 — تست‌ها

### P2-9.1 Unit/Integration Tests

**فایل‌ها**:
- `services/submission-placement-service/test/rfq-engine.spec.ts`
- `services/submission-placement-service/test/bind-saga.spec.ts`
- `services/submission-placement-service/test/quote-comparison.spec.ts`
- `services/submission-placement-service/test/carrier-connector.spec.ts`

**تست‌های الزامی**:

- RFQ با یک carrier موفق.
- RFQ با چند carrier و timeout یکی.
- Quote comparison با ranking قابل توضیح.
- Bind success با ایجاد Policy Projection.
- Bind failure با compensating action (release premium reservation).
- Idempotency در duplicate submission و RFQ.
- Manual connector workflow task creation.

### P2-9.2 Security & Isolation Tests

**تست‌ها**:

- کارگزار A نمی‌تواند quote کارگزار B را ببیند.
- کارگزار نمی‌تواند rate table/formula را از response استخراج کند.
- کارگزار بدون مجوز نمی‌تواند bind انجام دهد.
- تست منفی: bind با `QuoteResponse` منقضی rejected می‌شود.

### P2-9.3 E2E Tests

**فایل‌ها**:
- `e2e/quote-to-bind.spec.ts`

**سناریوها**:

- happy path: submission → RFQ → compare → select → bind → policy projection.
- failure path: bind rejected by carrier → placement cancelled → refund.
- multi-tenant isolation: broker A cannot see broker B submissions.

**وابستگی**: P0-7

---

## P2-10 — Migration

### P2-10.1 Backfill داده‌های موجود

**هدف**: تبدیل داده‌های quote/placement موجود به مدل جدید.

**اقدامات**:
- ایجاد `Submission` از درخواست‌های quote موجود.
- ایجاد `QuoteRequest/QuoteResponse` از quoteهای تاریخی.
- ایجاد `Placement` از بیمه‌نامه‌های pre-bound موجود.
- ایجاد `PolicyProjection` از بیمه‌نامه‌های موجود.

### P2-10.2 Reconciliation

**معیار پذیرش**:
- تعداد submission و quoteهای تاریخی برابر با migration output باشد.
- هیچ placement بدون `distributionAgreementId` نماند.
- policy projection همه بیمه‌نامه‌های broker-bound پوشش داده شود.
- رکوردهای مبهم در `migration_quarantine` قرار گیرند.

**وابستگی**: P1-8

---

## نقشه زمانی P2

```text
Week 1:
  P2-1.1, P2-1.2 (Submission)
  P2-2.1, P2-2.2, P2-2.3 (Carrier Connector Hub)
  P2-3.1, P2-3.2 (Quote Request/Response & RFQ Engine)

Week 2:
  P2-4.1, P2-4.2 (Quote Comparison)
  P2-5.1, P2-5.2 (Placement & Bind Saga)
  P2-6.1 (Policy Projection)

Week 3:
  P2-7.1, P2-7.2 (Manual & External Connectors)
  P2-8.1, P2-8.2 (Event & Contract)

Week 4:
  P2-9.1, P2-9.2, P2-9.3 (Tests)
  P2-10.1, P2-10.2 (Migration)
  Bug fixing & demo
```

---

## معیارهای خروج P2

P2 کامل است اگر و فقط اگر:

- کارگزار بتواند submission ثبت و RFQ برای چند carrier ارسال کند.
- quoteها دریافت، مقایسه و رتبه‌بندی شوند.
- انتخاب quote منجر به bind و placement شود.
- bind دارای Saga با compensating action باشد.
- Policy Projection از بیمه‌گر دریافت و ثبت شود.
- connector برای internal، rest، soap، kafka و manual پیاده‌سازی شده باشد.
- idempotency، timeout، retry و circuit breaker تست شده باشند.
- تست‌های negative isolation، expired quote و bind failure pass شوند.
- OpenAPI/AsyncAPI برای همه API/eventهای جدید ثبت شده باشد.
- migration با reconciliation موفق انجام شده باشد.

---

## اصلاحات و تکمیلی پس از تطبیق با BROKERAGE_IMPLEMENTATION_PLAN.md

### P2-11 — Underwriting Referral & Risk Appetite

**هدف**: بررسی risk appetite و ارجاع به underwriting قبل از صدور، مطابق سند طراحی بخش ۶.۱ و ۵.۱.

**فایل‌ها**:
- `services/underwriting-service/src/risk-appetite.service.ts`
- `services/underwriting-service/src/referral-rule.service.ts`
- `services/submission-placement-service/src/rfq/underwriting-referral.ts`

**اقدامات**:
- ذخیره `riskAppetite` per `(carrierOrganizationId, lineOfBusiness, distributionAgreementId)`.
- تعریف `referralRules` با threshold و دلیل (reasonCode).
- در صورت breach، ثبت `RiskReferred` و ارسال به workflow.
- `autoBind` فقط برای risk در محدوده binding authority و risk appetite مجاز باشد.

**معیار پذیرس**:
- تست: risk بالاتر از threshold منجر به `RiskReferred` می‌شود.
- تست: `autoBind` بدون risk appetite مجاز `false` است.

### P2-12 — Subjectivities & Document Fulfillment

**هدف**: تکمیل subjectivities و اسناد قبل از bind.

**فایل‌ها**:
- `services/submission-placement-service/src/subjectivities/subjectivity-fulfillment.service.ts`
- `services/submission-placement-service/src/documents/quote-document.service.ts`

**اقدامات**:
- هر `QuoteResponse.subjectivities` قبل از `acceptQuote` باید `fulfilled` شود.
- API برای upload document مربوط به subjectivity.

**معیار پذیرس**:
- تست: bind با subjectivity باز rejected می‌شود.
- تست: پس از upload، subjectivity به `fulfilled` تغییر می‌کند.

### P2-13 — Fraud / AML Risk Check

**هدف**: غربالگری risk مالی/تطبیق قبل از bind.

**فایل‌ها**:
- `services/fraud-service/src/fraud-check.service.ts`
- `services/submission-placement-service/src/rfq/aml-check.service.ts`

**اقدامات**:
- check per `(customerPartyId, brokerOrganizationId, carrierOrganizationId, agreementId)`.
- در صورت high risk، `RiskReferred` و block bind.

**معیار پذیرس**:
- تست: مشتری high-risk قبل از bind متوقف می‌شود.
- audit log برای هر check.

### P2-14 — Event Envelope Standards

**هدف**: اطمینان از envelope مشترک برای همه eventها.

```typescript
interface DomainEventEnvelope<T> {
  eventId: string;
  eventType: string;
  schemaVersion: number;
  occurredAt: string;
  producer: string;
  tenantId: string;
  organizationId: string;
  correlationId: string;
  causationId?: string;
  idempotencyKey: string;
  dataClassification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'PII';
  subject: { type: string; id: string };
  data: T;
}
```

**معیار پذیرس**:
- همه eventهای P2 با این envelope و Outbox منتشر شوند.
- consumer با idempotency و correlation consume کند.

---

## نکات اجرایی

- در P2 هنوز پرداخت واقعی انجام نمی‌شود؛ فقط reservation و projection. پرداخت در P4 تکمیل می‌شود.
- claim در P5 اضافه می‌شود؛ در P2 فقط bind/issue مدنظر است.
- federation در P8 عملیاتی می‌شود، اما P2 باید `issuerOrganizationId` و `authoritativeTenantId` را در policy projection نگهداری کند.
- manual connector باید با workflow-service یکپارچه شود؛ در غیر این صورت operator نمی‌تواند نتیجه را ثبت کند.
- هر quote response باید دلیل reject/accept و audit log داشته باشد.
- ranking و comparison باید explainable باشد؛ هرگونه use AI صرفاً در P7 مجاز است.

این بکلاگ مستقیماً از `BROKERAGE_IMPLEMENTATION_PLAN.md` مشتق شده و آماده پیاده‌سازی چرخه Quote-to-Bind است.
