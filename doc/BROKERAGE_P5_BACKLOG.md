# بکلاگ اجرایی فاز P5 — Claims Advocacy

هدف فاز P5 این است که کارگزار بتواند خسارت مشتری را ثبت، پیگیری و با بیمه‌گران هماهنگ کند، و در عین حال projection وضعیت از بیمه‌گر را دریافت و به مشتری نمایش دهد. این فاز مستقیماً به P0 تا P4 وابسته است.

## اصول کلی P5

- `Claim` authoritative در بیمه‌گر (`carrierOrganizationId`) باقی می‌ماند.
- `ClaimAdvocacyCase` متعلق به کارگزار است و وکالت پیگیری خسارت را نگهداری می‌کند.
- تمام ارتباطات، اسناد و وظایف پیگیری در `ClaimAdvocacyCase` ثبت می‌شوند.
- ارزیاب خسارت (loss adjuster) فقط در صورت مجاز بودن طبق قرارداد/مجوز ارجاع می‌شود.
- وضعیت نهایی خسارت از بیمه‌گر push یا pull می‌شود.
- کاربر حقوقی مشتری می‌تواند خسارت را از طریق پرتال مشتری ثبت و وضعیت را پیگیری کند.
- همه eventها و APIها در contract repository ثبت می‌شوند.

---

## P5-0 — پیش‌نیازها از P0 تا P4

قبل از شروع P5 موارد زیر باید کامل باشند:

- P0-1 Organization/Tenant/Capability
- P0-2 Party/Identity/Role
- P0-4 Distribution Agreement
- P0-6 ABAC
- P0-7 RLS
- P0-8 Audit Log
- P1-2 Product Visibility
- P3-1 Policy Lifecycle
- P3-3 Policy Projection Sync
- P4-2 Customer Payment
- P2-8 Event/Contract Repository

---

## P5-1 — Claim Entity Refactor

### P5-1.1 موجودیت Claim بازطراحی

**هدف**: اضافه کردن مالکیت سازمانی و federation fields.

**فایل‌ها**:
- `services/claims-service/src/entities/Claim.ts` (بازبینی)
- `services/claims-service/src/entities/ClaimParty.ts`
- `services/claims-service/src/entities/ClaimDocument.ts`

**فیلدهای مورد نیاز**:

