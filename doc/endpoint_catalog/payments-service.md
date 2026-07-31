# Payments Service - Endpoint Catalog

**Service**: payments-service  
**Purpose**: Payment processing, gateway integration, reconciliation, refunds, disputes  
**Base Path**: `/`

---

## Controllers Overview

1. **payments.controller.ts** - Payment lifecycle operations (prepare, approve, execute, fail, notify, view, list, gateway initiate, reconcile, refund, dispute)
2. **gateway-callback.controller.ts** - Gateway callback handling
3. **health.controller.ts** - Health check with database connectivity

---

## 1. payments.controller.ts

**Base Path**: `/`  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard

## Payment Lifecycle Endpoints

### POST /payments/prepare
**Purpose**: Prepare a payment intent  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `payments:prepare`

**Request Body**:
```json
{
  "idempotencyKey": "string",
  "claimId": "string",
  "amount": 1000,
  "currency": "IRR",
  "beneficiaryPartyId": "string",
  "destinationIban": "string",
  "paymentDocs": ["string"],
  "isPartial": false,
  "partialIndex": 0,
  "totalPartialCount": 1
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "string",
    "claimId": "string",
    "amount": 1000,
    "currency": "IRR",
    "status": "prepared|approved|executed|failed|notified",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `FORBIDDEN` - Tenant identifier required
- `VALIDATION_ERROR` - idempotencyKey, claimId, amount are required

---

### POST /payments/:paymentIntentId/approve
**Purpose**: Finance approve a payment intent  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `payments:approve`

**Path Params**: `paymentIntentId`

**Request Body**:
```json
{
  "decisionNotes": "string"
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "string",
    "status": "approved",
    "approvedAt": "ISO8601",
    "approvedBy": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `FORBIDDEN` - Tenant identifier required
- `NOT_FOUND` - Payment intent not found
- `INVALID_STATE` - Invalid state transition
- `SOD_VIOLATION` - Segregation of duties violation

---

### POST /payments/:paymentIntentId/execute
**Purpose**: Execute a payment  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `payments:execute`

**Path Params**: `paymentIntentId`

**Request Body**:
```json
{
  "provider": "string",
  "providerRef": "string",
  "fromAccountId": "string",
  "toAccountId": "string",
  "paymentType": "transfer|card_to_card|bill_payment",
  "preferredRail": "SATNA|PAYA|SHETAB",
  "reference": "string",
  "description": "string",
  "metadata": {}
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "string",
    "paymentId": "string",
    "status": "executed",
    "executedAt": "ISO8601",
    "provider": "string",
    "providerRef": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `FORBIDDEN` - Tenant identifier required
- `NOT_FOUND` - Payment intent not found
- `INVALID_STATE` - Invalid state transition
- `NO_PAYMENT_PROVIDER` - No payment provider configured
- `PSP_EXECUTE_FAILED` - PSP execution failed

---

### POST /payments/:paymentIntentId/fail
**Purpose**: Fail a payment intent  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `payments:fail`

**Path Params**: `paymentIntentId`

**Request Body**:
```json
{
  "reasonCode": "string",
  "reasonMessage": "string"
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "string",
    "status": "failed",
    "failedAt": "ISO8601",
    "reasonCode": "string",
    "reasonMessage": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `FORBIDDEN` - Tenant identifier required
- `NOT_FOUND` - Payment intent not found
- `INVALID_STATE` - Invalid state transition

---

### POST /payments/:paymentIntentId/notify
**Purpose**: Notify payment completion  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `payments:notify`

**Path Params**: `paymentIntentId`

**Request Body**:
```json
{
  "channel": "email|sms|push",
  "details": {}
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "string",
    "status": "notified",
    "notifiedAt": "ISO8601",
    "channel": "email|sms|push"
  },
  "correlationId": "string"
}
```

**Errors**:
- `FORBIDDEN` - Tenant identifier required
- `NOT_FOUND` - Payment intent not found
- `INVALID_STATE` - Invalid state transition

---

## Payment Query Endpoints

### GET /payments/:paymentIntentId
**Purpose**: Get payment intent by ID  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `payments:view`

**Path Params**: `paymentIntentId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "string",
    "claimId": "string",
    "amount": 1000,
    "currency": "IRR",
    "status": "prepared|approved|executed|failed|notified",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `FORBIDDEN` - Tenant identifier required
- `NOT_FOUND` - Payment intent not found

---

### GET /api/v1/ecosystem/payments/:paymentId
**Purpose**: Get payment by ID (ecosystem endpoint)  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `payments:view`

**Path Params**: `paymentId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentId": "string",
    "paymentIntentId": "string",
    "claimId": "string",
    "amount": 1000,
    "currency": "IRR",
    "status": "executed|failed",
    "provider": "string",
    "providerRef": "string",
    "executedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `FORBIDDEN` - Tenant identifier required
- `NOT_FOUND` - Payment not found

---

### GET /payments
**Purpose**: List payment intents  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `payments:list`

**Query Params**:
- `claimId` (optional, string)
- `status` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "paymentIntentId": "string",
      "claimId": "string",
      "amount": 1000,
      "currency": "IRR",
      "status": "prepared|approved|executed|failed|notified"
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

**Errors**:
- `FORBIDDEN` - Tenant identifier required

---

## Gateway Integration Endpoints

### POST /payments/:paymentIntentId/gateway/initiate
**Purpose**: Initiate gateway payment  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `payments:execute`

**Path Params**: `paymentIntentId`

**Request Body**:
```json
{
  "gatewayProvider": "string",
  "gatewayConfig": {},
  "returnUrl": "string",
  "cancelUrl": "string"
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "string",
    "gatewayPaymentId": "string",
    "gatewayProvider": "string",
    "redirectUrl": "string",
    "status": "pending_gateway"
  },
  "correlationId": "string"
}
```

**Errors**:
- `FORBIDDEN` - Tenant identifier required
- `VALIDATION_ERROR` - gatewayProvider is required
- `NOT_FOUND` - Payment intent not found

---

## Reconciliation and Dispute Endpoints

### POST /payments/reconcile
**Purpose**: Reconcile payments  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `payments:reconcile`

**Request Body**:
```json
{
  "dateFrom": "ISO8601",
  "dateTo": "ISO8601"
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "reconciled": 0,
    "discrepancies": 0,
    "details": []
  },
  "correlationId": "string"
}
```

**Errors**:
- `FORBIDDEN` - Tenant identifier required
- `VALIDATION_ERROR` - dateFrom and dateTo are required

---

### POST /payments/:paymentId/refund
**Purpose**: Refund a payment  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `payments:refund`

**Path Params**: `paymentId`

**Request Body**:
```json
{
  "amount": 1000,
  "reason": "string"
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "refundId": "string",
    "paymentId": "string",
    "amount": 1000,
    "status": "pending|completed|failed",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `FORBIDDEN` - Tenant identifier required
- `VALIDATION_ERROR` - paymentId and amount are required

---

### POST /payments/:paymentId/dispute
**Purpose**: Create a payment dispute  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `payments:dispute`

**Path Params**: `paymentId`

**Request Body**:
```json
{
  "reason": "string",
  "evidence": {}
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "disputeId": "string",
    "paymentId": "string",
    "reason": "string",
    "status": "open|under_review|resolved|closed",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `FORBIDDEN` - Tenant identifier required
- `VALIDATION_ERROR` - paymentId and reason are required

---

## 2. gateway-callback.controller.ts

**Base Path**: `/`  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard

### POST /payments/gateway/callback
**Purpose**: Handle gateway callback  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `payments:gateway_callback`

**Request Body**:
```json
{
  "gatewayPaymentId": "string",
  "status": "success|failed|pending",
  "gatewayRef": "string",
  "gatewayResponse": {},
  "amount": 1000,
  "currency": "IRR",
  "claimId": "string",
  "signature": "string"
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "string",
    "paymentId": "string",
    "status": "executed|failed",
    "gatewayPaymentId": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `FORBIDDEN` - Tenant identifier required
- `VALIDATION_ERROR` - gatewayPaymentId and status are required
- `UNAUTHORIZED` - Callback signature required or invalid
- `NOT_FOUND` - Payment intent not found

**HMAC Signature**:
- If `PSP_CALLBACK_SECRET` is configured, callback must include signature
- Signature computed as HMAC-SHA256 of `gatewayPaymentId:gatewayRef:status`
- Environment variable: `PSP_CALLBACK_SECRET`

---

## 3. health.controller.ts

### GET /health
**Purpose**: Health check for payments-service with database connectivity  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "payments-service",
  "timestamp": "ISO8601",
  "uptime": 0,
  "components": {
    "db": "ok|error"
  }
}
```

**Errors**:
- `degraded` status returned if database connection fails

---

## Summary

**Total Endpoints**: 13

**By Controller**:
- payments.controller.ts: 11
- gateway-callback.controller.ts: 1
- health.controller.ts: 1

**Authentication**:
- `/health` - Public
- All other endpoints use JwtAuthGuard, PermissionsGuard, TenantGuard

**Payment Lifecycle**:
1. Prepare → `/payments/prepare` (permission: `payments:prepare`)
2. Approve → `/payments/:paymentIntentId/approve` (permission: `payments:approve`)
3. Execute → `/payments/:paymentIntentId/execute` (permission: `payments:execute`)
4. Fail → `/payments/:paymentIntentId/fail` (permission: `payments:fail`)
5. Notify → `/payments/:paymentIntentId/notify` (permission: `payments:notify`)

**Payment Queries**:
1. Get Intent → `/payments/:paymentIntentId` (permission: `payments:view`)
2. Get Payment → `/api/v1/ecosystem/payments/:paymentId` (permission: `payments:view`)
3. List Intents → `/payments` (permission: `payments:list`)

**Gateway Integration**:
1. Initiate Gateway → `/payments/:paymentIntentId/gateway/initiate` (permission: `payments:execute`)
2. Gateway Callback → `/payments/gateway/callback` (permission: `payments:gateway_callback`)

**Reconciliation and Disputes**:
1. Reconcile → `/payments/reconcile` (permission: `payments:reconcile`)
2. Refund → `/payments/:paymentId/refund` (permission: `payments:refund`)
3. Dispute → `/payments/:paymentId/dispute` (permission: `payments:dispute`)

**Permissions**:
- `payments:prepare` - Prepare payment intents
- `payments:approve` - Finance approve payments
- `payments:execute` - Execute payments, initiate gateway
- `payments:fail` - Fail payments
- `payments:notify` - Notify payment completion
- `payments:view` - View payment intents and payments
- `payments:list` - List payment intents
- `payments:gateway_callback` - Handle gateway callbacks
- `payments:reconcile` - Reconcile payments
- `payments:refund` - Refund payments
- `payments:dispute` - Create payment disputes

**Payment Intent Status**:
- prepared - Prepared
- approved - Approved
- executed - Executed
- failed - Failed
- notified - Notified
- pending_gateway - Pending Gateway

**Payment Status**:
- executed - Executed
- failed - Failed

**Gateway Callback Status**:
- success - Success
- failed - Failed
- pending - Pending

**Payment Type**:
- transfer - Transfer
- card_to_card - Card to Card
- bill_payment - Bill Payment

**Payment Rail**:
- SATNA - SATNA
- PAYA - PAYA
- SHETAB - SHETAB

**Notification Channel**:
- email - Email
- sms - SMS
- push - Push

**Dispute Status**:
- open - Open
- under_review - Under Review
- resolved - Resolved
- closed - Closed

**Pagination**:
- Default limit: 50
- Maximum limit: 200
- Default offset: 0

**Idempotency**:
- Payment preparation requires idempotencyKey
- Prevents duplicate payment intents

**Segregation of Duties (SOD)**:
- Prepare and approve must be performed by different users
- SOD violation check during approval

**Gateway Callback Security**:
- HMAC-SHA256 signature validation when `PSP_CALLBACK_SECRET` is configured
- Signature format: HMAC-SHA256(gatewayPaymentId:gatewayRef:status)

**Audit Logging**:
- All operations are logged with correlation ID, tenant ID, actor, and action
- Validation failures are logged with warnings
- Success operations are logged with info
- Failures are logged with errors
