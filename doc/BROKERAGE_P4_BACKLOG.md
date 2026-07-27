# بکلاگ اجرایی فاز P4 — Payments & Settlement

هدف فاز P4 این است که تمام جریان‌های پرداخت (دریافت حق‌بیمه از مشتری، بازپرداخت، تسویه با بیمه‌گر/شبکه فروش، escrow و reconciliation) به‌صورت کامل و با استفاده از `payment-service` اکوسیستم پیاده‌سازی شوند. این فاز مستقیماً روی P0 تا P3 بنا شده و فرض می‌کند ledger و payable/receivable در P3 آماده هستند.

## اصول کلی P4

- هیچ سرویسی wallet یا balance مستقل نگهداری نمی‌کند؛ همه پول از طریق `payment-service` بین حساب‌های بانکی حرکت می‌کند.
- حساب escrow از `accountRef` محیطی/Vault resolve می‌شود و هیچ شماره حسابی در کد یا سند hardcode نمی‌شود.
- هر پرداخت دارای `idempotencyKey`، `correlationId` و `sourceType/sourceId` است.
- state machine پرداخت قابل مشاهده و auditable باشد.
- refund و clawback از طریق ledger reversal و پرداخت معکوس انجام می‌شود.
- settlement batch فقط پس از reconciliation و approval قابل پرداخت است.
- همه APIها و eventها در contract repository ثبت می‌شوند.

---

## P4-0 — پیش‌نیازها از P0 تا P3

قبل از شروع P4 موارد زیر باید کامل باشند:

- P0-1 Organization/Tenant/Capability
- P0-2 Party/Identity/Role
- P0-6 ABAC
- P0-7 RLS
- P0-8 Audit Log
- P2-5 Placement & Bind Saga
- P3-1 Policy Lifecycle
- P3-4 Commission Engine
- P3-5 Ledger Posting
- P3-6 Payable/Receivable & Settlement Batch
- P2-8 Event/Contract Repository

---

## P4-1 — Premium Collection

### P4-1.1 موجودیت PremiumInvoice

**هدف**: صدور فاکتور حق‌بیمه به مشتری با نحوه پرداخت.

**فایل‌ها**:
- `services/billing-service/src/invoicing/premium-invoice.entity.ts`
- `services/billing-service/src/invoicing/invoice-line.entity.ts`
- `services/billing-service/src/invoicing/installment-plan.entity.ts`

**موجودیت‌ها**:

```typescript
interface PremiumInvoice {
  invoiceId: string;
  tenantId: string;
  organizationId: string;        // بیمه‌گر یا کارگزار صادرکننده فاکتور
  policyId: string;
  endorsementId?: string;
  customerPartyId: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  totalPremium: Money;
  taxes: Money;
  fees: FeeLine[];
  totalAmount: Money;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  paymentMethod?: 'card' | 'account_transfer' | 'installment' | 'cash' | 'cheque';
  installmentPlanId?: string;
}

interface InstallmentPlan {
  planId: string;
  invoiceId: string;
  numberOfInstallments: number;
  schedule: InstallmentScheduleItem[];
  status: 'active' | 'completed' | 'defaulted';
}

interface InstallmentScheduleItem {
  itemId: string;
  planId: string;
  installmentNumber: number;
  dueDate: Date;
  amount: Money;
  status: 'open' | 'paid' | 'overdue';
}
```

**مهاجرت‌ها**:
- `V1840000000__create_premium_invoice.sql`
- `V1840000001__create_invoice_line.sql`
- `V1840000002__create_installment_plan.sql`

**معیار پذیرش**:
- فاکتور فقط برای policy با status `bound`، `issued` یا `active` صادر می‌شود.
- مجموع `invoice lines` برابر `totalAmount`.
- فاکتور cancellation فقط قبل از payment و با دلیل مجاز.

### P4-1.2 API فاکتور و اقساط

**فایل‌ها**:
- `services/billing-service/src/invoicing/invoice.controller.ts`
- `services/billing-service/src/invoicing/invoice.service.ts`