```typescript
interface Claim {
  claimId: string;
  tenantId: string;
  claimNumber: string;
  recordOwnerOrganizationId: string;
  carrierOrganizationId: string;        // بیمه‌گر authoritative
  distributionOrganizationId?: string; // کارگزار/آژانس ثبت‌کننده
  authoritativeTenantId: string;       // آماده federation
  policyId: string;
  policyNumber: string;
  externalClaimId?: string;            // شناسه خسارت در سامانه بیمه‌گر
  claimantPartyId: string;
  representativePartyId?: string;      // وکیل/نماینده مشتری
  brokerOrganizationId?: string;
  claimType: string;
  lossType: string;
  lossDate: Date;
  reportedDate: Date;
  description?: string;
  status: 'reported' | 'registered' | 'acknowledged' | 'under_review' | 'adjuster_assigned' | 'assessed' | 'approved' | 'rejected' | 'denied' | 'paid' | 'settled' | 'closed' | 'appealed';
  assessedAmount?: Money;
  approvedAmount?: Money;
  paidAmount?: Money;
  reserveAmount?: Money;
  settlementAmount?: Money;
  currency: string;
  notificationChannel: 'web' | 'mobile_app' | 'sms' | 'email' | 'call_center';
  requiresHumanTriage: boolean;
  idempotencyKey: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**مهاجرت‌ها**:
- `V1850000000__add_claim_owner_fields.sql`
- `V1850000001__create_claim_party.sql`
- `V1850000002__create_claim_document.sql`

**معیار پذیرش**:
- `carrierOrganizationId` هرگز null نیست؛ `distributionOrganizationId` در صورت وجود کارگزار ثبت می‌شود.
- `claimNumber` در scope یک tenant/organization unique است.
- `externalClaimId` برای projection از بیمه‌گر قابل mapping است.

### P5-1.2 API مدیریت Claim

**فایل‌ها**:
- `services/claims-service/src/claim.controller.ts` (بازبینی)
- `services/claims-service/src/claim.service.ts` (بازبینی)

**APIهای پیشنهادی**:

```text
POST /api/v1/claims
GET /api/v1/claims
GET /api/v1/claims/{claimId}
PATCH /api/v1/claims/{claimId}
POST /api/v1/claims/{claimId}/acknowledge
POST /api/v1/claims/{claimId}/submit-to-carrier
POST /api/v1/claims/{claimId}/assign-adjuster
POST /api/v1/claims/{claimId}/appeal
GET /api/v1/claims/{claimId}/history
```

**معیار پذیرش**:
- کارگزار فقط claimهایی را می‌بیند که `brokerOrganizationId` یا `distributionOrganizationId` آن‌ها سازمان خودش است.
- بیمه‌گر فقط claimهای `carrierOrganizationId` خود را می‌بیند.
- مشتری فقط claimهای مربوط به `claimantPartyId` خود را می‌بیند.
- `submit-to-carrier` فقط برای claim با status `reported`، `registered` یا `acknowledged` مجاز است.

**وابستگی**: P0-6.2

---

## P5-2 — Claim Advocacy Case

### P5-2.1 موجودیت ClaimAdvocacyCase

**هدف**: ایجاد کیس پیگیری مستقل در کارگزار.

**فایل‌ها**:
- `services/claims-service/src/entities/ClaimAdvocacyCase.ts`
- `services/claims-service/src/entities/AdvocacyTask.ts`
- `services/claims-service/src/entities/AdvocacyCommunication.ts`
- `services/claims-service/src/entities/ClaimDocument.ts` (اشتراک)

**موجودیت‌ها**:

```typescript
interface ClaimAdvocacyCase {
  caseId: string;
  tenantId: string;
  brokerOrganizationId: string;
  claimId: string;
  customerPartyId: string;
  status: 'open' | 'waiting_carrier' | 'adjuster_review' | 'escalated' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedPartyId?: string;
  openedAt: Date;
  closedAt?: Date;
  tasks: AdvocacyTask[];
  communications: AdvocacyCommunication[];
  documents: ClaimDocument[];
  escalationReason?: string;
}

interface AdvocacyTask {
  taskId: string;
  caseId: string;
  taskType: 'follow_up' | 'document_request' | 'carrier_call' | 'customer_update' | 'adjuster_referral' | 'payment_check';
  assignedToPartyId: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'done' | 'overdue';
  outcome?: string;
}

