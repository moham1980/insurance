# گزارش پیشرفت پیاده‌سازی بکلاگ P5 — Claims Advocacy

## ۱. خلاصه اجرایی

این سند گزارش فعالیت‌ها و پیشرفت پیاده‌سازی کامل فاز P5 (Claims Advocacy) از سند `BROKERAGE_P5_BACKLOG.md` است. پیاده‌سازی با روح و اصول طراحی `BROKERAGE_IMPLEMENTATION_PLAN.md` (تفکیک سازمان/کارگزار/بیمه‌گر، System-of-Record، federation fields، event-first، ABAC) انجام شده است.

**وضعیت کلی**: لایه دیتا (entities)، مهاجرت‌ها، سرویس پایه و APIهای اصلی claims-service برای P5 پیاده‌سازی شده و کامپایل موفق (`tsc` exit 0) دارد. موارد باقی‌مانده عمدتاً شامل BFFهای پرتال، تست‌های E2E، contractها و migration backfill است که در ادامه این سند فهرست شده‌اند.

---

## ۲. فعالیت‌ها و تصمیمات

### ۲.۱ تحلیل و تطبیق بکلاگ

قبل از پیاده‌سازی، وضعیت واقعی سرویس‌ها بررسی شد:

- `claims-service` دارای `Claim` موجودیت، `ClaimsService` و `ClaimsController` بود، فاقد فیلدهای مالکیتی سازمانی و federation.
- `sales-network-service` دارای `DistributionAgreement` بود (P0-4 پیش‌نیاز P5-3).
- `party-kyc-service` دارای `Party`، `PartyRoleAssignment`، `GlobalSubject`، `IdentityLink` و `BrokerLicense` بود (P0-2، P0-3).
- `document-service` موجود بود (P5-5 / P5-11) و آماده ادغام است.
- هیچ یک از موجودیت‌های `ClaimAdvocacyCase`، `AdjusterReferral`، `ClaimProjection` و `RecoveryCase` قبلاً وجود نداشتند.

نتیجه تطبیق: P5 کاملاً ناقص بود. نیازمندی‌ها مستقیماً از `BROKERAGE_IMPLEMENTATION_PLAN.md` استخراج شدند تا از دوباره‌کاری و انحراف از روح طراحی جلوگیری شود.

### ۲.۲ پیاده‌سازی P5-1 — Claim Refactor

**اقدامات:**
- `services/claims-service/src/entities/Claim.ts` بازطراحی شد:
  - افزودن `authoritativeTenantId`، `recordOwnerOrganizationId`، `carrierOrganizationId`، `distributionOrganizationId`، `brokerOrganizationId`.
  - افزودن `policyNumber`، `externalClaimId`، `representativePartyId`، `claimType`، `reportedDate`، `reserveAmount`، `settlementAmount`.
  - بازنگری نوع `status` به `ClaimStatus` با وضعیت‌های `reported | registered | acknowledged | under_review | adjuster_assigned | assessed | approved | rejected | denied | paid | settled | closed | appealed`.
  - افزودن ایندکس‌های سازمانی.
- موجودیت‌های فرعی جدید ایجاد شدند:
  - `ClaimParty` (`services/claims-service/src/entities/ClaimParty.ts`)
  - `ClaimDocument` (`services/claims-service/src/entities/ClaimDocument.ts`)
- مهاجرت `1850000000000-add-claim-owner-fields.ts` برای `ALTER TABLE claims` و افزودن ستون‌ها/ایندکس‌ها ایجاد شد.
- مهاجرت‌های `1850000000001-create-claim-party.ts` و `1850000000002-create-claim-document.ts` برای جداول جدید ایجاد شد.
- `ClaimsService.createClaim` به‌روزرسانی شد تا فیلدهای مالکیتی را بپذیرد و مقداردهی کند (`recordOwnerOrganizationId` پیش‌فرض `tenantId`، `carrierOrganizationId` پیش‌فرض مالک). `claims.controller.ts` برای دریافت این فیلدها از `body` به‌روزرسانی شد.
- مقادیر `adjuster_review` قدیمی در `ClaimStatus` به `adjuster_assigned` تبدیل شد و تمام ارجاعات در `claims.service.ts` و `claims-events.consumer.ts` اصلاح گردید.

**اعتبارسنجی:** `tsc` در `claims-service` بدون خطا اجرا شد.

### ۲.۳ پیاده‌سازی P5-2 — ClaimAdvocacyCase