**APIهای پیشنهادی**:

```text
POST /api/v1/policies/{policyId}/invoices
GET /api/v1/policies/{policyId}/invoices
GET /api/v1/invoices/{invoiceId}
POST /api/v1/invoices/{invoiceId}/issue
POST /api/v1/invoices/{invoiceId}/cancel
POST /api/v1/invoices/{invoiceId}/installments
POST /api/v1/installments/{itemId}/pay
```

**معیار پذیرش**:
- فقط `issuerOrganizationId` یا `distributionOrganizationId` مرتبط با policy امکان صدور فاکتور دارند.
- فاکتور duplicate برای یک policy/endorsement رد می‌شود.
- اقساط با due date صحیح و پوشش کامل مبلغ ایجاد می‌شوند.

**وابستگی**: P3-1.1

---

## P4-2 — Customer Payment

### P4-2.1 Integration با EcosystemPaymentController

**هدف**: دریافت حق‌بیمه از حساب بانکی مشتری.

**فایل‌ها**:
- `services/billing-service/src/payments/customer-payment.service.ts`
- `services/billing-service/src/payments/payment-gateway.service.ts` (بازبینی)

**API فراخوانی**:

```text
POST /api/v1/ecosystem/payments/initiate
Headers: Authorization: Bearer <JWT>, X-Idempotency-Key: <key>
Body: {
  amount: Money,
  currency: string,
  sourceAccount: string,
  destinationAccount: string, // value resolved from env/vault (e.g. INSURANCE_ESCROW_ACCOUNT_NUMBER); never hardcoded
  rail: 'SATNA' | 'PAYA' | 'SHETAB',
  metadata: { invoiceId, policyId, tenantId, organizationId }
}
```

**معیار پذیرش**:
- فراخوان با `X-Idempotency-Key` unique برای هر invoice.
- `destinationAccount` به escrow insurance می‌رود.
- وضعیت payment از `payment-service` poll می‌شود.
- هر payment به `PremiumInvoice` و `JournalEntry` link می‌شود.
- failure منجر به retry با backoff و نهایتاً `overdue` می‌شود.

### P4-2.2 Payment State Machine

**هدف**: مدیریت وضعیت پرداخت مشتری.

**فایل‌ها**:
- `services/billing-service/src/payments/payment-state-machine.ts`

**state machine**:

```text
INITIATED → AUTHORIZED → SENT_TO_RAIL → RAIL_ACCEPTED → SETTLED
INITIATED → FAILED
```

**معیار پذیرس**:
- transition فقط با event `payment-service` یا timeout انجام شود.
- هر transition با `correlationId` ثبت شود.
- `SETTLED` منجر به update invoice به `paid` یا `partial` شود.

### P4-2.3 API پرداخت مشتری

**APIهای پیشنهادی**:

```text
POST /api/v1/invoices/{invoiceId}/pay
GET /api/v1/payments/{paymentId}
POST /api/v1/payments/{paymentId}/retry
POST /api/v1/payments/{paymentId}/refund
```

**معیار پذیرش**:
- refund فقط برای payment `SETTLED` و با دلیل مجاز.
- refund با `X-Idempotency-Key` و ledger reversal همراه است.
- retry فقط برای `FAILED` یا `RAIL_REJECTED` مجاز است.

**وابستگی**: P4-1.1، P3-5.1

---

## P4-3 — Refund & Clawback Payments

### P4-3.1 Refund Engine

**هدف**: بازپرداخت حق‌بیمه در cancellation/endorsement.

**فایل‌ها**:
- `services/billing-service/src/refunds/refund.service.ts`
- `services/billing-service/src/refunds/refund-calculation.service.ts`

**موجودیت**:

```typescript
interface RefundRequest {
  refundId: string;
  tenantId: string;
  organizationId: string;
  sourceType: 'POLICY_CANCELLATION' | 'ENDORSEMENT' | 'OVERPAYMENT';
  sourceId: string;
  originalPaymentId: string;
  amount: Money;
  reason: string;
  status: 'pending' | 'approved' | 'sent' | 'settled' | 'failed';
  approvedByPartyId?: string;
}
```

