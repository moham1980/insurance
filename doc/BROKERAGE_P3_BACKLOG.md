# بکلاگ اجرایی فاز P3 — Policy & Commission

هدف فاز P3 این است که پس از bind/Placement در P2، بیمه‌نامه به‌صورت کامل authoritative در بیمه‌گر صادر شود، lifecycle آن (endorsement/renewal/cancellation) مدیریت شود و کمیسیون‌ها به‌درستی محاسبه، ثبت و تسویه گردند. این فاز به P0 تا P2 وابسته است.

## اصول کلی P3

- `Policy` authoritative در `issuerOrganizationId` نگهداری می‌شود.
- کارگزار از `PolicyProjection` تغذیه می‌کند؛ تغییرات بیمه‌نامه از بیمه‌گر push یا pull می‌شوند.
- Endorsement/Renewal هرگز بدون approval workflow نیست.
- کمیسیون‌ها با سند دوبل (double-entry) در ledger ثبت می‌شوند.
- `CommissionSplit` شفاف و auditable است.
- پرداخت‌ها از طریق `payment-service` ecosystem انجام می‌شوند (اکوسیستم Phase 3b آماده است).
- همه eventها در contract repository ثبت می‌شوند.

---

## P3-0 — پیش‌نیازها از P0 تا P2

قبل از شروع P3 موارد زیر باید کامل باشند:

- P0-1 Organization/Tenant/Capability
- P0-2 Party/Identity/Role
- P0-4 Distribution Agreement
- P0-6 ABAC
- P0-7 RLS
- P0-8 Audit Log
- P1-1 Product Versioning
- P1-2 Product Visibility
- P1-4 Agreement Eligibility
- P2-1 Submission
- P2-3 Quote Request/Response
- P2-5 Placement & Bind Saga
- P2-6 Policy Projection
- P2-8 Event/Contract

---

## P3-1 — Policy Lifecycle (Authoritative)

### P3-1.1 موجودیت Policy

**هدف**: بازطراحی Policy برای مالکیت واضح و lifecycle کامل.

**فایل‌ها**:
- `services/policy-service/src/entities/Policy.ts` (بازبینی)
- `services/policy-service/src/entities/PolicyCoverage.ts`
- `services/policy-service/src/entities/PolicyParty.ts`
- `services/policy-service/src/entities/PolicyDocument.ts`

**موجودیت**:

```typescript
interface Policy {
  policyId: string;
  policyNumber: string;
  uniqueCode?: string;              // کد یکتا سنهاب
  tenantId: string;
  recordOwnerOrganizationId: string; // tenant صادرکننده / recorder
  issuerOrganizationId: string;     // بیمه‌گر صادرکننده
  distributionOrganizationId: string; // کارگزار/آژانس/MGA
  servicingOrganizationId?: string;
  authoritativeTenantId: string;    // source of truth در federation
  producerPartyId?: string;
  subAgentPartyId?: string;
  marketerPartyId?: string;
  salesChannelType: 'DIRECT' | 'BROKER' | 'AGENT' | 'MGA' | 'BANCASSURANCE' | 'ONLINE' | 'OFFLINE';
  sourceSystemId: string;
  externalPolicyId?: string;
  placementId?: string;
  customerPartyId: string;
  lineOfBusiness: string;
  productId: string;
  productVersion: number;
  startDate: Date;
  endDate: Date;
  status: 'inquiry' | 'bound' | 'issued' | 'active' | 'endorsed' | 'renewed' | 'cancelled';
  premium: Money;
  taxes: Money;
  fees: FeeLine[];
  totalPayable: Money;
  policyTerms: Record<string, any>;
  coverages: Coverage[];
  deductibles: Deductible[];
  commissionSplitSnapshot: CommissionSplitSnapshot;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CommissionSplitSnapshot {
  grossPremium: Money;
  commissionBps: number;
  brokerShareAmount: Money;
  splits: { partyId?: string; role: string; shareBps: number; amount: Money }[];
}

interface PolicyCoverage {
  policyCoverageId: string;
  policyId: string;
  coverageCode: string;
  limit: Money;
  deductible: Money;
  premium: Money;
  status: 'active' | 'removed';
}

interface PolicyParty {
  policyPartyId: string;
  policyId: string;
  partyId: string;
  role: 'INSURED' | 'BENEFICIARY' | 'PAYER' | 'BROKER' | 'AGENT' | 'CLAIMANT';
  allocation: number;
}
```