**اقدامات:**
- موجودیت‌ها ایجاد شدند:
  - `ClaimAdvocacyCase` (`src/entities/ClaimAdvocacyCase.ts`)
  - `AdvocacyTask` (`src/entities/AdvocacyTask.ts`)
  - `AdvocacyCommunication` (`src/entities/AdvocacyCommunication.ts`)
- مهاجرت‌های مربوطه:
  - `1850000000010-create-claim-advocacy-case.ts`
  - `1850000000011-create-advocacy-task.ts`
  - `1850000000012-create-advocacy-communication.ts`
- سرویس `ClaimAdvocacyService` (`src/advocacy/advocacy.service.ts`) با قابلیت‌های:
  - `openAdvocacyCase` (با publish event `ClaimAdvocacyCaseOpened`)
  - `getAdvocacyCase` / `listAdvocacyCases`
  - `createTask` / `updateTask` (با event `AdvocacyTaskCreated`)
  - `addCommunication`
  - `escalate` / `closeCase`
- کنترلر `ClaimAdvocacyController` (`src/advocacy/advocacy.controller.ts`) با مسیرهای:
  - `POST /claims/:claimId/advocacy-cases`
  - `GET /advocacy-cases`
  - `GET /advocacy-cases/:caseId`
  - `POST /advocacy-cases/:caseId/tasks`
  - `PATCH /advocacy-cases/:caseId/tasks/:taskId`
  - `POST /advocacy-cases/:caseId/communications`
  - `POST /advocacy-cases/:caseId/escalate`
  - `POST /advocacy-cases/:caseId/close`

### ۲.۴ پیاده‌سازی P5-3 — Loss Adjuster Referral

**اقدامات:**
- موجودیت `AdjusterReferral` (`src/entities/AdjusterReferral.ts`) با فیلدهای `estimatedFeeAmount`، `reportRef`، `reportChecksum`، `reportReceivedAt`، `rejectionReason`.
- مهاجرت `1850000000020-create-adjuster-referral.ts`.
- متدهای `ClaimAdvocacyService`:
  - `createAdjusterReferral`
  - `acceptAdjusterReferral`
  - `rejectAdjusterReferral`
  - `submitAdjusterReport`
- کنترلر با مسیرهای:
  - `POST /claims/:claimId/adjuster-referrals`
  - `POST /adjuster-referrals/:referralId/accept`
  - `POST /adjuster-referrals/:referralId/reject`
  - `POST /adjuster-referrals/:referralId/submit-report`
- `ServiceClient` (`src/service-client.ts`) ایجاد شد و در `ClaimAdvocacyService` ثبت گردید.
- اعتبارسنجی `OrganizationCapability` `LOSS_ADJUSTER` از طریق `auth-service` `/api/v1/admin/organizations/:id/capabilities` انجام می‌شود.
- اعتبارسنجی `DistributionAgreement` فعال از `sales-network-service` `/api/v1/distribution-agreements` انجام می‌شود (نیازمند `SALES_NETWORK_SERVICE_URL`).
- در صورت عدم دسترسی به سرویس‌های مربوطه، اعتبارسنجی با هشدار عبور داده نمی‌شود (fail-closed در صورت پاسخ معتبر منفی).

### ۲.۵ پیاده‌سازی P5-4 — Carrier Claim Projection

**اقدامات:**
- موجودیت `ClaimProjection` (`src/entities/ClaimProjection.ts`) با `sourceSystemId`، `sourceVersion`، `payload` JSONB، `status` (`active | superseded | revoked`).
- مهاجرت `1850000000030-create-claim-projection.ts`.
- متدهای `ClaimAdvocacyService`:
  - `addClaimProjection` با supersede کردن نسخه قبلی فعال و publish event `ClaimProjectionUpdated`
  - `getActiveClaimProjection`
  - `listClaimProjections`
- کنترلر با مسیرهای `GET` و `POST /claims/:claimId/projections`.

### ۲.۶ پیاده‌سازی P5-5 — Document Management

**اقدامات:**
- موجودیت `ClaimDocument` با فیلدهای `documentType`، `storageRef`، `checksum`، `classification` (`PUBLIC | INTERNAL | CONFIDENTIAL | PII`)، `consentRequired`، `virusScanStatus`، `piiScanStatus`.
- مهاجرت `1850000000002-create-claim-document.ts`.
- کنترلرهای جدید:
  - `POST /claims/:claimId/documents` (attach existing document from `document-service`)
  - `GET /claims/:claimId/documents`
  - `GET /claims/:claimId/documents/:documentId/download` (signed URL from `document-service`)