**مهاجرت**:
- `V1840000010__create_refund_request.sql`

**معیار پذیرش**:
- refund amount از مبلغ `originalPayment` یا `unearned premium` بیشتر نباشد.
- approval workflow برای refund بالاتر از threshold.
- refund منجر به ledger reversal و کاهش receivable می‌شود.

### P4-3.2 Clawback Payment

**هدف**: بازپرداخت کمیسیون در cancellation.

**فایل‌ها**:
- `services/billing-service/src/clawback/clawback.service.ts`

**معیار پذیرش**:
- clawback فقط اگر policy cancellation منجر به reversal premium شود.
- `CommissionSplit` status به `clawedback` تغییر می‌کند.
- `Payable` مربوطه reverse می‌شود یا `deduction` در settlement بعدی اعمال می‌شود.

**وابستگی**: P3-4.1

---

## P4-4 — Escrow Management

### P4-4.1 موجودیت Escrow Holding

**هدف**: ردیابی وجوه نگهداری‌شده در escrow تا تسویه با طرف مقابل.

**فایل‌ها**:
- `services/billing-service/src/escrow/escrow-holding.entity.ts`
- `services/billing-service/src/escrow/escrow-release.entity.ts`

**موجودیت**:

```typescript
interface EscrowHolding {
  holdingId: string;
  tenantId: string;
  escrowAccountRef: string; // env/vault reference, e.g. INSURANCE_ESCROW_ACCOUNT_NUMBER
  sourceType: 'PREMIUM' | 'REFUND' | 'SETTLEMENT';
  sourceId: string;
  amount: Money;
  status: 'held' | 'released' | 'refunded';
  expectedReleaseAt?: Date;
  releasedAt?: Date;
}

interface EscrowRelease {
  releaseId: string;
  holdingId: string;
  releaseType: 'CARRIER_SETTLEMENT' | 'BROKER_COMMISSION' | 'REFUND';
  amount: Money;
  destinationAccountRef: string; // env/vault account reference, resolved at payment time
  paymentId?: string;
  status: 'pending' | 'sent' | 'settled';
}
```

**مهاجرت**:
- `V1840000020__create_escrow_holding.sql`
- `V1840000021__create_escrow_release.sql`

**معیار پذیرش**:
- مجموع escrow holdings با balance در `payment-service` reconcile می‌شود.
- release فقط پس از شرایط قرارداد یا approval.
- هر release به `paymentId` در `payment-service` link می‌شود.

### P4-4.2 Escrow Rules

**فایل‌ها**:
- `services/billing-service/src/escrow/escrow-rules.service.ts`

**rules**:

- حق‌بیمه مشتری به escrow insurance وارد می‌شود.
- پس از دوره cooling-off یا موافقت بیمه‌گر، وجه به حساب بیمه‌گر آزاد می‌شود.
- کمیسیون کارگزار در settlement batch از escrow کسر می‌شود.

**معیار پذیرش**:
- تست: premium وارد escrow می‌شود و تا تسویه به بیمه‌گر آزاد نمی‌شود.
- تست: clawback منجر به برگشت از escrow یا کسر از settlement می‌شود.

**وابستگی**: P4-2.1

---

## P4-5 — Settlement with Carriers & Network

### P4-5.1 Settlement Batch Execution

**هدف**: تسویه خالص (netting) حق‌بیمه و کمیسیون با بیمه‌گر/شبکه فروش.

**فایل‌ها**:
- `services/billing-service/src/settlement/settlement-batch.service.ts` (بازبینی)
- `services/billing-service/src/settlement/settlement-reconciliation.service.ts`

**موجودیت‌های تکمیلی**:

```typescript
interface SettlementBatchLine {
  batchLineId: string;
  batchId: string;
  organizationId: string;
  partyId?: string;
  lineType: 'PREMIUM' | 'COMMISSION' | 'FEE' | 'CLAWBACK';
  sourceType: string;
  sourceId: string;
  amount: Money;
  nettedAmount: Money;
  status: 'included' | 'paid' | 'failed';
}
```