**مهاجرت‌ها**:
- `V1830000000__add_policy_owner_fields.sql`
- `V1830000001__create_policy_coverage.sql`
- `V1830000002__create_policy_party.sql`
- `V1830000003__create_policy_document.sql`

**معیار پذیرش**:
- `issuerOrganizationId` و `distributionOrganizationId` هرگز null نیستند.
- `tenantId` و `authoritativeTenantId` در P3 برابر هستند؛ آماده federation.
- هر policy دارای `placementId` یا منبع ایجاد دستی ثبت شده باشد.
- policy number و uniqueCode یکتاست.

### P3-1.2 API Policy Management

**فایل‌ها**:
- `services/policy-service/src/policy.controller.ts` (بازبینی)
- `services/policy-service/src/policy.service.ts` (بازبینی)

**APIهای پیشنهادی**:

```text
POST /api/v1/policies
GET /api/v1/policies
GET /api/v1/policies/{policyId}
PATCH /api/v1/policies/{policyId}
GET /api/v1/policies/{policyId}/coverages
POST /api/v1/policies/{policyId}/renewals
POST /api/v1/policies/{policyId}/endorsements
POST /api/v1/policies/{policyId}/cancellations
GET /api/v1/policies/{policyId}/history
```

**معیار پذیرش**:
- فقط `issuerOrganizationId` یا `distributionOrganizationId` مرتبط با کاربر امکان read/update دارد.
- cancellation فقط با دلیل و approval workflow انجام می‌شود.
- history تمام endorsement/renewal/cancellation را بازمی‌گرداند.

**وابستگی**: P0-6.2، P2-6.1

---

## P3-2 — Endorsement / Renewal

### P3-2.1 موجودیت Endorsement

**هدف**: مدیریت تغییرات بیمه‌نامه و تجدید آن.

**فایل‌ها**:
- `services/policy-service/src/entities/Endorsement.ts`
- `services/policy-service/src/entities/EndorsementChange.ts`

**موجودیت**:

```typescript
interface Endorsement {
  endorsementId: string;
  tenantId: string;
  policyId: string;
  endorsementType: 'change' | 'renewal' | 'cancellation' | 'rewrite';
  effectiveDate: Date;
  requestedByPartyId: string;
  approvedByPartyId?: string;
  premiumDelta: Money;
  taxDelta: Money;
  status: 'draft' | 'submitted' | 'approved' | 'applied' | 'rejected';
  changes: EndorsementChange[];
  sourcePlacementId?: string;
  createdAt: Date;
}

interface EndorsementChange {
  changeId: string;
  endorsementId: string;
  field: string;
  oldValue: any;
  newValue: any;
  reason: string;
}
```

**مهاجرت**:
- `V1830000010__create_endorsement.sql`
- `V1830000011__create_endorsement_change.sql`

**معیار پذیرش**:
- endorsement فقط روی policy با status `active` ایجاد می‌شود.
- هر تغییر با `oldValue` و `newValue` ثبت می‌شود.
- تغییر premium منجر به جریان financial adjustment می‌شود (P3-5).
- renewal منجر به نسخه جدید بیمه‌نامه و بستن نسخه قبلی می‌شود.

### P3-2.2 Renewal Workflow

**فایل‌ها**:
- `services/workflow-engine-service/src/processes/renewal.process.ts` (جدید)
- `services/policy-service/src/renewal/renewal.service.ts`

**مراحل**:

```text
1. Detect policies expiring in N days
2. Pre-renewal quote via RFQ engine (if broker/MGA)
3. Customer notification and consent
4. Payment authorization / premium collection
5. Issue renewal policy
6. Emit PolicyRenewed.v1
```

**معیار پذیرش**:
- renewal فقط با consent مشتری انجام می‌شود.
- در صورت عدم موفقیت، policy به `lapsed` می‌رود.
- renewal number به policy اصلی link می‌شود.

### P3-2.3 Endorsement API

**APIهای پیشنهادی**:

```text
POST /api/v1/policies/{policyId}/endorsements
GET /api/v1/policies/{policyId}/endorsements
POST /api/v1/endorsements/{endorsementId}/submit
POST /api/v1/endorsements/{endorsementId}/approve
POST /api/v1/endorsements/{endorsementId}/apply
POST /api/v1/endorsements/{endorsementId}/reject
```

**وابستگی**: P3-1.1

---

## P3-3 — Policy Projection Sync

### P3-3.1 Sync از بیمه‌گر به کارگزار

**هدف**: تضمین consistency projection در کارگزار.

**فایل‌ها**:
- `services/policy-service/src/projection/projection-sync.service.ts`
- `services/policy-service/src/projection/projection-event-handler.ts`

**eventهای مصرفی**:

```text
PolicyIssued.v1
PolicyEndorsed.v1
PolicyRenewed.v1
PolicyCancelled.v1
PolicyLapsed.v1
```

**معیار پذیرش**:
- projection در کارگزار فقط منعکس‌کننده eventهای بیمه‌گر است.
- در صورت conflict version، projection جدید supersede می‌شود.
- تاخیر sync کمتر از ۵ ثانیه (در حالت غیر federation) قابل قبول است.
- همه sync‌ها با `correlationId` و `sourceVersion` ثبت می‌شوند.

**وابستگی**: P2-6.1

---

## P3-4 — Commission Engine

### P3-4.1 موجودیت CommissionSplit

**هدف**: محاسبه شفاف کمیسیون بر اساس DistributionAgreement.

**فایل‌ها**:
- `services/billing-service/src/commission/commission-split.entity.ts`
- `services/billing-service/src/commission/commission-calculation.service.ts`

**موجودیت**:

```typescript
interface CommissionSplit {
  splitId: string;
  journalEntryId: string;
  partyId?: string;
  organizationId: string;
  role: 'CARRIER' | 'BROKER' | 'AGENT' | 'SUB_AGENT' | 'MARKETER';
  base: 'premium_gross' | 'premium_net';
  shareBps: number;
  amount: Money;
  effectiveFrom: Date;
  status: 'accrued' | 'paid' | 'clawback' | 'voided';
}
```

**مهاجرت**:
- `V1830000020__create_commission_split.sql`

**معیار پذیرش**:
- مجموع `CommissionSplit.amount` با مبلغ کمیسیون محاسبه‌شده در precision مشخص برابر باشد.
- هر split دقیقاً یک `partyId` یا `organizationId` و یک `role` معتبر داشته باشد.
- `journalEntryId` پس از posting معتبر و immutable باشد.
- `base`, `shareBps` و `effectiveFrom` در زمان محاسبه snapshot شوند.
- clawback فقط از مسیر endorsement/cancellation و با وضعیت `clawback` ثبت شود.

### P3-4.2 محاسبه کمیسیون

**فایل‌ها**:
- `services/billing-service/src/commission/commission-calculation.service.ts`
- `services/billing-service/src/commission/commission-tier-resolver.ts`

**منطق**:

- استفاده از `DistributionAgreement.commissionSchedule` در زمان bind.
- لحاظ tier و bonus.
- محاسبه split برای broker/agent/sub-agent/marketer.
- ثبت در `CommissionSplit`.

**معیار پذیرش**:
- محاسبه کمیسیون برای placement در کمتر از ۱ ثانیه انجام می‌شود.
- تست با چندین tier و split.
- تست منفی: override کمیسیون بدون approval رد می‌شود.

**وابستگی**: P0-4.1، P2-5.2

---

## P3-5 — Ledger & Financial Posting

### P3-5.1 موجودیت‌های حسابداری

**هدف**: ثبت دوبل تمام مبادلات مالی.

**فایل‌ها**:
- `services/billing-service/src/ledger/ledger-account.entity.ts`
- `services/billing-service/src/ledger/journal-entry.entity.ts`
- `services/billing-service/src/ledger/journal-line.entity.ts`

**موجودیت‌ها**:

```typescript
interface LedgerAccount {
  accountId: string;
  tenantId: string;
  organizationId: string;
  code: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'CONTROL';
  currency: string;
  status: 'active' | 'closed';
}

interface JournalEntry {
  journalEntryId: string;
  tenantId: string;
  organizationId: string;
  sourceType: 'POLICY' | 'PAYMENT' | 'REFUND' | 'COMMISSION' | 'SETTLEMENT' | 'CLAWBACK';
  sourceId: string;
  idempotencyKey: string;
  postingDate: Date;
  periodId: string;
  status: 'posted' | 'reversed';
  lines: JournalLine[];
}

interface JournalLine {
  journalLineId: string;
  journalEntryId: string;
  accountId: string;
  debit: Money;
  credit: Money;
  dimensions: Record<string, string>; // carrier, broker, product, policy, branch
}
```

**مهاجرت**:
- `V1830000030__create_ledger_account.sql`
- `V1830000031__create_journal_entry.sql`
- `V1830000032__create_journal_line.sql`

**معیار پذیرش**:
- هر journal entry مجموع debit = credit.
- `idempotencyKey` جلوگیری از double posting.
- reversal یک journal entry معکوس ثبت می‌کند؛ سند اصلی حذف نمی‌شود.
- dimensions حداقل شامل carrier, broker, product, policy, branch باشد.

### P3-5.2 Posting Jobs

**فایل‌ها**:
- `services/billing-service/src/ledger/policy-posting.service.ts`
- `services/billing-service/src/ledger/commission-posting.service.ts`

**عملیات**:

- صدور policy: ثبت premium receivable و unearned premium.
- دریافت payment: بستن receivable و افزایش bank/escrow.
- کمیسیون: ثبت payable و expense.
- endorsement: reversal + new entry.
- cancellation: reversal premium/commission و refund payable.

**معیار پذیرش**:
- تست double-entry برای هر نوع posting.
- تست reversal کامل برای cancellation.
- هیچ posting بدون `periodId` انجام نمی‌شود.

**وابستگی**: P3-4.1

---

## P3-6 — Payable / Receivable & Settlement

### P3-6.1 موجودیت‌های Payable/Receivable

**فایل‌ها**:
- `services/billing-service/src/payables/payable.entity.ts`
- `services/billing-service/src/receivables/receivable.entity.ts`
- `services/billing-service/src/settlement/settlement-batch.entity.ts`

**موجودیت‌ها**:

```typescript
interface Payable {
  payableId: string;
  debtorOrganizationId: string;
  creditorOrganizationId: string;
  relatedPolicyId?: string;
  type: 'PREMIUM' | 'TAX' | 'LEVY' | 'FEE';
  amount: Money;
  dueDate: Date;
  status: 'open' | 'paid' | 'overdue' | 'written_off' | 'disputed';
}

interface Receivable {
  receivableId: string;
  creditorOrganizationId: string;
  debtorOrganizationId: string;
  type: 'COMMISSION' | 'BONUS' | 'SERVICE_FEE' | 'REFUND';
  amount: Money;
  dueDate: Date;
  status: 'open' | 'paid' | 'clawback' | 'written_off' | 'disputed';
}

interface SettlementBatch {
  batchId: string;
  fromOrganizationId: string;
  toOrganizationId: string;
  periodStart: Date;
  periodEnd: Date;
  totalPremium: Money;
  totalCommission: Money;
  netSettlement: Money;
  reconciliationHash: string;
  status: 'draft' | 'confirmed' | 'paid' | 'reconciled' | 'disputed';
}
```

**مهاجرت**:
- `V1830000040__create_receivable.sql`
- `V1830000041__create_payable.sql`
- `V1830000042__create_settlement_batch.sql`

**معیار پذیرش**:
- هر `Receivable`/`Payable` به source policy/commission link باشد.
- `SettlementBatch` فقط پس از approval و reconciliation قابل پرداخت است.
- netting premium و commission با signed approval.

### P3-6.2 تسویه با اکوسیستم payment-service

**هدف**: استفاده از `payment-service` برای انتقال وجوه.

**فایل‌ها**:
- `services/billing-service/src/payments/settlement-payment.service.ts`
- `services/billing-service/src/payments/payment-gateway.service.ts` (ECOSYSTEM provider)

**APIهای اکوسیستم**:

```text
POST /api/v1/ecosystem/payments/initiate
GET /api/v1/ecosystem/payments/{paymentId}
```

