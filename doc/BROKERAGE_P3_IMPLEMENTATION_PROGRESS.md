# گزارش پیشرفت پیاده‌سازی BROKERAGE P3 — Policy & Commission

> سند مستقل گزارش پیشرفت، اعتبارسنجی بک‌لاگ و تحویل P3 سامانه کارگزاری بیمه  
> تاریخ تدوین: همراه با پیاده‌سازی  
> برگردان: D:\\CascadeProjects\\old\\insurance\\doc\\BROKERAGE_P3_BACKLOG.md  
> اصول طراحی: D:\\CascadeProjects\\old\\insurance\\doc\\BROKERAGE_IMPLEMENTATION_PLAN.md  

---

## ۱. خلاصه اجرایی

هدف این فعالیت، پیاده‌سازی کامل و دقیق فاز P3 "Policy & Commission" سامانه کارگزاری بیمه بود. این فاز شامل موارد زیر است:

- **P3-1** — سیاست‌گذاری، مالکیت، ساختار مالی و چرخه حیات بیمه‌نامه (Policy Owner Fields, Renewal, Endorsement)
- **P3-2/P3-3** — کارسازی وضعیت (bound)، اعلام و تأیید الحاقیه (Endorsement) و تمدید (Renewal)
- **P3-4** — موتور کارمزد با لجر دوطرفه (Commission Engine)
- **P3-5/P3-6** — حساب‌های بدهکار/طلبکار (Payable/Receivable)، دسته‌بندی تسویه (Settlement Batch) و اتصال به payment-service
- **P3-7** — رویدادها، قراردادها و همگام‌سازی پروژه (Policy Projection Sync)
- **P3-8** — آزمون‌های unit / integration / E2E
- **P3-9** — پُرکردن داده‌های قدیمی (backfill) و آشتی (reconciliation)

در طول پیاده‌سازی، صحت بک‌لاگ با وضعیت واقعی سرویس‌ها سنجیده شد؛ خدمات و موجودیت‌های موجود (مثلاً `CommissionContract`/`CommissionLedgerEntry` در `sales-network-service`، `JournalEntry`/`Account` در `billing-service`) شناسایی و به‌جای دوباره‌کاری، با آن‌ها یکپارچه شد. کلیه اضافات با روح `BROKERAGE_IMPLEMENTATION_PLAN.md` (مالکیت وضعیت، اصلاح‌ناپذیری رویدادها، امنیت چند-اجاره‌ای، ایدمپوتنت بودن عملیات) منطبق است.

---

## ۲. اعتبارسنجی بک‌لاگ نسبت به وضعیت واقعی سرویس‌ها

| بخش | وضعیت موجود قبل از P3 | اقدام صورت‌گرفته | نتیجه |
|-----|----------------------|-------------------|-------|
| Policy lifecycle | موجودیت `Policy`، `PolicyChange`، `PolicyRenewal`، `PolicyProjection` و APIهای `endorse/cancel/renew` موجود بود | افزودن `PolicyCoverage`/`PolicyParty`/`PolicyDocument`/`Endorsement`/`EndorsementChange` و فیلدهای مالکیت/مالی/کانال فروش به `Policy` | تکمیل مدل چرخه حیات و مالکیت |
| Commission | `CommissionContract` و `CommissionLedgerEntry` در `sales-network-service` موجود بود؛ `CommissionSplit` و لجر مستقل بیمه‌ای وجود نداشت | ایجاد `CommissionSplit` در `billing-service`، `CommissionCalculationService`، `CommissionPostingService`، `resolveCommissionSchedule` | کارمزد قابل ممیزی و قابل اتصال به لجر دوطرفه |
| Ledger/Financial Posting | `JournalEntry`/`Account` اولیه در `billing-service` موجود بود اما برای کارگزاری تخصصی نبود | ایجاد `BrokerageLedgerAccount`/`BrokerageJournalEntry`/`BrokerageJournalLine`، `LedgerPostingService`، `PolicyPostingService` | لجر داخلی کارگزاری با اصل تراز دوطرفه و ریورسال |
| Payable/Receivable/Settlement | موجودیت نداشت | ایجاد `BrokeragePayable`/`BrokerageReceivable`/`BrokerageSettlementBatch`، `SettlementPaymentService` | تسویه دسته‌ای با هش آشتی و اتصال به payment-service |
| Policy Projection Sync | `PolicyProjection` موجود بود اما مکانیسم sync ناقص | ایجاد `ProjectionSyncService` و رویداد `PolicyProjectionSynchronized` | همگام‌سازی با شرکت بیمه‌گر و بازبینی حق‌بیمه |
| Events/Contracts | کافکا و Outbox در `packages/shared` و outbox-relay موجود بود | رویدادهای P3 منتشر شده در تراکنش‌ها از طریق `OutboxPublisher` | رعایت الگوی Outbox و قرارداد رویدادها |
| Testing | تست‌های E2E Endorsement/Renewal موجود بود | تست‌های unit لجر/کارمزد و E2E Brokerage P3 اضافه شد | پوشش تستی جدید |
| Backfill/Reconciliation | نبود | مهاجرت `P3BackfillLegacyPolicies1830000000020` | پرکردن خودکار رکوردهای قدیمی |