**مهاجرت**:
- `V1840000030__create_settlement_batch_line.sql`

**معیار پذیرش**:
- `netSettlement = totalPremium - totalCommission - fees - clawbacks`.
- هر batch line به source policy/commission link است.
- batch فقط پس از reconciliation و approval به payment ارسال می‌شود.

### P4-5.2 Netting Payment

**فایل‌ها**:
- `services/billing-service/src/settlement/settlement-payment.service.ts`

**معیار پذیرش**:
- payment با `payment-service` به destination حساب شبکه فروش یا بیمه‌گر.
- در صورت net positive به بیمه‌گر، net negative به کارگزار.
- idempotency در ارسال batch.
- event `SettlementBatchPaid.v1` پس از `SETTLED`.

### P4-5.3 Settlement Reconciliation

**فایل‌ها**:
- `services/billing-service/src/settlement/settlement-reconciliation.service.ts`

**معیار پذیرش**:
- reconciliation با statement دریافتی از `payment-service` و ledger.
- هر discrepancy alert ایجاد می‌کند.
- تفاوت‌ها قبل از approval batch resolve شوند.

**وابستگی**: P3-6.1

---

## P4-6 — Payment Gateway & Provider Integration

### P4-6.1 Gateway Provider Manager

**هدف**: مدیریت چند درگاه پرداخت (ecosystem bank, Zarinpal, etc.).

**فایل‌ها**:
- `services/billing-service/src/payment-gateway/payment-gateway.service.ts` (بازبینی)
- `services/billing-service/src/payment-gateway/ecosystem-payment.adapter.ts`
- `services/billing-service/src/payment-gateway/zarinpal.adapter.ts` (fallback)

**معیار پذیرش**:
- default provider بر اساس env `PAYMENT_PROVIDER=ECOSYSTEM`.
- fallback به Zarinpal فقط در صورت عدم ثبت حساب بانکی مشتری.
- هر adapter به‌صورت pluggable پیاده‌سازی شود.

### P4-6.2 Webhook Handler

**فایل‌ها**:
- `services/billing-service/src/payments/payment-webhook.controller.ts`

**معیار پذیرش**:
- webhook از `payment-service` با HMAC/signature اعتبارسنجی شود.
- duplicate webhook با `idempotencyKey` dedup شود.
- وضعیت payment update شود و event منتشر شود.

**وابستگی**: P4-2.2

---

## P4-7 — Notification به مشتری

### P4-7.1 Payment Notification

**هدف**: اطلاع‌رسانی به مشتری در هر مرحله payment.

**فایل‌ها**:
- `services/notification-service/src/payment-notification.service.ts` (جدید)
- `services/notification-service/src/templates/payment-sms-template.ts`
- `services/notification-service/src/templates/payment-email-template.ts`

**events مصرفی**:

```text
PaymentInitiated.v1
PaymentSettled.v1
PaymentFailed.v1
RefundInitiated.v1
RefundSettled.v1
```

**معیار پذیرش**:
- notification با زبان و برند tenant ارسال می‌شود.
- فاقد PII خام؛ شماره کارت mask شده باشد.
- fallback به SMS در صورت عدم ارسال email.

**وابستگی**: P0-5.1 (BrandConfig)

---

## P4-8 — Reporting & Dashboard

### P4-8.1 Payment Reports

**هدف**: گزارش‌های مالی برای broker/carrier/admin.

**فایل‌ها**:
- `services/billing-service/src/reports/payment-report.service.ts`
- `services/billing-service/src/reports/collections-report.controller.ts`

**APIهای پیشنهادی**:

```text
GET /api/v1/reports/collections?from=...&to=...&organizationId=...
GET /api/v1/reports/outstanding-invoices?organizationId=...
GET /api/v1/reports/settlements?from=...&to=...
GET /api/v1/reports/escrow-balance
```