interface AdvocacyCommunication {
  communicationId: string;
  caseId: string;
  channel: 'email' | 'sms' | 'call' | 'web' | 'mobile_app';
  direction: 'inbound' | 'outbound';
  contentRef: string;                 // ref به message store؛ محتوا در vault
  partyId?: string;
  timestamp: Date;
}
```

**مهاجرت‌ها**:
- `V1850000010__create_claim_advocacy_case.sql`
- `V1850000011__create_advocacy_task.sql`
- `V1850000012__create_advocacy_communication.sql`

**معیار پذیرش**:
- هر claim ثبت‌شده توسط کارگزار، یک `ClaimAdvocacyCase` نیز ایجاد می‌کند.
- case فقط در `brokerOrganizationId` مربوطه قابل دسترسی است.
- task overdue alert تولید می‌کند.
- communication content از PII با ref و encryption نگهداری می‌شود.

### P5-2.2 API ClaimAdvocacyCase

**فایل‌ها**:
- `services/claims-service/src/advocacy/advocacy.controller.ts`
- `services/claims-service/src/advocacy/advocacy.service.ts`

**APIهای پیشنهادی**:

```text
POST /api/v1/claims/{claimId}/advocacy-cases
GET /api/v1/advocacy-cases
GET /api/v1/advocacy-cases/{caseId}
POST /api/v1/advocacy-cases/{caseId}/tasks
PATCH /api/v1/advocacy-cases/{caseId}/tasks/{taskId}
POST /api/v1/advocacy-cases/{caseId}/communications
POST /api/v1/advocacy-cases/{caseId}/escalate
POST /api/v1/advocacy-cases/{caseId}/close
```

**معیار پذیرش**:
- هر task به assigned user و due date دارد.
- escalate فقط با دلیل و approval.
- close فقط وقتی claim به `closed` یا `resolved` رسیده باشد.
- مشتری می‌تواند از پرتال خود communication جدید ثبت کند.

**وابستگی**: P5-1.1

---

## P5-3 — Loss Adjuster Referral

### P5-3.1 موجودیت AdjusterReferral

**هدف**: ارجاع خسارت به ارزیاب خسارت مجاز.

**فایل‌ها**:
- `services/claims-service/src/entities/AdjusterReferral.ts`
- `services/claims-service/src/adjusters/loss-adjuster.service.ts`

**موجودیت**:

```typescript
interface AdjusterReferral {
  referralId: string;
  tenantId: string;
  claimId: string;
  caseId: string;
  adjusterOrganizationId: string;
  adjusterPartyId: string;
  referralDate: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'assigned' | 'report_received' | 'closed';
  estimatedFee?: Money;
  reportRef?: string;
  reportReceivedAt?: Date;
}
```

**مهاجرت**:
- `V1850000020__create_adjuster_referral.sql`

**معیار پذیرش**:
- ارزیاب خسارت باید `OrganizationCapability` `LOSS_ADJUSTER` داشته باشد.
- ارزیاب باید در `distributionAgreement` با بیمه‌گر/کارگزار مجاز باشد.
- report فقط در صورت وجود سند و امضا قابل ثبت.
- کارگزار نمی‌تواند مستقیماً `approvedAmount` را تغییر دهد.

### P5-3.2 API ارزیاب خسارت

**APIهای پیشنهادی**:

```text
POST /api/v1/claims/{claimId}/adjuster-referrals
GET /api/v1/claims/{claimId}/adjuster-referrals
POST /api/v1/adjuster-referrals/{referralId}/accept
POST /api/v1/adjuster-referrals/{referralId}/reject
POST /api/v1/adjuster-referrals/{referralId}/submit-report
```

**معیار پذیرش**:
- `accept` فقط توسط ارزیاب یا کاربر مجاز.
- `submit-report` فایل را در object store ثبت و hash/audit ثبت می‌کند.
- کارگزار می‌تواند report را ببیند اما نمی‌تواند amount را override کند.

**وابستگی**: P0-1.1، P0-4.1

---

## P5-4 — Carrier Claim Projection

### P5-4.1 دریافت وضعیت خسارت از بیمه‌گر

**هدف**: projection وضعیت claim در کارگزار از بیمه‌گر.

**فایل‌ها**:
- `services/claims-service/src/projection/claim-projection-sync.service.ts`
- `services/claims-service/src/projection/claim-projection-event-handler.ts`

**events مصرفی**:

```text
ClaimRegistered.v1
ClaimAcknowledged.v1
ClaimStatusUpdated.v1
ClaimAssessed.v1
ClaimApproved.v1
ClaimRejected.v1
ClaimPaid.v1
ClaimClosed.v1
```

**معیار پذیرش**:
- projection فقط read-only و نسخه‌بندی شده.
- هر update با `externalClaimId` و `sourceVersion` ثبت می‌شود و `carrierOrganizationId` مرجع authoritative باقی می‌ماند.
- conflict resolution: نسخه جدیدتر supersede می‌شود.
- delay projection کمتر از ۵ ثانیه (در حالت غیر federation) قابل قبول.

### P5-4.2 Claim Projection Entity

**فایل‌ها**:
- `services/claims-service/src/entities/ClaimProjection.ts`

**موجودیت**:

```typescript
interface ClaimProjection {
  projectionId: string;
  tenantId: string;
  brokerOrganizationId: string;
  carrierOrganizationId: string;
  claimId: string;
  externalClaimId: string;
  sourceSystemId: string;
  sourceVersion: number;
  payload: Record<string, any>;
  receivedAt: Date;
  status: 'active' | 'superseded' | 'revoked';
}
```

**مهاجرت**:
- `V1850000030__create_claim_projection.sql`

**وابستگی**: P3-3.1

---

## P5-5 — Document Management for Claims

### P5-5.1 Document Storage

**هدف**: آپلود و نگهداری اسناد خسارت با PII controls.

**فایل‌ها**:
- `services/claims-service/src/documents/claim-document.service.ts`
- `services/claims-service/src/entities/ClaimDocument.ts`

**موجودیت**:

```typescript
interface ClaimDocument {
  documentId: string;
  claimId: string;
  caseId?: string;
  uploadedByPartyId: string;
  documentType: 'police_report' | 'medical_report' | 'repair_estimate' | 'invoice' | 'photo' | 'video' | 'other';
  storageRef: string;                // object store + encryption
  checksum: string;
  uploadedAt: Date;
  classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'PII';
}
```

**معیار پذیرس**:
- فایل‌ها در object store با encryption at rest.
- checksum برای integrity.
- دسترسی به سند بر اساس ABAC (customer, broker, insurer, adjuster).
- سندهای PII به LLM/OCR ارسال نمی‌شوند مگر با consent و allow-list.

**APIهای پیشنهادی**:

```text
POST /api/v1/claims/{claimId}/documents
GET /api/v1/claims/{claimId}/documents
GET /api/v1/claims/{claimId}/documents/{documentId}/download
```

**وابستگی**: P0-2.2 (PII Store)

---

## P5-6 — Customer Portal Claims

### P5-6.1 BFF Claims

**هدف**: امکان ثبت و پیگیری خسارت در پرتال مشتری.

**فایل‌ها**:
- `services/customer-portal-bff/src/claims/claims.controller.ts`
- `services/customer-portal-bff/src/claims/claims.service.ts`

**APIهای پیشنهادی**:

```text
POST /api/v1/portal/claims
GET /api/v1/portal/claims
GET /api/v1/portal/claims/{claimId}
POST /api/v1/portal/claims/{claimId}/documents
GET /api/v1/portal/claims/{claimId}/status
POST /api/v1/portal/claims/{claimId}/communications
```

**معیار پذیرش**:
- مشتری فقط claimهای مرتبط با partyId خود را می‌بیند.
- ثبت claim منجر به ایجاد `ClaimAdvocacyCase` در کارگزار مربوطه می‌شود.
- مشتری وضعیت claim را به‌صورت real-time projection می‌بیند.
- فایل upload با PII control و virus scan.

### P5-6.2 Agent/Broker Portal Claims

**فایل‌ها**:
- `services/agent-portal-bff/src/claims/claims.controller.ts`
- `services/broker-portal-bff/src/claims/claims.controller.ts` (جدید)

**معیار پذیرش**:
- agent/broker فقط claimهای `distributionOrganizationId` خود را می‌بیند.
- قابلیت assign task، escalate و ثبت communication.

**وابستگی**: P5-2.2

---

## P5-7 — Payments for Claims

### P5-7.1 Claim Payment Integration

**هدف**: پرداخت خسارت به مشتری از طریق `payment-service`.

**فایل‌ها**:
- `services/billing-service/src/claims/claim-payment.service.ts`
- `services/billing-service/src/ledger/claim-posting.service.ts`

**معیار پذیرش**:
- پرداخت خسارت فقط پس از `ClaimApproved` و با `approvedAmount`.
- destination حساب مشتری از `PolicyParty` یا `Claimant` profile.
- پرداخت با `X-Idempotency-Key` و ledger entry `CLAIM_PAYMENT`.
- `paidAmount` در claim projection update شود.

### P5-7.2 Subrogation/Recovery

**فایل‌ها**:
- `services/claims-service/src/recovery/subrogation.service.ts`

**موجودیت**:

```typescript
interface RecoveryCase {
  recoveryId: string;
  tenantId: string;
  claimId: string;
  responsiblePartyId?: string;
  expectedRecoveryAmount: Money;
  recoveredAmount: Money;
  status: 'open' | 'in_negotiation' | 'recovered' | 'written_off';
}
```

**معیار پذیرش**:
- recovery case فقط برای claim با potential subrogation.
- recovery amount با ledger link.

**وابستگی**: P4-2.1

---

## P5-8 — Event‌ها و Contract

### P5-8.1 Eventهای P5

**eventهای پیشنهادی**:

```text
ClaimRegistered.v1
ClaimAcknowledged.v1
ClaimSubmittedToCarrier.v1
ClaimStatusUpdated.v1
ClaimAssessed.v1
ClaimApproved.v1
ClaimRejected.v1
ClaimPaid.v1
ClaimClosed.v1
ClaimAppealed.v1
ClaimProjectionUpdated.v1
ClaimAdvocacyCaseOpened.v1
AdvocacyTaskCreated.v1
AdvocacyTaskOverdue.v1
AdjusterReferred.v1
AdjusterReportReceived.v1
RecoveryCaseCreated.v1
RecoveryReceived.v1
```

**معیار پذیرش**:
- همه eventها در AsyncAPI ثبت شوند.
- producer/consumer contract tests pass شوند.
- Outbox pattern.

### P5-8.2 OpenAPI

**فایل‌ها**:
- `D:\CascadeProjects\ecosystem\contracts\openapi\claims-service\openapi.yaml`
- `D:\CascadeProjects\ecosystem\contracts\asyncapi\claims\asyncapi.yaml`

**وابستگی**: P4-9.2

---

## P5-9 — تست‌ها

### P5-9.1 Unit/Integration Tests

**فایل‌ها**:
- `services/claims-service/test/claim-advocacy.spec.ts`
- `services/claims-service/test/adjuster-referral.spec.ts`
- `services/claims-service/test/claim-projection.spec.ts`
- `services/claims-service/test/claim-document.spec.ts`

**تست‌های الزامی**:

- ثبت claim و ایجاد advocacy case.
- customer portal فقط claim خود را می‌بیند.
- broker portal فقط claimهای organization خود را می‌بیند.
- ارجاع به loss adjuster و ثبت report.
- projection update با sourceVersion.
- document upload و PII access control.
- claim payment از طریق payment-service.

### P5-9.2 E2E Tests

**فایل‌ها**:
- `e2e/claims-advocacy.spec.ts`

**سناریوها**:

- مشتری claim ثبت می‌کند → کارگزار case باز می‌کند → به بیمه‌گر ارسال → ارزیاب خسارت report می‌دهد → بیمه‌گر approved → پرداخت به مشتری.
- claim rejected → appeal → escalation.

**وابستگی**: P5-7.1

---

## P5-10 — Migration

### P5-10.1 Backfill Claim‌ها

**اقدامات**:
- ایجاد `Claim` از خسارت‌های موجود و تبدیل به owner fields.
- ایجاد `ClaimAdvocacyCase` برای claimهای فعال.
- ایجاد `ClaimProjection` از history موجود.
- نگاشت `attachedDocuments` به `ClaimDocument`.

### P5-10.2 Reconciliation

**معیار پذیرش**:
- تعداد claimها و مبالغ قبل و بعد از migration برابر است.
- هیچ claim بدون `carrierOrganizationId` نماند؛ claimهای broker-originated باید در صورت وجود کارگزار، mapping معتبر `distributionOrganizationId`/`brokerOrganizationId` داشته باشند.
- projectionها با source system reconcile شوند.
- رکوردهای مبهم در `migration_quarantine` قرار گیرند.

**وابستگی**: P4-11.2

---

## نقشه زمانی P5

```text
Week 1:
  P5-1.1, P5-1.2 (Claim Refactor & API)
  P5-2.1, P5-2.2 (Claim Advocacy Case)

