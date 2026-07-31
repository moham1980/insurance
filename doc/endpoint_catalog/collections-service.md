# Collections Service - Endpoint Catalog

**Service**: collections-service  
**Purpose**: Collections management (payment plans, installments, late fees, gateway payments, receivables)  
**Base Path**: `/`

---

## Controllers Overview

1. **collections.controller.ts** - Collections operations (plans, installments, reminders, late fees, gateway, receivables)
2. **health.controller.ts** - Health check

---

## 1. collections.controller.ts

**Base Path**: `/`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (all endpoints except /health and gateway callback)

## Plan Endpoints

### POST /collections/plans
**Purpose**: Create payment plan  
**Permission**: `collections:plan_create`

**Request Body**:
```json
{
  "idempotencyKey": "string (required)",
  "policyId": "string (required)",
  "premiumAmount": 0 (required, non-negative number),
  "currency": "string",
  "installments": [
    {
      "dueDate": "ISO8601 (required)",
      "amount": 0 (required, > 0)
    }
  ],
  "meta": {}
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "plan": {
      "planId": "UUID",
      "policyId": "string",
      "premiumAmount": 0,
      "status": "active|completed|cancelled",
      "createdAt": "ISO8601"
    },
    "installments": []
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - idempotencyKey, policyId, premiumAmount, installments are required

---

### GET /collections/plans/:planId
**Purpose**: Get payment plan by ID  
**Permission**: `collections:plan_view`

**Path Params**: `planId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "planId": "UUID",
    "policyId": "string",
    "premiumAmount": 0,
    "status": "active|completed|cancelled",
    "installments": []
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Plan not found

---

### GET /collections/plans
**Purpose**: List payment plans  
**Permission**: `collections:plan_list`

**Query Params**:
- `policyId` (optional, string)
- `status` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "planId": "UUID",
      "policyId": "string",
      "status": "active|completed|cancelled",
      "createdAt": "ISO8601"
    }
  ],
  "pagination": {
    "total": 0,
    "limit": 50,
    "offset": 0
  },
  "correlationId": "string"
}
```

---

## Installment Endpoints

### GET /collections/installments/:installmentId
**Purpose**: Get installment by ID  
**Permission**: `collections:installment_view`

**Path Params**: `installmentId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "installmentId": "UUID",
    "planId": "string",
    "policyId": "string",
    "amount": 0,
    "dueDate": "ISO8601",
    "status": "pending|paid|overdue|waived",
    "paidAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Installment not found

---

### GET /collections/installments
**Purpose**: List installments  
**Permission**: `collections:installment_list`

**Query Params**:
- `planId` (optional, string)
- `policyId` (optional, string)
- `status` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "installmentId": "UUID",
      "planId": "string",
      "amount": 0,
      "dueDate": "ISO8601",
      "status": "pending|paid|overdue|waived"
    }
  ],
  "pagination": {
    "total": 0,
    "limit": 50,
    "offset": 0
  },
  "correlationId": "string"
}
```

---

### POST /collections/installments/:installmentId/pay
**Purpose**: Pay installment  
**Permission**: `collections:installment_pay`

**Path Params**: `installmentId`

**Request Body**:
```json
{
  "provider": "string",
  "providerRef": "string",
  "paidAt": "ISO8601",
  "details": {}
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "installmentId": "UUID",
    "status": "paid",
    "paidAt": "ISO8601",
    "provider": "string",
    "providerRef": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Installment not found
- `INVALID_STATE` - Installment not in payable state

---

## Reminder Endpoints

### GET /collections/installments/reminder/due
**Purpose**: Get installments due for reminder  
**Permission**: `collections:installment_list`

**Query Params**:
- `daysBeforeDue` (default: 7)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "installmentId": "UUID",
      "dueDate": "ISO8601",
      "daysUntilDue": 5,
      "amount": 0
    }
  ],
  "pagination": {
    "total": 0,
    "limit": 50,
    "offset": 0
  },
  "correlationId": "string"
}
```

---

### POST /collections/installments/:installmentId/reminder
**Purpose**: Send payment reminder  
**Permission**: `collections:installment_pay`

**Path Params**: `installmentId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "installmentId": "UUID",
    "reminderSent": true,
    "remindedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Installment not found