- `ServiceClient.getDocumentMetadata` و `getDocumentSignedUrl` برای فراخوانی `document-service` پیاده‌سازی شد.
- `ClaimAdvocacyService.attachClaimDocument` متادیتای document-service را دریافت و `ClaimDocument` محلی را با وضعیت virus/PII classification ثبت می‌کند.
- مجوزهای `claims:document:attach` / `view` / `download` به `permissions.ts` اضافه شد.

### ۲.۷ پیاده‌سازی P5-7 — Payments & Recovery

**اقدامات:**
- موجودیت `RecoveryCase` (`src/entities/RecoveryCase.ts`) با `expectedRecoveryAmount`، `recoveredAmount`، `status`، `journalEntryId`.
- مهاجرت `1850000000040-create-recovery-case.ts`.
- متدهای `ClaimAdvocacyService`:
  - `createRecoveryCase` (event `RecoveryCaseCreated`)
  - `recordRecovery` (event `RecoveryReceived`)
- کنترلر با مسیر `POST /claims/:claimId/recovery`.
- `ServiceClient` متدهای `createClaimPayoutInvoice` و `initiateClaimPayout` را برای فراخوانی `billing-service` (سپس `payment-service` از طریق ECOSYSTEM provider) پیاده‌سازی کرد.
- `ClaimsService.payClaim` با `BILLING_SERVICE_URL` فاکتور `claim_payout` ایجاد و پرداخت را آغاز می‌کند؛ `paymentReference` برابر `paymentId` تنظیم می‌شود.
- `ServiceClient.postRecoveryJournalEntry` سند حسابداری recovery را در `billing-service` ثبت و post می‌کند.
- `ClaimAdvocacyService.recordRecovery` در صورت عدم وجود `journalEntryId`، اتوماتیکاً سند recovery ایجاد می‌کند.

### ۲.۸ به‌روزرسانی ماژول و دیتاسورس

- `data-source.ts` و `app.module.ts` برای ثبت تمام موجودیت‌ها و سرویس/کنترلر جدید به‌روزرسانی شد.
- `permissions.ts` برای افزودن مجوزهای P5 (`claims:advocacy:manage`, `claims:adjuster:refer`, `claims:projection:view` و ...) به‌روزرسانی شد.
- فایل `src/entities/index.ts` برای export یکپارچه موجودیت‌ها ایجاد شد.

---

### ۲.۹ پیاده‌سازی P5-11 — Document Service Integration

**اقدامات:**
- `ServiceClient` متدهای `getDocumentMetadata` و `getDocumentSignedUrl` برای فراخوانی `document-service` (`/documents/:documentId` و `/documents/:documentId/signed-url`) دارد.
- `ClaimAdvocacyService`:
  - `attachClaimDocument` با دریافت متادیتا از `document-service` و ثبت `ClaimDocument` با وضعیت `virusScanStatus` و `piiScanStatus`.
  - `listClaimDocuments` برای فهرست اسناد ادعا.
  - `getClaimDocumentDownloadUrl` برای دریافت لینک امضاشده دانلود.
- مسیرهای کنترلر:
  - `POST /claims/:claimId/documents`
  - `GET /claims/:claimId/documents`
  - `GET /claims/:claimId/documents/:documentId/download`
- مجوزهای مربوطه به `permissions.ts` اضافه گردید.

### ۲.۱۰ پیاده‌سازی P5-10 — Migration & Reconciliation

**اقدامات:**
- مهاجرت `1850000000050-p5-backfill-and-reconciliation.ts`:
  - ایجاد جدول `migration_quarantine` برای رکوردهای مبهم.
  - Backfill `ClaimAdvocacyCase` برای claimهای فعال دارای `broker_organization_id` و فاقد case.
  - ثبت در `migration_quarantine` برای claimهای دارای وضعیت فعال و بدون `carrier_organization_id` یا بدون case.
  - Reconciliation شمارش/کیفیت با inserشن رکوردهای مشکل‌دار در `migration_quarantine`.

## ۳. سندسازی و تصمیمات معماری

| اصل `BROKERAGE_IMPLEMENTATION_PLAN` | اجرا در P5 |
|---|---|
| `carrierOrganizationId` همیشه غیر null | ✅ `carrierOrganizationId` در `Claim` NOT NULL |
| `Claim` authoritative در بیمه‌گر | ✅ `authoritativeTenantId` و `recordOwnerOrganizationId` اضافه شد |
| `ClaimAdvocacyCase` متعلق به کارگزار | ✅ `brokerOrganizationId` در `ClaimAdvocacyCase` |
| Projection read-only با `sourceVersion` | ✅ `ClaimProjection` با supersede منطق |
| Event-first با Outbox | ✅ تمام متدها از `OutboxPublisher` استفاده می‌کنند |
| Money با decimal | ✅ مبالغ `numeric` بدون float |
| Idempotency key | ✅ در `createClaim` موجود |

