# Billing Service - Endpoint Catalog

**Service**: billing-service  
**Purpose**: Invoicing, payments, accounting, brokerage settlements, escrow, reconciliation  
**Base Path**: `/` (varies by controller)

---

## Controllers Overview

1. **billing.controller.ts** - Core billing (invoices, accounting, payment gateway, auto-deposit, reconciliation, reports)
2. **brokerage.controller.ts** - Brokerage operations (policy posting, commissions, settlements, refunds, clawbacks, escrow)
3. **invoicing/invoice.controller.ts** - Premium invoicing
4. **payments/payment-webhook.controller.ts** - Payment webhooks
5. **reports/collections-report.controller.ts** - Collections reports
6. **health.controller.ts** - Health check

---

## 1. billing.controller.ts

**Base Path**: `/billing`  
**Auth**: JWT + PermissionsGuard + TenantGuard (all endpoints)

### POST /billing/invoices
**Purpose**: Create invoice  
**Permission**: `billing:invoices:create`

**Headers**:
- `X-Correlation-Id` (optional)
- `X-Idempotency-Key` (optional)

**Request Body**: CreateInvoiceDto

**Response**:
```json
{
  "success": true,
  "data": { "id": "UUID", ... },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### PUT /billing/invoices/:id/issue
**Purpose**: Issue invoice  
**Permission**: `billing:invoices:manage`

**Path Params**: `id`

**Response**: Invoice object

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### POST /billing/invoices/:id/payment
**Purpose**: Record payment on invoice  
**Permission**: `billing:payments:initiate`

**Path Params**: `id`

**Request Body**: RecordPaymentDto

**Response**: Payment record

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### POST /billing/invoices/mark-overdue
**Purpose**: Mark overdue invoices  
**Permission**: `billing:invoices:manage`

**Response**:
```json
{
  "success": true,
  "data": { "markedCount": 0 },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### PUT /billing/invoices/:id/cancel
**Purpose**: Cancel invoice  
**Permission**: `billing:invoices:manage`

**Path Params**: `id`

**Response**: Invoice object

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### GET /billing/invoices/:id
**Purpose**: Get invoice by ID  
**Permission**: `billing:invoices:view`

**Path Params**: `id`

**Response**: Invoice object

**Errors**:
- `NOT_FOUND` - Invoice not found

---

### GET /billing/invoices
**Purpose**: List invoices  
**Permission**: `billing:invoices:view`

**Query Params**:
- `customerId` (optional, UUID)
- `policyId` (optional, UUID)
- `status` (optional, InvoiceStatus)
- `invoiceType` (optional, InvoiceType)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": { "total": 0, "limit": 50, "offset": 0 }
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### GET /billing/balance/outstanding
**Purpose**: Get outstanding balance  
**Permission**: `billing:invoices:view`

**Query Params**:
- `customerId` (optional, UUID)

**Response**:
```json
{
  "success": true,
  "data": { "outstandingBalance": 0 }
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

## Accounting Endpoints

### POST /billing/journal-entries
**Purpose**: Create journal entry  
**Permission**: `billing:accounting:manage`

**Headers**:
- `X-Correlation-Id` (optional)
- `X-Idempotency-Key` (optional)

**Request Body**: CreateJournalEntryDto

**Response**: Journal entry object

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### PUT /billing/journal-entries/:id/post
**Purpose**: Post journal entry  
**Permission**: `billing:accounting:manage`

**Path Params**: `id`

**Response**: Posted journal entry

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### POST /billing/journal-entries/:id/reverse
**Purpose**: Reverse journal entry  
**Permission**: `billing:accounting:manage`

**Path Params**: `id`

**Request Body**: ReverseJournalEntryDto

**Response**: Reversed entry

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### POST /billing/accounts
**Purpose**: Create account  
**Permission**: `billing:manage_accounts`

**Request Body**: CreateAccountDto

**Response**: Account object

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### GET /billing/accounts/:accountCode
**Purpose**: Get account by code  
**Permission**: `billing:invoices:view`

**Path Params**: `accountCode`

**Response**: Account object

**Errors**:
- `TENANT_REQUIRED` - tenantId required
- `NOT_FOUND` - Account not found

---

### GET /billing/accounts
**Purpose**: List accounts  
**Permission**: `billing:invoices:view`

**Query Params**:
- `accountType` (optional, AccountType)
- `category` (optional, string)
- `isActive` (optional, boolean)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response**: Paginated accounts

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### POST /billing/financial-periods
**Purpose**: Create financial period  
**Permission**: `billing:accounting:manage`

**Request Body**: CreateFinancialPeriodDto

**Response**: Financial period object

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### PUT /billing/financial-periods/:id/close
**Purpose**: Close financial period  
**Permission**: `billing:close_period`

**Path Params**: `id`

**Response**: Closed period

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### GET /billing/accounting/trial-balance
**Purpose**: Get trial balance  
**Permission**: `billing:invoices:view`

**Query Params**:
- `asOfDate` (optional, ISO8601)

**Response**: Trial balance report

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### GET /billing/accounts/:accountCode/balance
**Purpose**: Get account balance  
**Permission**: `billing:invoices:view`

**Path Params**: `accountCode`

**Query Params**:
- `asOfDate` (optional, ISO8601)

**Response**: Account balance

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

## Payment Gateway Endpoints

### POST /billing/payments/initiate
**Purpose**: Initiate payment  
**Permission**: `billing:payments:initiate`

**Headers**:
- `X-Correlation-Id` (optional)
- `X-Idempotency-Key` (optional)

**Request Body**: InitiatePaymentDto

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentId": "string",
    "redirectUrl": "string",
    "authority": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId required
- `INVOICE_NOT_FOUND` - Invoice not found

---

### POST /billing/payments/verify
**Purpose**: Verify payment  
**Permission**: `billing:payments:verify`

**Request Body**: VerifyPaymentDto

**Response**:
```json
{
  "success": true,
  "data": { "refId": "string", "cardPan": "string" },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### POST /billing/payments/:paymentId/cancel
**Purpose**: Cancel payment  
**Permission**: `billing:payments:initiate`

**Path Params**: `paymentId`

**Response**:
```json
{
  "success": true,
  "data": { "message": "string" },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### GET /billing/payments/:paymentId
**Purpose**: Get payment by ID  
**Permission**: `billing:invoices:view`

**Path Params**: `paymentId`

**Response**: Payment transaction

**Errors**:
- `TENANT_REQUIRED` - tenantId required
- `NOT_FOUND` - Payment not found

---

### GET /billing/invoices/:invoiceId/payments
**Purpose**: Get payments for invoice  
**Permission**: `billing:invoices:view`

**Path Params**: `invoiceId`

**Response**: Array of payment transactions

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### GET /billing/payments/health-check
**Purpose**: Payment gateway health check  
**Permission**: `billing:invoices:view`

**Response**: Health status object

---

## Auto-Deposit Verification Endpoints

### POST /billing/auto-deposit/ingest
**Purpose**: Ingest bank transaction  
**Permission**: `billing:auto-deposit:manage`

**Request Body**: IngestBankTransactionDto

**Response**: Ingested transaction

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### POST /billing/auto-deposit/:invoiceId/approve/:transactionId
**Purpose**: Manually approve payment  
**Permission**: `billing:auto-deposit:manage`

**Path Params**: `invoiceId`, `transactionId`

**Response**:
```json
{
  "success": true,
  "data": { "message": "Payment approved manually" },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### POST /billing/auto-deposit/:transactionId/reject
**Purpose**: Reject transaction  
**Permission**: `billing:auto-deposit:manage`

**Path Params**: `transactionId`

**Request Body**: RejectTransactionDto

**Response**:
```json
{
  "success": true,
  "data": { "message": "Transaction rejected" },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### GET /billing/auto-deposit/pending
**Purpose**: Get pending transactions  
**Permission**: `billing:auto-deposit:manage`

**Response**: Array of pending transactions

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### GET /billing/auto-deposit/matches
**Purpose**: Get pending matches  
**Permission**: `billing:auto-deposit:manage`

**Response**: Array of pending matches

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### POST /billing/auto-deposit/reconcile
**Purpose**: Reconcile transactions  
**Permission**: `billing:auto-deposit:manage`

**Response**: Reconciliation result

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### GET /billing/auto-deposit/config
**Purpose**: Get auto-deposit config  
**Permission**: `billing:auto-deposit:manage`

**Response**: Config object

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### PUT /billing/auto-deposit/config
**Purpose**: Update auto-deposit config  
**Permission**: `billing:auto-deposit:manage`

**Request Body**: AutoDepositConfigDto

**Response**: Updated config

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### GET /billing/auto-deposit/health-check
**Purpose**: Auto-deposit health check  
**Permission**: `billing:invoices:view`

**Response**: Health status

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

## Reconciliation Endpoints

### POST /billing/reconcile
**Purpose**: Reconcile  
**Permission**: `billing:reconcile`

**Request Body**: ReconcileDto

**Response**: Reconciliation result

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### GET /billing/reconcile/results
**Purpose**: List reconciliation results  
**Permission**: `billing:reconcile`

**Query Params**:
- `sourceType` (optional, string)
- `status` (optional, string)
- `periodStart` (optional, ISO8601)
- `periodEnd` (optional, ISO8601)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response**: Paginated results

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### PUT /billing/reconcile/:id/approve
**Purpose**: Approve reconciliation  
**Permission**: `billing:reconcile`

**Path Params**: `id`

**Response**: Approved reconciliation

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

## Reports

### GET /billing/pnl-report
**Purpose**: Get P&L report  
**Permission**: `billing:invoices:view`

**Query Params**:
- `periodStart` (required, ISO8601)
- `periodEnd` (required, ISO8601)

**Response**: P&L report

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

### GET /billing/balance-sheet
**Purpose**: Get balance sheet  
**Permission**: `billing:invoices:view`

**Query Params**:
- `asOfDate` (required, ISO8601)

**Response**: Balance sheet

**Errors**:
- `TENANT_REQUIRED` - tenantId required

---

## 2. brokerage.controller.ts

**Base Path**: `/`  
**Auth**: JWT + PermissionsGuard (no TenantGuard)

### POST /brokerage/policies/:policyId/post
**Purpose**: Post policy issuance  
**Permission**: `billing:create_entry`

**Path Params**: `policyId`

**Request Body**:
```json
{
  "organizationId": "UUID",
  "premiumAmount": 123.45,
  "taxesAmount": 123.45,
  "totalPayable": 123.45,
  "currency": "IRR",
  "brokerOrganizationId": "UUID",
  "commissionDistributionAgreementId": "UUID",
  "commissionDistributionAgreementSnapshot": {},
  "periodId": "UUID",
  "effectiveFrom": "ISO8601"
}
```

**Response**: Posting result

**Errors**:
- `POSTING_FAILED` - Posting failed

---

### POST /brokerage/commissions/calculate
**Purpose**: Calculate commission  
**Permission**: `billing:accounting:manage`

**Request Body**:
```json
{
  "brokerOrganizationId": "UUID",
  "sourceType": "POLICY",
  "sourceId": "UUID",
  "premiumGross": 123.45,
  "premiumNet": 123.45,
  "currency": "IRR",
  "distributionAgreementId": "UUID",
  "distributionAgreementSnapshot": {},
  "commissionScheduleSnapshot": {},
  "effectiveFrom": "ISO8601"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "splits": [...],
    "total": "0"
  },
  "correlationId": "string"
}
```

**Errors**:
- `CALCULATION_FAILED` - Calculation failed

---

### POST /brokerage/commissions/post
**Purpose**: Post commission  
**Permission**: `billing:create_entry`

**Request Body**:
```json
{
  "organizationId": "UUID",
  "sourceType": "string",
  "sourceId": "UUID",
  "periodId": "UUID",
  "currency": "IRR",
  "postingDate": "ISO8601"
}
```

**Response**:
```json
{
  "success": true,
  "data": { "journalEntryId": "UUID" },
  "correlationId": "string"
}
```

**Errors**:
- `POSTING_FAILED` - Posting failed

---

### POST /brokerage/settlements/batches
**Purpose**: Create settlement batch  
**Permission**: `billing:payments:initiate`

**Request Body**:
```json
{
  "fromOrganizationId": "UUID",
  "toOrganizationId": "UUID",
  "periodStart": "ISO8601",
  "periodEnd": "ISO8601",
  "approvedByPartyId": "UUID"
}
```

**Response**: Settlement batch

**Errors**:
- `SETTLEMENT_FAILED` - Settlement failed

---

### POST /brokerage/settlements/batches/:batchId/approve
**Purpose**: Approve settlement  
**Permission**: `billing:settlements:manage`

**Path Params**: `batchId`

**Request Body**:
```json
{
  "approvedByPartyId": "UUID"
}
```

**Response**: Approved batch

**Errors**:
- `APPROVAL_FAILED` - Approval failed

---

### POST /brokerage/settlements/batches/:batchId/confirm
**Purpose**: Confirm and pay settlement  
**Permission**: `billing:payments:initiate`

**Path Params**: `batchId`

**Request Body**:
```json
{
  "fromAccountId": "UUID",
  "toAccountId": "UUID"
}
```

**Response**: Confirmed batch

**Errors**:
- `SETTLEMENT_PAYMENT_FAILED` - Payment failed

---

### POST /brokerage/settlements/batches/:batchId/verify
**Purpose**: Verify settlement payment  
**Permission**: `billing:payments:verify`

**Path Params**: `batchId`

**Response**: Verified batch

**Errors**:
- `VERIFICATION_FAILED` - Verification failed

---

### GET /brokerage/journal-entries/:journalEntryId
**Purpose**: Get journal entry  
**Permission**: `billing:view_entry`

**Path Params**: `journalEntryId`

**Response**: Journal entry

**Errors**:
- `NOT_FOUND` - Entry not found

---

### POST /brokerage/journal-entries/:journalEntryId/reverse
**Purpose**: Reverse journal entry  
**Permission**: `billing:create_entry`

**Path Params**: `journalEntryId`

**Request Body**:
```json
{
  "reason": "string"
}
```

**Response**: Reversed entry

**Errors**:
- `REVERSAL_FAILED` - Reversal failed

---

### POST /brokerage/settlements/batches/:batchId/reconcile
**Purpose**: Reconcile settlement  
**Permission**: `billing:settlements:manage`

**Path Params**: `batchId`

**Response**: Reconciliation result

**Errors**:
- `RECONCILIATION_FAILED` - Reconciliation failed

---

### POST /brokerage/refunds
**Purpose**: Create refund  
**Permission**: `billing:payments:refund`

**Request Body**:
```json
{
  "organizationId": "UUID",
  "sourceType": "string",
  "sourceId": "UUID",
  "originalPaymentId": "UUID",
  "amountMinor": 0,
  "currency": "IRR",
  "reason": "string",
  "approvedByPartyId": "UUID"
}
```

**Response**: Refund object

**Errors**:
- `REFUND_FAILED` - Refund failed

---

### POST /brokerage/refunds/:refundId/approve
**Purpose**: Approve refund  
**Permission**: `billing:payments:refund`

**Path Params**: `refundId`

**Request Body**:
```json
{
  "approvedByPartyId": "UUID"
}
```

**Response**: Approved refund

**Errors**:
- `APPROVAL_FAILED` - Approval failed

---

### POST /brokerage/refunds/:refundId/send
**Purpose**: Send refund  
**Permission**: `billing:payments:refund`

**Path Params**: `refundId`

**Request Body**:
```json
{
  "destinationAccount": "string",
  "sourceAccount": "string"
}
```

**Response**: Sent refund

**Errors**:
- `SEND_REFUND_FAILED` - Send failed

---

### POST /brokerage/clawbacks/calculate
**Purpose**: Calculate clawback  
**Permission**: `billing:settlements:manage`

**Request Body**:
```json
{
  "policyId": "UUID"
}
```

**Response**: Clawback calculation

**Errors**:
- `CLAWBACK_CALCULATION_FAILED` - Calculation failed

---

### POST /brokerage/clawbacks/apply
**Purpose**: Apply clawback  
**Permission**: `billing:settlements:manage`

**Request Body**:
```json
{
  "organizationId": "UUID",
  "policyId": "UUID",
  "cancellationSourceId": "UUID",
  "amountMinor": 0,
  "currency": "IRR",
  "reason": "string",
  "approvedByPartyId": "UUID"
}
```

**Response**: Applied clawback

**Errors**:
- `CLAWBACK_FAILED` - Clawback failed

---

### GET /brokerage/escrow/holdings
**Purpose**: Get escrow holdings  
**Permission**: `billing:escrow:view`

**Query Params**:
- `escrowAccountRef` (optional, string)

**Response**: Escrow holdings

**Errors**:
- `ESCROW_QUERY_FAILED` - Query failed

---

### POST /brokerage/escrow/holdings/:holdingId/release
**Purpose**: Release escrow  
**Permission**: `billing:settlements:manage`

**Path Params**: `holdingId`

**Request Body**:
```json
{
  "releaseType": "string",
  "amountMinor": 0,
  "destinationAccountRef": "string",
  "paymentId": "UUID"
}
```

**Response**: Released escrow

**Errors**:
- `ESCROW_RELEASE_FAILED` - Release failed

---

### GET /brokerage/escrow/holdings/:holdingId/eligibility
**Purpose**: Check escrow release eligibility  
**Permission**: `billing:settlements:manage`

**Path Params**: `holdingId`

**Response**: Eligibility evaluation

**Errors**:
- `NOT_FOUND` - Holding not found
- `ESCROW_ELIGIBILITY_FAILED` - Evaluation failed

---

### POST /brokerage/escrow/holdings/:holdingId/carrier-approve
**Purpose**: Carrier approve escrow  
**Permission**: `billing:settlements:manage`

**Path Params**: `holdingId`

**Request Body**:
```json
{
  "approvedBy": "UUID"
}
```

**Response**: Approved holding

**Errors**:
- `ESCROW_CARRIER_APPROVE_FAILED` - Approval failed

---

### POST /brokerage/escrow/auto-release
**Purpose**: Auto-release eligible escrow holdings  
**Permission**: `billing:settlements:manage`

**Response**:
```json
{
  "success": true,
  "data": { "count": 0, "releases": [...] },
  "correlationId": "string"
}
```

**Errors**:
- `ESCROW_AUTO_RELEASE_FAILED` - Auto-release failed

---

### POST /brokerage/invoices/:invoiceId/pay
**Purpose**: Pay invoice  
**Permission**: `billing:payments:initiate`

**Path Params**: `invoiceId`

**Request Body**:
```json
{
  "organizationId": "UUID",
  "sourceAccount": "string",
  "destinationAccountRef": "string",
  "rail": "string",
  "amountMinor": 0,
  "callbackUrl": "string",
  "metadata": {}
}
```

**Response**: Payment result

**Errors**:
- `PAYMENT_INITIATION_FAILED` - Initiation failed

---

### GET /brokerage/payments/:paymentId
**Purpose**: Get payment  
**Permission**: `billing:payments:verify`

**Path Params**: `paymentId`

**Response**: Payment object

**Errors**:
- `NOT_FOUND` - Payment not found
- `PAYMENT_QUERY_FAILED` - Query failed

---

### POST /brokerage/payments/:paymentId/retry
**Purpose**: Retry payment  
**Permission**: `billing:payments:initiate`

**Path Params**: `paymentId`

**Response**: Retry result

**Errors**:
- `PAYMENT_RETRY_FAILED` - Retry failed

---

## 3. invoicing/invoice.controller.ts

**Base Path**: `/invoicing`  
**Auth**: JWT + PermissionsGuard + TenantGuard (all endpoints)

### POST /invoicing/policies/:policyId/invoices
**Purpose**: Create premium invoice  
**Permission**: `billing:invoices:create`

**Path Params**: `policyId`

**Headers**:
- `X-Correlation-Id` (optional)
- `X-Idempotency-Key` (optional)

**Request Body**: CreatePremiumInvoiceDto

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

### GET /invoicing/policies/:policyId/invoices
**Purpose**: List invoices by policy  
**Permission**: `billing:invoices:view`

**Path Params**: `policyId`

**Response**:
```json
{
  "success": true,
  "data": [...]
}
```

---

### GET /invoicing/invoices/:invoiceId
**Purpose**: Get invoice by ID  
**Permission**: `billing:invoices:view`

**Path Params**: `invoiceId`

**Response**: Invoice object

**Errors**:
- `NOT_FOUND` - Invoice not found

---

### POST /invoicing/invoices/:invoiceId/issue
**Purpose**: Issue invoice  
**Permission**: `billing:invoices:manage`

**Path Params**: `invoiceId`

**Response**: Issued invoice

---

### POST /invoicing/invoices/:invoiceId/cancel
**Purpose**: Cancel invoice  
**Permission**: `billing:invoices:manage`

**Path Params**: `invoiceId`

**Request Body**: CancelPremiumInvoiceDto

**Response**: Cancelled invoice

---

### POST /invoicing/invoices/:invoiceId/installments
**Purpose**: Create installment plan  
**Permission**: `billing:invoices:manage`

**Path Params**: `invoiceId`

**Request Body**: CreateInstallmentPlanDto

**Response**: Installment plan

---

### POST /invoicing/installments/:itemId/pay
**Purpose**: Pay installment  
**Permission**: `billing:payments:initiate`

**Path Params**: `itemId`

**Request Body**: PayInstallmentDto

**Response**: Payment result

---

## 4. payments/payment-webhook.controller.ts

**Base Path**: `/webhooks/payments`  
**Auth**: None (webhook - signature verification)

### POST /webhooks/payments
**Purpose**: Handle payment webhook  
**Auth**: None (signature verification via X-Signature header)

**Headers**:
- `X-Signature` (HMAC-SHA256 signature)
- `X-Idempotency-Key` (optional, for idempotency)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Request Body**: PaymentWebhookPayload
```json
{
  "paymentId": "string",
  "status": "SETTLED|FAILED|PENDING",
  "railReference": "string",
  "amount": "string",
  "currency": "string",
  "idempotencyKey": "string",
  "metadata": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": { "paymentId": "UUID", "status": "SUCCESS" }
}
```

**Errors**:
- `BadRequestException` - Invalid signature, missing X-Tenant-Id, payment not found

**Events Published**:
- `insurance.billing.payment.settled` - When payment settles
- `insurance.billing.payment.failed` - When payment fails

---

## 5. reports/collections-report.controller.ts

**Base Path**: `/reports`  
**Auth**: JWT + PermissionsGuard + TenantGuard (all endpoints)

### GET /reports/collections
**Purpose**: Collections report  
**Permission**: `billing:reports:view`

**Query Params**:
- `organizationId` (optional, UUID)
- `from` (optional, ISO8601)
- `to` (optional, ISO8601)

**Response**: Collections report data

---

### GET /reports/outstanding-invoices
**Purpose**: Outstanding invoices report  
**Permission**: `billing:reports:view`

**Query Params**:
- `organizationId` (optional, UUID)

**Response**: Outstanding invoices data

---

### GET /reports/settlements
**Purpose**: Settlements report  
**Permission**: `billing:reports:view`

**Query Params**:
- `organizationId` (optional, UUID)
- `from` (optional, ISO8601)
- `to` (optional, ISO8601)

**Response**: Settlements report data

---

### GET /reports/escrow-balance
**Purpose**: Escrow balance report  
**Permission**: `billing:reports:view`

**Query Params**:
- `escrowAccountRef` (optional, string)

**Response**: Escrow balance data

---

## 6. health.controller.ts

### GET /health
**Purpose**: Health check for billing-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|error",
  "service": "billing-service",
  "timestamp": "ISO8601",
  "message": "string (only if error)"
}
```

---

## Summary

**Total Endpoints**: 67

**By Controller**:
- billing.controller.ts: 26
- brokerage.controller.ts: 20
- invoicing/invoice.controller.ts: 7
- payments/payment-webhook.controller.ts: 1
- reports/collections-report.controller.ts: 4
- health.controller.ts: 1

**Key Workflows**:

**Invoice Lifecycle**:
1. Create → `/billing/invoices` or `/invoicing/policies/:policyId/invoices`
2. Issue → `/billing/invoices/:id/issue` or `/invoicing/invoices/:invoiceId/issue`
3. Record Payment → `/billing/invoices/:id/payment`
4. Cancel → `/billing/invoices/:id/cancel`

**Payment Gateway**:
1. Initiate → `/billing/payments/initiate`
2. Verify → `/billing/payments/verify`
3. Cancel → `/billing/payments/:paymentId/cancel`
4. Webhook → `/webhooks/payments`

**Brokerage Settlement**:
1. Post Policy → `/brokerage/policies/:policyId/post`
2. Calculate Commission → `/brokerage/commissions/calculate`
3. Post Commission → `/brokerage/commissions/post`
4. Create Batch → `/brokerage/settlements/batches`
5. Approve → `/brokerage/settlements/batches/:batchId/approve`
6. Confirm & Pay → `/brokerage/settlements/batches/:batchId/confirm`
7. Verify → `/brokerage/settlements/batches/:batchId/verify`

**Escrow**:
1. Get Holdings → `/brokerage/escrow/holdings`
2. Check Eligibility → `/brokerage/escrow/holdings/:holdingId/eligibility`
3. Carrier Approve → `/brokerage/escrow/holdings/:holdingId/carrier-approve`
4. Release → `/brokerage/escrow/holdings/:holdingId/release`
5. Auto-Release → `/brokerage/escrow/auto-release`

**Refunds**:
1. Create → `/brokerage/refunds`
2. Approve → `/brokerage/refunds/:refundId/approve`
3. Send → `/brokerage/refunds/:refundId/send`

**Clawbacks**:
1. Calculate → `/brokerage/clawbacks/calculate`
2. Apply → `/brokerage/clawbacks/apply`

**Auto-Deposit**:
1. Ingest → `/billing/auto-deposit/ingest`
2. Get Pending → `/billing/auto-deposit/pending`
3. Get Matches → `/billing/auto-deposit/matches`
4. Manual Approve → `/billing/auto-deposit/:invoiceId/approve/:transactionId`
5. Reject → `/billing/auto-deposit/:transactionId/reject`
6. Reconcile → `/billing/auto-deposit/reconcile`

**Permissions**:
- `billing:invoices:create` - Create invoices
- `billing:invoices:manage` - Issue, cancel, mark overdue
- `billing:invoices:view` - View invoices, accounts, balances, reports
- `billing:payments:initiate` - Initiate payments, settlements
- `billing:payments:verify` - Verify payments
- `billing:payments:refund` - Refunds
- `billing:accounting:manage` - Journal entries, financial periods
- `billing:manage_accounts` - Create accounts
- `billing:close_period` - Close financial periods
- `billing:auto-deposit:manage` - Auto-deposit operations
- `billing:reconcile` - Reconciliation
- `billing:create_entry` - Create journal entries
- `billing:view_entry` - View journal entries
- `billing:settlements:manage` - Settlements, clawbacks, escrow
- `billing:escrow:view` - View escrow holdings
- `billing:reports:view` - View reports

**Idempotency**:
- `/billing/invoices` supports idempotency via `X-Idempotency-Key`
- `/billing/journal-entries` supports idempotency via `X-Idempotency-Key`
- `/billing/payments/initiate` supports idempotency via `X-Idempotency-Key`
- `/invoicing/policies/:policyId/invoices` supports idempotency via `X-Idempotency-Key`
- `/webhooks/payments` supports idempotency via `X-Idempotency-Key`

**Error Codes**:
- `TENANT_REQUIRED` - tenantId required
- `NOT_FOUND` - Resource not found
- `INVOICE_NOT_FOUND` - Invoice not found
- `POSTING_FAILED` - Posting failed
- `CALCULATION_FAILED` - Calculation failed
- `SETTLEMENT_FAILED` - Settlement failed
- `APPROVAL_FAILED` - Approval failed
- `SETTLEMENT_PAYMENT_FAILED` - Settlement payment failed
- `VERIFICATION_FAILED` - Verification failed
- `REVERSAL_FAILED` - Reversal failed
- `RECONCILIATION_FAILED` - Reconciliation failed
- `REFUND_FAILED` - Refund failed
- `SEND_REFUND_FAILED` - Send refund failed
- `CLAWBACK_CALCULATION_FAILED` - Clawback calculation failed
- `CLAWBACK_FAILED` - Clawback failed
- `ESCROW_QUERY_FAILED` - Escrow query failed
- `ESCROW_RELEASE_FAILED` - Escrow release failed
- `ESCROW_ELIGIBILITY_FAILED` - Escrow eligibility failed
- `ESCROW_CARRIER_APPROVE_FAILED` - Carrier approve failed
- `ESCROW_AUTO_RELEASE_FAILED` - Auto-release failed
- `PAYMENT_INITIATION_FAILED` - Payment initiation failed
- `PAYMENT_QUERY_FAILED` - Payment query failed
- `PAYMENT_RETRY_FAILED` - Payment retry failed
