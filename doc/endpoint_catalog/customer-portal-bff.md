# Customer Portal BFF - Endpoint Catalog

**Service**: customer-portal-bff  
**Purpose**: Backend for Frontend for customer portal (aggregates downstream services)  
**Base Path**: `/`

---

## Controllers Overview

1. **customer.controller.ts** - Customer portal BFF operations (OTP, session, policies, claims, payments, complaints, brand config, consent)
2. **health.controller.ts** - Health check

---

## 1. customer.controller.ts

**Base Path**: `/`  
**Auth**: Simple JWT validation (Bearer token exists), downstream services enforce full ABAC/tenant isolation

## OTP Endpoints (Public)

### POST /otp/initiate
**Purpose**: Initiate OTP login  
**Auth**: None (public)

**Request Body**:
```json
{
  "phoneNumber": "string (required)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "reference": "string",
    "expiresAt": "ISO8601"
  }
}
```

---

### POST /otp/verify
**Purpose**: Verify OTP  
**Auth**: None (public)

**Request Body**:
```json
{
  "reference": "string (required)",
  "code": "string (required)",
  "tenantId": "string (required)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "string",
    "customerId": "string"
  }
}
```

---

## Session Endpoints

### GET /session
**Purpose**: Get session  
**Auth**: Bearer token required

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "customerId": "string",
    "tenantId": "string",
    "phoneNumber": "string"
  },
  "correlationId": "string"
}
```

---

### POST /session/revoke
**Purpose**: Revoke session  
**Auth**: Bearer token required

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "revoked": true
  },
  "correlationId": "string"
}
```

---

## Policy Endpoints

### GET /policies
**Purpose**: List customer policies  
**Auth**: Bearer token required

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "policyId": "string",
      "policyNumber": "string",
      "status": "active|expired|cancelled",
      "startDate": "ISO8601",
      "endDate": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

### GET /policies/:policyId
**Purpose**: Get policy by ID  
**Auth**: Bearer token required

**Path Params**: `policyId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "policyId": "string",
    "policyNumber": "string",
    "status": "active|expired|cancelled",
    "coverage": {}
  },
  "correlationId": "string"
}
```

---

### POST /policies/:policyId/endorsement
**Purpose**: Request policy endorsement  
**Auth**: Bearer token required

**Path Params**: `policyId`

**Request Body**:
```json
{
  "endorsementType": "string",
  "payload": {},
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
    "endorsementId": "string",
    "status": "pending"
  },
  "correlationId": "string"
}
```

---

### POST /policies/:policyId/renewal
**Purpose**: Schedule policy renewal  
**Auth**: Bearer token required

**Path Params**: `policyId`

**Request Body**:
```json
{
  "newEndDate": "ISO8601"
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
    "renewalId": "string",
    "status": "pending"
  },
  "correlationId": "string"
}
```

---

## Claim Endpoints

### GET /claims
**Purpose**: List customer claims  
**Auth**: Bearer token required

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "claimId": "string",
      "policyId": "string",
      "status": "submitted|in_review|approved|rejected|closed",
      "incidentDate": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

### GET /claims/:claimId
**Purpose**: Get claim by ID  
**Auth**: Bearer token required

**Path Params**: `claimId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "string",
    "policyId": "string",
    "status": "submitted|in_review|approved|rejected|closed",
    "incidentDescription": "string"
  },
  "correlationId": "string"
}
```

---

### POST /fnol
**Purpose**: Submit First Notice of Loss (FNOL)  
**Auth**: Bearer token required

**Request Body**:
```json
{
  "policyId": "string (required)",
  "incidentDate": "ISO8601 (required)",
  "incidentDescription": "string (required)",
  "incidentAmount": 0,
  "documents": []
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
    "claimId": "string",
    "status": "submitted"
  },
  "correlationId": "string"
}
```

---

## Payment Endpoints