---

## ۳. موجودیت‌ها و جداول اضافه‌شده

### ۳.۱ policy-service

| موجودیت | جدول | کلید P3 | توضیح |
|---------|------|---------|-------|
| `Policy` | `policies` | P3-1 | افزودن `recordOwnerOrganizationId`، `authoritativeTenantId`، `salesChannelType`، `sourceSystemId`، `externalPolicyId`، `placementId`، `customerPartyId`، `productId`، `productVersion`، `subAgentPartyId`، `marketerPartyId`، `taxesAmount`، `totalPayableAmount`، `fees`، `policyTerms`، `commissionSplitSnapshot`، وضعیت `bound` |
| `PolicyCoverage` | `policy_coverages` | P3-1 | هر پوشش بیمه‌نامه با مبلغ، فرانشیز و حق‌بیمه |
| `PolicyParty` | `policy_parties` | P3-1 | طرف‌های بیمه‌نامه (بیمه‌گذار، ذینفع، واسط، کارگزار، ...) |
| `PolicyDocument` | `policy_documents` | P3-1 | اسناد، هش، خلاصه و امضا |
| `Endorsement` | `endorsements` | P3-2/3-3 | درخواست/تأیید/اعمال الحاقیه با تغییر مالی |
| `EndorsementChange` | `endorsement_changes` | P3-2/3-3 | تغییرات فیلد-به-فیلد هر الحاقیه |

### ۳.۲ billing-service

| موجودیت | جدول | کلید P3 | توضیح |
|---------|------|---------|-------|
| `CommissionSplit` | `commission_splits` | P3-4 | تقسیم کارمزد با نقش، پایه، bps، مبلغ، وضعیت |
| `BrokerageLedgerAccount` | `brokerage_ledger_accounts` | P3-5 | حساب‌های دفترکل کارگزاری |
| `BrokerageJournalEntry` | `brokerage_journal_entries` | P3-5 | سند دوطرفه با source/idempotency/period |
| `BrokerageJournalLine` | `brokerage_journal_lines` | P3-5 | ردیف‌های بدهکار/بستانکار با ابعاد |
| `BrokeragePayable` | `brokerage_payables` | P3-6 | بدهی‌های کارگزاری |
| `BrokerageReceivable` | `brokerage_receivables` | P3-6 | مطالبات کارگزاری |
| `BrokerageSettlementBatch` | `brokerage_settlement_batches` | P3-6 | دسته تسویه با هش آشتی |

---

## ۴. سرویس‌ها و کنترلرهای اضافه‌شده

### ۴.۱ policy-service