**معیار پذیرش**:
- گزارش فقط داده tenant/organization کاربر را شامل شود.
- aggregate با precision صحیح و decimal.
- داده از ledger و payment-service reconcile باشد.

**وابستگی**: P3-5.1

---

## P4-9 — Event‌ها و Contract

### P4-9.1 Eventهای P4

**eventهای پیشنهادی**:

```text
PremiumInvoiceIssued.v1
PremiumInvoicePaid.v1
PremiumInvoiceOverdue.v1
InstallmentPaid.v1
InstallmentDefaulted.v1
PaymentInitiated.v1
PaymentSettled.v1
PaymentFailed.v1
RefundInitiated.v1
RefundSettled.v1
RefundFailed.v1
EscrowHeld.v1
EscrowReleased.v1
ClawbackPaymentInitiated.v1
SettlementBatchApproved.v1
SettlementBatchPaid.v1
SettlementBatchReconciled.v1
SettlementDiscrepancyDetected.v1
```

**معیار پذیرش**:
- همه eventها در AsyncAPI ثبت شوند.
- producer/consumer contract test pass شوند.
- Outbox pattern.

### P4-9.2 OpenAPI

**فایل‌ها**:
- `D:\CascadeProjects\ecosystem\contracts\openapi\billing-service\openapi.yaml` (بازبینی)
- `D:\CascadeProjects\ecosystem\contracts\asyncapi\payments\asyncapi.yaml`

**وابستگی**: P3-7.2

---

## P4-10 — تست‌ها

### P4-10.1 Unit/Integration Tests

**فایل‌ها**:
- `services/billing-service/test/premium-invoice.spec.ts`
- `services/billing-service/test/customer-payment.spec.ts`
- `services/billing-service/test/refund.spec.ts`
- `services/billing-service/test/escrow.spec.ts`
- `services/billing-service/test/settlement.spec.ts`

**تست‌های الزامی**:

- صدور فاکتور با installment.
- پرداخت کامل و partial.
- payment failed و retry.
- refund بعد از cancellation با ledger reversal.
- clawback کمیسیون.
- escrow release به بیمه‌گر.
- settlement netting و payment.
- reconciliation discrepancy.

### P4-10.2 E2E Tests

**فایل‌ها**:
- `e2e/payments-settlement.spec.ts`

**سناریوها**:

- invoice → customer payment → escrow → settlement to carrier (net of commission).
- cancellation → refund to customer → clawback from broker settlement.
- installment plan → first payment → second overdue → reminder.

**وابستگی**: P4-6.1

---

## P4-11 — Migration

### P4-11.1 Backfill داده‌های پرداخت

**اقدامات**:
- ایجاد `PremiumInvoice` از بیمه‌نامه‌های دارای payment history.
- ایجاد `Payment` records از payment history موجود.
- ایجاد `EscrowHolding` از premium payments.
- ایجاد `SettlementBatch` از تاریخچه settlement.

### P4-11.2 Reconciliation

**معیار پذیرش**:
- جمع invoice amounts با premium totals در policy برابر است.
- مجموع escrow balance با payment-service reconcile.
- settlement batches با bank statements reconcile.
- رکوردهای مبهم در `migration_quarantine` قرار گیرند.

**وابستگی**: P3-9.2

---

## نقشه زمانی P4

```text
Week 1:
  P4-1.1, P4-1.2 (Premium Invoice & Installments)
  P4-2.1, P4-2.2, P4-2.3 (Customer Payment)

Week 2:
  P4-3.1, P4-3.2 (Refund & Clawback)
  P4-4.1, P4-4.2 (Escrow Management)

Week 3:
  P4-5.1, P4-5.2, P4-5.3 (Settlement & Reconciliation)
  P4-6.1, P4-6.2 (Payment Gateway & Webhook)

Week 4:
  P4-7.1 (Notifications)
  P4-8.1 (Reports)
  P4-9.1, P4-9.2 (Event & Contract)
  P4-10.1, P4-10.2 (Tests)
  P4-11.1, P4-11.2 (Migration)
```