**معیار پذیرش**:
- فراخوان به `payment-service` با `X-Idempotency-Key`.
- استفاده از حساب escrow مربوط به insurance که از `accountRef` محیطی/Vault resolve شده است.
- تغییر وضعیت payment به `SETTLED` منجر به بستن payable/receivable می‌شود.
- failure منجر به retry با backoff و نهایتاً manual queue می‌شود.

**وابستگی**: P3-5.2

---

## P3-7 — Event‌ها و Contract

### P3-7.1 Eventهای P3

**eventهای پیشنهادی**:

```text
PolicyIssued.v1
PolicyEndorsed.v1
PolicyRenewed.v1
PolicyCancelled.v1
PolicyLapsed.v1
PolicyProjectionUpdated.v1
CommissionCalculated.v1
CommissionPosted.v1
CommissionClawedBack.v1
JournalEntryPosted.v1
JournalEntryReversed.v1
SettlementBatchCreated.v1
SettlementBatchApproved.v1
SettlementBatchPaid.v1
```

**معیار پذیرش**:
- همه eventها در AsyncAPI ثبت شوند.
- producer/consumer contract test pass شوند.
- انتشار با Outbox.

### P3-7.2 OpenAPI

**فایل‌ها**:
- `D:\CascadeProjects\ecosystem\contracts\openapi\policy-service\openapi.yaml`
- `D:\CascadeProjects\ecosystem\contracts\openapi\billing-service\openapi.yaml`

**وابستگی**: P2-8.2

---

## P3-8 — تست‌ها

### P3-8.1 Unit/Integration Tests

**فایل‌ها**:
- `services/policy-service/test/endorsement.spec.ts`
- `services/policy-service/test/renewal.spec.ts`
- `services/billing-service/test/commission.spec.ts`
- `services/billing-service/test/ledger-posting.spec.ts`

**تست‌های الزامی**:

- endorsement تغییر premium و coverage.
- renewal ایجاد policy جدید و closure قبلی.
- cancellation با reversal کامل ledger.
- commission split با چندین tier.
- ledger double-entry برای policy، payment، commission، clawback.
- settlement batch netting و payment integration.

### P3-8.2 E2E Tests

**فایل‌ها**:
- `e2e/policy-commission.spec.ts`

**سناریوها**:

- placement → bind → policy issued → commission calculated → ledger posted → settlement paid.
- endorsement premium increase → adjustment ledger.
- cancellation → reversal premium and commission.

**وابستگی**: P3-6.2

---

## P3-9 — Migration

### P3-9.1 Backfill Policy و Commission

**اقدامات**:
- ایجاد `Policy` از `Placement`های P2.
- backfill `PolicyCoverage`, `PolicyParty`.
- ایجاد `CommissionSplit` از commission contracts موجود.
- ایجاد `LedgerAccount` و `JournalEntry` اولیه برای migration.

### P3-9.2 Reconciliation

**معیار پذیرش**:
- تعداد بیمه‌نامه‌ها و جمع premium قبل و بعد برابر است.
- هیچ policy بدون `issuerOrganizationId` و `distributionOrganizationId` نماند.
- commission splits با قراردادهای تاریخی reconcile شوند.
- رکوردهای مبهم در `migration_quarantine` قرار گیرند.

**وابستگی**: P2-10.2

---

## نقشه زمانی P3

```text
Week 1:
  P3-1.1, P3-1.2 (Policy Lifecycle)
  P3-2.1, P3-2.2, P3-2.3 (Endorsement/Renewal)
  P3-3.1 (Projection Sync)

Week 2:
  P3-4.1, P3-4.2 (Commission Engine)
  P3-5.1, P3-5.2 (Ledger Posting)

Week 3:
  P3-6.1, P3-6.2 (Payable/Receivable & Settlement)
  P3-7.1, P3-7.2 (Event & Contract)

Week 4:
  P3-8.1, P3-8.2 (Tests)
  P3-9.1, P3-9.2 (Migration)
  Bug fixing, reconciliation, demo
```

---

## معیارهای خروج P3

P3 کامل است اگر و فقط اگر:

- بیمه‌نامه authoritative با lifecycle کامل قابل مدیریت باشد.
- endorsement/renewal/cancellation با workflow و ledger adjustment اجرا شود.
- projection در کارگزار با eventها sync شود.
- commission بر اساس agreement snapshot محاسبه و split شود.
- ledger دوبل برای تمام postingها وجود داشته باشد.
- payable/receivable و settlement batch قابل ایجاد و تسویه باشند.
- payment-service ecosystem برای settlement فراخوان شود.
- تست‌های E2E برای happy path و reversal pass شوند.
- migration با reconciliation موفق انجام شده باشد.

---

## اصلاحات و تکمیلی پس از تطبیق با BROKERAGE_IMPLEMENTATION_PLAN.md

### P3-10 — Payable / Receivable / SettlementBatch Alignment

**هدف**: هماهنگ‌سازی مدل مالی با بخش ۳.۹ سند طراحی؛ `Payable` و `Receivable` عمداً بر اساس جهت بدهکار/بستانکار و نوع تعهد تفکیک می‌شوند.

**موجودیت‌های مرجع**:
```typescript
interface Payable {
  payableId: string;
  debtorOrganizationId: string;
  creditorOrganizationId: string;
  relatedPolicyId?: string;
  type: 'PREMIUM' | 'TAX' | 'LEVY' | 'FEE';
  amount: Money;
  dueDate: Date;
  status: 'open' | 'paid' | 'overdue' | 'written_off' | 'disputed';
}

interface Receivable {
  receivableId: string;
  creditorOrganizationId: string;
  debtorOrganizationId: string;
  type: 'COMMISSION' | 'BONUS' | 'SERVICE_FEE' | 'REFUND';
  amount: Money;
  dueDate: Date;
  status: 'open' | 'paid' | 'clawback' | 'written_off' | 'disputed';
}

interface SettlementBatch {
  batchId: string;
  fromOrganizationId: string;
  toOrganizationId: string;
  periodStart: Date;
  periodEnd: Date;
  totalPremium: Money;
  totalCommission: Money;
  netSettlement: Money;
  reconciliationHash: string;
  status: 'draft' | 'confirmed' | 'paid' | 'reconciled' | 'disputed';
}
```

**معیار پذیرس**:
- `Payable` برای premium/tax/levy/fee و `Receivable` برای commission/bonus/service fee/refund مطابق جهت بدهکار/بستانکار استفاده شود.
- `SettlementBatch` حتماً `periodStart`/`periodEnd`، `totalPremium`، `totalCommission` و `reconciliationHash` داشته باشد.
- قبل از payment، `netSettlement` با ledger و `reconciliationHash` تایید شود.

### P3-11 — Ledger Link for CommissionSplit

**هدف**: هر `CommissionSplit` پس از posting به `JournalEntry` link شود.

**اقدامات**:
- `journalEntryId` در `CommissionSplit` ثبت شود.
- `base` (gross_premium/net_premium) برای audit commission ذخیره شود.
- `effectiveFrom` تاریخ شروع اعتبار split را نگه دارد.

### P3-12 — Collections Service Module

**هدف**: مدیریت installments و receivables مطابق سند طراحی سرویس `collections-service`.

**فایل‌ها**:
- `services/collections-service/src/installment.service.ts` (یا ماژول در `billing-service`)
- `services/collections-service/src/receivable.service.ts`

**معیار پذیرس**:
- installment plan و overdue tracking با `Receivable` link شود.
- reminder/penalty workflow به workflow-service متصل گردد.

---

## نکات اجرایی

- ledger accountها در P3 فقط برای insurance ایجاد می‌شوند؛ ادغام با accounting سازمانی در P6 انجام می‌شود.
- حساب escrow فقط از `accountRef` محیطی/Vault (`INSURANCE_ESCROW_ACCOUNT_REF`) resolve می‌شود و شماره حساب در کد، backlog یا contract ثبت نمی‌شود.
- clawback فقط از طریق endorsement/cancellation و با journal entry reversal.
- netting settlement باید با agreement طرفین و signed approval انجام شود.
- commission split باید قبل از payment به تایید `broker_admin` یا `broker_finance` برسد.
- هرگونه تغییر در policy نسخه جدید یا endorsement ایجاد می‌کند؛ never update in place.

این بکلاگ مستقیماً از `BROKERAGE_IMPLEMENTATION_PLAN.md` مشتق شده و آماده پیاده‌سازی فاز Policy & Commission است.