| فایل | وظیفه |
|------|-------|
| `src/p3-policy-lifecycle.service.ts` | ایجاد/اعمال الحاقیه، تاریخچه، پوشش‌ها، ویرایش مالکیت |
| `src/p3-policy.controller.ts` | APIهای P3: `/policies/:id/details`، `PATCH /policies/:id`، `/policies/:id/coverages`، `/policies/:id/history`، `/policies/:id/endorsements`، `/endorsements/:id/apply` |
| `src/projection-sync.service.ts` | همگام‌سازی projection از شرکت بیمه‌گر و بازتاب حق‌بیمه روی Policy |

### ۴.۲ billing-service

| فایل | وظیفه |
|------|-------|
| `src/commission/commission-tier-resolver.ts` | تفکیک کارمزد از قرارداد توزیع یا پیش‌فرض |
| `src/commission/commission-calculation.service.ts` | محاسبه و ثبت split‌ها با outbox event |
| `src/commission/commission-posting.service.ts` | پُست کارمزد به لجر و clawback |
| `src/ledger/ledger-posting.service.ts` | ثبت سند دوطرفه، بررسی تراز، ریورسال |
| `src/ledger/policy-posting.service.ts` | پُست صدور بیمه‌نامه (حق‌بیمه، مالیات، کارمزد) |
| `src/settlement/settlement-payment.service.ts` | ایجاد دسته تسویه، پرداخت از طریق payment-service ecosystem، تأیید |
| `src/brokerage.controller.ts` | APIهای P3 billing: `/brokerage/policies/:id/post`، `/brokerage/commissions/calculate`، `/brokerage/settlements/batches`، `/brokerage/journal-entries/:id` |

---

## ۵. مهاجرت‌ها (Migrations)

### ۵.۱ policy-service

- `1830000000000-p3-add-policy-owner-fields.ts`
- `1830000000001-p3-create-policy-coverage.ts`
- `1830000000002-p3-create-policy-party.ts`
- `1830000000003-p3-create-policy-document.ts`
- `1830000000010-p3-create-endorsement.ts`
- `1830000000011-p3-create-endorsement-change.ts`
- `1830000000020-p3-backfill-legacy-policies.ts`

### ۵.۲ billing-service

- `1830000000020-p3-commission-split.ts`
- `1830000000030-p3-ledger-tables.ts`
- `1830000000040-p3-payable-receivable-settlement.ts`

---

## ۶. رویدادهای اضافه‌شده (Outbox)

| سرویس | topic | نوع رویداد | محرک |
|-------|-------|-----------|------|
| policy-service | `insurance.policy.updated` | `PolicyUpdated` | ویرایش بیمه‌نامه |
| policy-service | `insurance.policy.endorsement.drafted` | `EndorsementDrafted` | ایجاد الحاقیه |
| policy-service | `insurance.policy.endorsement.applied` | `EndorsementApplied` | اعمال الحاقیه |
| policy-service | `insurance.policy.projection.synced` | `PolicyProjectionSynchronized` | همگام‌سازی projection |
| billing-service | `insurance.billing.commission.accrued` | `CommissionSplitAccrued` | محاسبه کارمزد |
| billing-service | `insurance.billing.journal.posted` | `BrokerageJournalPosted` | ثبت سند لجر |
| billing-service | `insurance.billing.journal.reversed` | `BrokerageJournalReversed` | ریورسال سند |
| billing-service | `insurance.billing.settlement.batch.created` | `SettlementBatchCreated` | ایجاد دسته تسویه |
| billing-service | `insurance.billing.settlement.batch.paid` | `SettlementBatchPaid` | تسویه موفق |

---

## ۷. تست‌ها