Week 2:
  P5-3.1, P5-3.2 (Loss Adjuster Referral)
  P5-4.1, P5-4.2 (Claim Projection)
  P5-5.1 (Document Management)

Week 3:
  P5-6.1, P5-6.2 (Customer/Agent/Broker Portal)
  P5-7.1, P5-7.2 (Claim Payments & Recovery)

Week 4:
  P5-8.1, P5-8.2 (Event & Contract)
  P5-9.1, P5-9.2 (Tests)
  P5-10.1, P5-10.2 (Migration)
  Bug fixing, demo
```

---

## معیارهای خروج P5

P5 کامل است اگر و فقط اگر:

- کارگزار بتواند خسارت ثبت و کیس advocacy مدیریت کند.
- مشتری بتواند از پرتال خود خسارت ثبت و پیگیری کند.
- وضعیت خسارت از بیمه‌گر به‌صورت projection دریافت شود.
- ارزیاب خسارت بر اساس قرارداد و مجوز ارجاع شود.
- اسناد خسارت با PII controls آپلود و مدیریت شوند.
- پرداخت خسارت پس از approval از طریق `payment-service` انجام شود.
- تست‌های E2E برای happy path و reject/appeal pass شوند.
- OpenAPI/AsyncAPI برای API/eventهای جدید ثبت شده باشد.
- migration با reconciliation موفق انجام شده باشد.

---

## اصلاحات و تکمیلی پس از تطبیق با BROKERAGE_IMPLEMENTATION_PLAN.md

### P5-11 — Document Service Integration

**هدف**: استفاده از `document-service` (یا ماژول مستندات) برای مدیریت اسناد خسارت با ACL چندسازمانی.

**فایل‌ها**:
- `services/document-service/src/documents/claim-document.controller.ts` (یا `services/claims-service/src/documents`)
- `services/document-service/src/acl/multi-org-acl.service.ts`

**اقدامات**:
- اسناد خسارت در object store با encryption at rest نگهداری شوند.
- checksum برای integrity.
- دسترسی بر اساس ABAC (customer, broker, insurer, adjuster).
- سندهای PII به LLM/OCR ارسال نشوند مگر با consent و allow-list (مشترک با P7).

**معیار پذیرس**:
- تست: مشتری نمی‌تواند سند بیمه‌گر را ببیند مگر با consent.
- virus scan و PII classification قبل از storage.

### P5-12 — Recovery / Subrogation Ledger Link

**هدف**: پیوند `RecoveryCase` با ledger برای بازیافت‌ها.

**اقدامات**:
- `recoveredAmount` با `JournalEntry` type `RECOVERY` ثبت شود.
- recovery case فقط برای claim با potential subrogation.

---

## نکات اجرایی

- `Claim` authoritative فقط در بیمه‌گر است؛ کارگزار از `ClaimAdvocacyCase` و projection استفاده می‌کند.
- کارگزار حق تغییر `approvedAmount` یا `assessedAmount` بیمه‌گر را ندارد.
- `ClaimAdvocacyCase` مستقل از وضعیت claim می‌تواند escalate یا close شود.
- ارزیاب خسارت باید دارای `LOSS_ADJUSTER` capability و agreement معتبر باشد.
- اسناد خسارت نباید بدون consent به LLM/OCR ارسال شوند (فاز P7 AI).
- recovery/subrogation در P5 ابتدایی پیاده‌سازی می‌شود و در فازهای بعدی تکمیل می‌شود.

این بکلاگ مستقیماً از `BROKERAGE_IMPLEMENTATION_PLAN.md` مشتق شده و آماده پیاده‌سازی فاز Claims Advocacy است.