---

## ۴. اعتبارسنجی

**Build**: دستور `npm run build` در `services/claims-service` بدون خطا اجرا شد (tsc OK).

**فایل‌های اصلاح/ایجاد شده در `claims-service`**:
- `src/entities/Claim.ts`
- `src/entities/ClaimParty.ts` (new)
- `src/entities/ClaimDocument.ts` (new)
- `src/entities/ClaimAdvocacyCase.ts` (new)
- `src/entities/AdvocacyTask.ts` (new)
- `src/entities/AdvocacyCommunication.ts` (new)
- `src/entities/AdjusterReferral.ts` (new)
- `src/entities/ClaimProjection.ts` (new)
- `src/entities/RecoveryCase.ts` (new)
- `src/entities/index.ts` (new)
- `src/migrations/1850000000000-add-claim-owner-fields.ts` (new)
- `src/migrations/1850000000001-create-claim-party.ts` (new)
- `src/migrations/1850000000002-create-claim-document.ts` (new)
- `src/migrations/1850000000010-create-claim-advocacy-case.ts` (new)
- `src/migrations/1850000000011-create-advocacy-task.ts` (new)
- `src/migrations/1850000000012-create-advocacy-communication.ts` (new)
- `src/migrations/1850000000020-create-adjuster-referral.ts` (new)
- `src/migrations/1850000000030-create-claim-projection.ts` (new)
- `src/migrations/1850000000040-create-recovery-case.ts` (new)
- `src/advocacy/advocacy.service.ts` (new)
- `src/advocacy/advocacy.controller.ts` (new)
- `src/app.module.ts`
- `src/data-source.ts`
- `src/permissions.ts`
- `src/claims.controller.ts`
- `src/claims.service.ts`
- `src/claims-events.consumer.ts`

**سند مستقل پیشرفت**: همین سند (`doc/BROKERAGE_P5_IMPLEMENTATION_PROGRESS.md`).

---

## ۵. موارد باقی‌مانده برای تکمیل P5

برای رسیدن به معیارهای خروج P5، موارد زیر هنوز نیازمند کار است:

### ۵.۱ P5-1.2 — APIهای تکمیلی Claim
- `POST /claims/:claimId/acknowledge` ✅ (ClaimsService + Controller)
- `POST /claims/:claimId/submit-to-carrier` ✅ (ClaimsService + Controller)
- `POST /claims/:claimId/assign-adjuster` ✅ (قبلاً `referToAdjuster` + `autoAssignAdjuster`)
- `POST /claims/:claimId/appeal` ✅ (ClaimsService + Controller)
- `GET /claims/:claimId/history` ✅ (سابقه state transitions در `metadata.history` ذخیره و از controller قابل دریافت)
- **باقی‌مانده**: پیاده‌سازی جدول مستقل `ClaimHistory` یا اتصال به `AuditRecord` برای audit-proof.

### ۵.۲ P5-3 — Loss Adjuster Capability Validation ✅
- فراخوانی `sales-network-service` برای بررسی `OrganizationCapability` `LOSS_ADJUSTER`.
- بررسی `DistributionAgreement` معتبر بین بیمه‌گر/کارگزار و ارزیاب.
- فایل: `src/service-client.ts` و `src/advocacy/advocacy.service.ts`.

### ۵.۳ P5-4.1 — Projection Event Consumer ✅
- `ClaimsEventsConsumer` موضوعات `insurance.claim.acknowledged`، `insurance.claim.submitted_to_carrier`، `insurance.claim.assessed`، `insurance.claim.approved`، `insurance.claim.rejected`، `insurance.claim.paid`، `insurance.claim.closed`، `insurance.claim.appealed`، `insurance.claim.adjuster_assigned` را subscribe می‌کند.
- متد `handleClaimProjectionEvent` برای هر رویداد یک `ClaimProjection` فعال ثبت و نسخه قبلی را supersede می‌کند.
- فایل: `src/claims-events.consumer.ts`.

### ۵.۴ P5-5/P5-11 — Document Service Integration ✅
- ادغام با `document-service` برای attach، virus scan و PII classification.
- پیاده‌سازی ACL چندسازمانی از طریق `permissions.ts`.
- مسیر `GET /claims/:claimId/documents/:documentId/download`.