- `INVALID_STATE` - Installment not in remindable state

---

## Overdue Endpoints

### GET /collections/installments/overdue
**Purpose**: Get overdue installments  
**Permission**: `collections:installment_list`

**Query Params**:
- `gracePeriodDays` (default: 7)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "installmentId": "UUID",
      "dueDate": "ISO8601",
      "daysOverdue": 10,
      "amount": 0,
      "lateFee": 0
    }
  ],
  "pagination": {
    "total": 0,
    "limit": 50,
    "offset": 0
  },
  "correlationId": "string"
}
```

---

### POST /collections/installments/:installmentId/overdue
**Purpose**: Mark installment as overdue  
**Permission**: `collections:installment_pay`

**Path Params**: `installmentId`

**Request Body**:
```json
{
  "gracePeriodDays": 7
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "installmentId": "UUID",
    "status": "overdue",
    "markedOverdueAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Installment not found

---

## Late Fee Endpoints

### GET /collections/installments/:installmentId/late-fee
**Purpose**: Calculate late fee  
**Permission**: `collections:installment_view`

**Path Params**: `installmentId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "installmentId": "UUID",
    "baseAmount": 0,
    "lateFeeAmount": 0,
    "daysOverdue": 10,
    "ratePercent": 0,
    "calculatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to calculate late fee

---

### POST /collections/installments/:installmentId/late-fee/apply
**Purpose**: Apply late fee  
**Permission**: `collections:installment_pay`

**Path Params**: `installmentId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "installmentId": "UUID",
    "lateFeeApplied": true,
    "lateFeeAmount": 0,
    "appliedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to apply late fee

---

## Gateway Payment Endpoints

### POST /collections/installments/:installmentId/gateway/initiate
**Purpose**: Initiate gateway payment  
**Permission**: `collections:installment_pay`

**Path Params**: `installmentId`

**Request Body**:
```json
{
  "returnUrl": "string (required)",
  "cancelUrl": "string (required)"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "transactionId": "string",
    "installmentId": "UUID",
    "paymentUrl": "string",
    "expiresAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - returnUrl and cancelUrl are required
- `INTERNAL_ERROR` - Failed to initiate gateway payment

---

### POST /collections/installments/:installmentId/gateway/verify
**Purpose**: Verify gateway payment  
**Permission**: `collections:installment_pay`

**Path Params**: `installmentId`

**Request Body**:
```json
{
  "transactionId": "string (required)"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "transactionId": "string",
    "installmentId": "UUID",
    "status": "success|failed|pending",
    "verifiedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - transactionId is required

---

### POST /collections/gateway/callback
**Purpose**: Handle gateway callback (webhook)  
**Auth**: HMAC signature verification (public)

**Request Body**:
```json
{
  "transactionId": "string (required)",
  "installmentId": "string (required)",
  "status": "success|failed|cancelled (required)",
  "gatewayData": {}
}
```

**Headers**:
- `X-Correlation-Id` (optional)
- `X-Gateway-Signature` (required, HMAC-SHA256)

**Response**:
```json
{
  "success": true,
  "data": {
    "transactionId": "string",
    "installmentId": "string",
    "status": "success",
    "processedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `GATEWAY_NOT_CONFIGURED` - Callback secret not configured
- `INVALID_SIGNATURE` - Gateway callback signature verification failed
- `VALIDATION_ERROR` - transactionId, installmentId, and status are required

---

## Receivable Endpoints

### POST /collections/installments/:installmentId/link-receivable
**Purpose**: Link installment to receivable  
**Permission**: `collections:installment_link_receivable`

**Path Params**: `installmentId`

**Request Body**:
```json
{
  "receivableId": "string"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "installmentId": "UUID",
    "receivableId": "string",
    "linkedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Installment or receivable not found
- `INTERNAL_ERROR` - Failed to link receivable

---

### POST /collections/installments/:installmentId/sync-receivable
**Purpose**: Sync receivable status  
**Permission**: `collections:installment_sync_receivable`

**Path Params**: `installmentId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "installmentId": "UUID",
    "receivableId": "string",
    "receivableStatus": "string",
    "syncedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Installment not found
- `NOT_LINKED` - Installment not linked to receivable
- `INTERNAL_ERROR` - Failed to sync receivable

---

### GET /collections/receivables/reconciliation
**Purpose**: Reconcile installments with receivables  
**Permission**: `collections:receivable_reconcile`

**Query Params**:
- `planId` (optional, string)
- `policyId` (optional, string)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "matched": [],
    "unmatchedInstallments": [],
    "unmatchedReceivables": [],
    "reconciledAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /collections/plans/:planId/publish-receivable-requests
**Purpose**: Publish receivable creation requests  
**Permission**: `collections:plan_publish_receivable_requests`

**Path Params**: `planId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "planId": "string",
    "requestsPublished": 0,
    "publishedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Plan not found
- `INTERNAL_ERROR` - Failed to publish receivable requests

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for collections-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "collections-service",
  "timestamp": "ISO8601",
  "uptime": 123.45,
  "components": {
    "db": "ok|error"
  },
  "error": "string (only if degraded)"
}
```

---

## Summary

**Total Endpoints**: 18

**By Controller**:
- collections.controller.ts: 17
- health.controller.ts: 1

**Authentication**:
- All endpoints except `/health` and `/collections/gateway/callback` use JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard
- Gateway callback uses HMAC signature verification

**Plan Operations**:
1. Create → `/collections/plans`
2. Get → `/collections/plans/:planId`
3. List → `/collections/plans`

**Installment Operations**:
1. Get → `/collections/installments/:installmentId`
2. List → `/collections/installments`
3. Pay → `/collections/installments/:installmentId/pay`

**Reminder Operations**:
1. Get Due → `/collections/installments/reminder/due`
2. Send → `/collections/installments/:installmentId/reminder`

**Overdue Operations**:
1. Get Overdue → `/collections/installments/overdue`
2. Mark Overdue → `/collections/installments/:installmentId/overdue`

**Late Fee Operations**:
1. Calculate → `/collections/installments/:installmentId/late-fee`
2. Apply → `/collections/installments/:installmentId/late-fee/apply`

**Gateway Payment Operations**:
1. Initiate → `/collections/installments/:installmentId/gateway/initiate`
2. Verify → `/collections/installments/:installmentId/gateway/verify`
3. Callback → `/collections/gateway/callback`

**Receivable Operations**:
1. Link → `/collections/installments/:installmentId/link-receivable`
2. Sync → `/collections/installments/:installmentId/sync-receivable`
3. Reconcile → `/collections/receivables/reconciliation`
4. Publish Requests → `/collections/plans/:planId/publish-receivable-requests`

**Permissions**:
- `collections:plan_create` - Create payment plans
- `collections:plan_view` - View payment plans
- `collections:plan_list` - List payment plans
- `collections:installment_view` - View installments
- `collections:installment_list` - List installments
- `collections:installment_pay` - Pay installments
- `collections:installment_link_receivable` - Link receivables
- `collections:installment_sync_receivable` - Sync receivables
- `collections:receivable_reconcile` - Reconcile receivables
- `collections:plan_publish_receivable_requests` - Publish receivable requests

**Plan Status**:
- active - Active plan
- completed - All installments paid
- cancelled - Plan cancelled

**Installment Status**:
- pending - Pending payment
- paid - Paid
- overdue - Overdue
- waived - Waived

**Gateway Callback Security**:
- HMAC-SHA256 signature verification using `PSP_CALLBACK_SECRET` or `COLLECTIONS_CALLBACK_SECRET`
- Signature header: `X-Gateway-Signature`