---

## معیارهای خروج P4

P4 کامل است اگر و فقط اگر:

- حق‌بیمه به‌صورت invoice و با قابلیت installment صادر شود.
- مشتری بتواند از طریق `payment-service` ecosystem پرداخت کند.
- پرداخت‌ها در escrow insurance نگهداری و با state machine قابل مشاهده باشند.
- refund و clawback با ledger reversal و پرداخت واقعی انجام شوند.
- settlement batch با netting حق‌بیمه و کمیسیون قابل تسویه باشد.
- reconciliation با payment-service و bank statements انجام شود.
- notification به مشتری در مراحل کلیدی ارسال شود.
- گزارش‌های مالی payment/escrow/settlement داشته باشیم.
- تست E2E happy path و cancellation/refund pass شوند.
- migration با reconciliation موفق انجام شده باشد.

---

## اصلاحات و تکمیلی پس از تطبیق با BROKERAGE_IMPLEMENTATION_PLAN.md

### P4-12 — Settlement Batch Plan Alignment

**هدف**: هماهنگ‌سازی `SettlementBatch` با سند طراحی بخش ۳.۱.

**موجودیت مرجع**:
```typescript
interface SettlementBatch {
  batchId: string;
  tenantId: string;
  fromOrganizationId: string;
  toOrganizationId: string;
  periodStart: Date;
  periodEnd: Date;
  totalReceivables: Money;
  totalPayables: Money;
  netSettlement: Money;
  reconciliationHash: string;
  status: 'draft' | 'approved' | 'paid';
}
```

**معیار پذیرس**:
- `netSettlement = totalReceivables - totalPayables` و با ledger تطبیق داده شود.
- `reconciliationHash` از تمام خطوط batch محاسبه و قبل از payment تایید شود.
- `fromOrganizationId`/`toOrganizationId` بر اساس جهت net settlement تعیین شوند.

### P4-13 — Payment Reconciliation & Webhook Security

**هدف**: تقویت reconciliation و امنیت webhook.

**فایل‌ها**:
- `services/billing-service/src/payments/payment-webhook.controller.ts`
- `services/billing-service/src/settlement/settlement-reconciliation.service.ts`

**معیار پذیرس**:
- webhook از `payment-service` با HMAC/signature معتبرسنجی شود.
- duplicate webhook با `idempotencyKey` dedup شود.
- هر روز reconciliation با statement `payment-service` و ledger اجرا شود.
- discrepancy قبل از approval batch resolve شود.

### P4-14 — Notification/Reminder for Installments

**هدف**: اتصال installment overdue به workflow reminder/penalty.

**فایل‌ها**:
- `services/workflow-engine-service/src/processes/installment-reminder.process.ts`
- `services/notification-service/src/reminder.service.ts`

**معیار پذیرس**:
- reminder قبل از due date و پس از overdue ارسال شود.
- penalty فقط پس از تایید workflow و ثبت در ledger اعمال شود.

---

## نکات اجرایی

- از اکوسیستم `payment-service` در port 8085 استفاده شود: `/api/v1/ecosystem/payments/initiate`.
- هیچ سرویسی balance مستقل ندارد؛ همه settlement از طریق `payment-service`.
- حساب escrow فقط از `accountRef` محیطی/Vault (`INSURANCE_ESCROW_ACCOUNT_REF`) resolve می‌شود و شماره حساب در کد، backlog یا contract ثبت نمی‌شود.
- همه paymentها با `idempotencyKey` و `correlationId` فراخوان شوند.
- refund/clawback حتماً از approval workflow عبور کند.
- webhook handler باید deduplication و signature validation داشته باشد.
- installment overdue باید به workflow reminder/penalty متصل شود (در P5/P6 تکمیل می‌شود).

این بکلاگ مستقیماً از `BROKERAGE_IMPLEMENTATION_PLAN.md` مشتق شده و آماده پیاده‌سازی فاز Payments & Settlement است.