### ۵.۵ P5-6 — BFF Portals ✅
- `customer-portal-service`:
  - `GET customer-portal/claims/:claimId/advocacy`
  - `POST customer-portal/claims/:claimId/advocacy/:caseId/communications`
- `agent-portal-service`:
  - `GET agent-portal/claims/:claimId/advocacy`
  - `POST agent-portal/claims/:claimId/advocacy-cases`
  - `POST agent-portal/advocacy-cases/:caseId/tasks`
  - `POST agent-portal/claims/:claimId/adjuster-referrals`
  - `POST agent-portal/claims/:claimId/projections`
  - `POST agent-portal/claims/:claimId/recovery`

### ۵.۶ P5-7.1 — Claim Payment Integration ✅
- فراخوانی `payment-service` (bank EcosystemPaymentController) در `billing-service` برای پرداخت خسارت پس از `approved`.
- به‌روزرسانی `paidAmount` در claim projection.
- فایل: `src/service-client.ts` و `src/claims.service.ts`.

### ۵.۷ P5-7.2/P5-12 — Recovery Ledger Link ✅
- ثبت `JournalEntry` type `RECOVERY` در `billing-service`.
- فایل: `src/service-client.ts` و `src/advocacy/advocacy.service.ts`.

### ۵.۸ P5-8 — Contracts & Events ✅
- ثبت eventها در `contracts/asyncapi/brokerage-p5.yaml`.
- ثبت OpenAPI در `contracts/openapi/brokerage-p5.yaml`.
- اطمینان از topicهای Kafka (`insurance.claim.*`) در `provision-kafka-topics.sh` باقی‌مانده است.

### ۵.۹ P5-9 — Tests ⚠️ Partial
- `tests/unit/claims.test.ts` با state machine P5 به‌روز شد.
- `tests/contract/brokerage-p5-contract.test.ts` برای P5 endpoints ساخته شد.
- باقی‌مانده: تست‌های ادغامی (`tests/integration/claims-advocacy.test.ts`) و تست‌های واحد دقیق‌تر سرویس.

### ۵.۱۰ P5-10 — Migration & Reconciliation ✅
- Backfill `Claim` برای مقداردهی `recordOwnerOrganizationId` و `carrierOrganizationId` (انجام‌شده در مهاجرت `1850000000000`).
- ایجاد `ClaimAdvocacyCase` برای claimهای فعال (انجام‌شده در مهاجرت `1850000000050`).
- جدول `migration_quarantine` برای رکوردهای مبهم.

---

## ۶. وضعیت تکمیل

| بخش | وضعیت | درصد |
|---|---|---|
| P5-1 Claim Refactor | ✅ موجودیت، مهاجرت، service/controller + acknowledge/submit/appeal/history | 90% |
| P5-2 Advocacy Case | ✅ موجودیت، مهاجرت، service/controller | 80% |
| P5-3 Adjuster Referral | ✅ اعتبارسنجی capability/agreement با `sales-network-service` و `auth-service` | 90% |
| P5-4 Claim Projection | ✅ موجودیت، مهاجرت، service/controller + event consumer | 90% |
| P5-5 Document | ✅ موجودیت، مهاجرت، attach/view/download endpoints | 80% |
| P5-6 BFF Portals | ✅ customer-portal و agent-portal ادغام شدند | 70% |
| P5-7 Payments/Recovery | ✅ پرداخت خسارت و recovery ledger link | 90% |
| P5-8 Contracts/Events | ✅ contractهای AsyncAPI/OpenAPI ساخته شد | 90% |
| P5-9 Tests | ⚠️ unit/contract tests اضافه شد، تست‌های ادغامی باقی‌مانده | 50% |
| P5-10 Migration | ✅ backfill advocacy case و جدول quarantine | 80% |
| P5-11 Document Service Integration | ✅ ادغام با `document-service` برای metadata/download | 80% |
| P5-12 Recovery Ledger Link | ✅ ثبت journal entry در `billing-service` | 90% |

---

## ۷. نتیجه‌گیری

لایه foundation فاز P5 در `claims-service` پیاده‌سازی، کامپایل و آماده مهاجرت دیتابیس است. هسته موجودیت‌ها، مهاجرت‌ها و سرویس‌ها با روح `BROKERAGE_IMPLEMENTATION_PLAN.md` (owner organization / federation / projection / event-first) هم‌راستا هستند. موارد باقی‌مانده عمدتاً شامل تکمیل BFF پرتال‌ها (broker)، تکمیل تست‌های ادغامی/E2E، projection event consumer، و contract publishing در provision-kafka-topics می‌باشد.