### GET /payments
**Purpose**: List customer payments  
**Auth**: Bearer token required

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "paymentId": "string",
      "policyId": "string",
      "amount": 0,
      "status": "pending|completed|failed",
      "dueDate": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

### GET /payments/:paymentId
**Purpose**: Get payment by ID  
**Auth**: Bearer token required

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
    "policyId": "string",
    "amount": 0,
    "status": "pending|completed|failed"
  },
  "correlationId": "string"
}
```

---

## Complaint Endpoints

### GET /complaints
**Purpose**: List customer complaints  
**Auth**: Bearer token required

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "complaintId": "string",
      "status": "open|in_progress|resolved|closed",
      "category": "string",
      "submittedAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

### POST /complaints
**Purpose**: Create complaint  
**Auth**: Bearer token required

**Request Body**:
```json
{
  "category": "string (required)",
  "description": "string (required)",
  "relatedClaimId": "string",
  "relatedPolicyId": "string"
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
    "complaintId": "string",
    "status": "open",
    "submittedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

## Brand Config Endpoints (Public)

### GET /brand-config/:brandKey
**Purpose**: Get brand configuration  
**Auth**: None (public)

**Path Params**: `brandKey`

**Response**:
```json
{
  "success": true,
  "data": {
    "brandKey": "string",
    "theme": {},
    "logo": "string",
    "colors": {}
  }
}
```

---

## Consent Endpoints

### GET /consent
**Purpose**: List customer consents  
**Auth**: Bearer token required

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "consentId": "string",
      "purpose": "string",
      "status": "granted|revoked",
      "grantedAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

**Errors**:
- `UNAUTHORIZED` - Customer not found in session

---

### POST /consent/grant
**Purpose**: Grant consent  
**Auth**: Bearer token required

**Request Body**:
```json
{
  "purpose": "string (required)",
  "source": "string",
  "channel": "string",
  "expiresAt": "ISO8601"
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
    "consentId": "string",
    "purpose": "string",
    "status": "granted",
    "grantedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `UNAUTHORIZED` - Customer not found in session

---

### POST /consent/revoke
**Purpose**: Revoke consent  
**Auth**: Bearer token required

**Request Body**:
```json
{
  "purpose": "string (required)",
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
    "consentId": "string",
    "purpose": "string",
    "status": "revoked",
    "revokedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `UNAUTHORIZED` - Customer not found in session
- `NOT_FOUND` - No granted consent for this purpose

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for customer-portal-bff  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok",
  "service": "customer-portal-bff",
  "timestamp": "ISO8601"
}
```

---

## Summary

**Total Endpoints**: 18

**By Controller**:
- customer.controller.ts: 17
- health.controller.ts: 1

**Authentication**:
- OTP endpoints and brand config are public
- All other endpoints require Bearer token (simple validation, downstream services enforce full ABAC/tenant isolation)

**OTP Flow**:
1. Initiate → `/otp/initiate`
2. Verify → `/otp/verify`

**Session Management**:
1. Get → `/session`
2. Revoke → `/session/revoke`

**Policy Operations**:
1. List → `/policies`
2. Get → `/policies/:policyId`
3. Endorse → `/policies/:policyId/endorsement`
4. Renew → `/policies/:policyId/renewal`

**Claim Operations**:
1. List → `/claims`
2. Get → `/claims/:claimId`
3. Submit FNOL → `/fnol`

**Payment Operations**:
1. List → `/payments`
2. Get → `/payments/:paymentId`

**Complaint Operations**:
1. List → `/complaints`
2. Create → `/complaints`

**Consent Operations**:
1. List → `/consent`
2. Grant → `/consent/grant`
3. Revoke → `/consent/revoke`

**Brand Config**:
1. Get → `/brand-config/:brandKey`

**Downstream Services**:
- customer-portal-service (policies, claims, payments, complaints)
- customer-360-service (consent)
- auth-service (session)
- notification-service (OTP)