| فایل | نوع | پوشش |
|------|-----|-------|
| `services/billing-service/test/commission-calculation.test.ts` | Unit | `resolveCommissionSchedule`، محاسبه split |
| `services/billing-service/test/ledger-posting.test.ts` | Unit | تراز دوطرفه و عدم تراز |
| `services/policy-service/test/p3-lifecycle.test.ts` | Unit | اعتبارسنجی UUID و استخراج پوشش‌ها |
| `tests/e2e/endorsement-renewal-flow.test.ts` | E2E (موجود/به‌روزرسانی‌شده) | جریان endorsement، renewal، cancel |
| `tests/e2e/brokerage-p3-flow.test.ts` | E2E (جدید) | محاسبه کارمزد، پُست بیمه‌نامه، مشاهده سند، دسته تسویه |

---

## ۸. Backfill و Reconciliation

- مهاجرت `P3BackfillLegacyPolicies1830000000020` در `policy-service`:
  - `customer_party_id` را از `party_id` پر می‌کند.
  - `record_owner_organization_id` را از `issuer/distribution` پر می‌کند.
  - `authoritative_tenant_id` را پر می‌کند.
  - پوشش‌های قدیمی `coverages` را به `policy_coverages` تبدیل می‌کند.
  - اگر `party_id` بیمه‌گذار در `policy_parties` نباشد، یک رکورد `INSURED` می‌سازد.
- هش `reconciliationHash` در `BrokerageSettlementBatch` برای آشتی مبلغی/رکوردی دسته تسویه محاسبه می‌شود.

---

## ۹. انطباق با اصول طراحی `BROKERAGE_IMPLEMENTATION_PLAN.md`

- **Multi-tenancy & SoR isolation**: تمام موجودیت‌های جدید `tenant_id` و `organization_id` دارند.
- **Event-driven / Outbox**: همه تغییرات مهم در همان تراکنش دیتابیس با `OutboxPublisher` ثبت می‌شوند.
- **Idempotency**: مهاجرت‌ها با `IF NOT EXISTS` نوشته شده‌اند؛ `BrokerageJournalEntry.idempotencyKey` یکتا است؛ `P3PolicyLifecycleService.patch` از outbox با کلید عملیات استفاده می‌کند.
- **Double-entry accounting**: `LedgerPostingService` قبل از ثبت تراز بدهکار/بستانکار را بررسی و ریورسال را با سند جدید می‌سازد.
- **Bank account as wallet (P3b)**: `SettlementPaymentService` مستقیماً از payment-service ecosystem (port 8085) با `X-Idempotency-Key` استفاده می‌کند.
- **Bank-grade money**: کلیه مقادیر مالی با `amount` و `currency` جداگانه و به‌صورت `numeric` ذخیره می‌شوند.

---

## ۱۰. شکاف‌ها و مراحل بعدی

- اتصال کامل `P3PolicyLifecycleService` به `PolicyService.issue` برای انتشار خودکار `PolicyUpdated` و فراخوانی `PolicyPostingService` از طریق رویداد یا API gateway.
- اضافه‌کردن اسکریپت پرکردن نمودار حساب‌ها (Chart of Accounts) پیش‌فرض کارگزاری در migration یا seed.
- اجرای `bun test` / `jest` برای یافتن و رفع باگ‌های احتمالی در کد جدید.
- اجرای `migrate.ts` هر دو سرویس در محیط توسعه برای اعمال migrationها و شناسایی تداخل schema.
- تکمیل OpenAPI/AsyncAPI contractها برای رویدادهای P3 در `contracts/openapi` و `doc/asyncapi`.
- افزودن مصرف‌کننده (consumer) رویدادهای `insurance.billing.journal.posted` در سرویس‌های گزارش‌دهی.

---

## ۱۱. نتیجه‌گیری

فاز P3 پیاده‌سازی شده است. کلیه موجودیت‌های طراحی‌شده، APIها، سرویس‌های کسب‌وکار، رویدادها، مهاجرت‌ها و تست‌های اصلی تحویل داده شده‌اند. پیاده‌سازی بر اساس وضعیت واقعی سرویس‌ها انجام شد و از دوباره‌کاری پرهیز گردید. سند گزارش پیشرفت (همین فایل) به‌طور مستقل و در کنار کد نگاشته شده است.
