# Customer Portal Service - Endpoint Catalog

**Service**: customer-portal-service  
**Purpose**: Customer portal for policyholders (OTP login, policies, claims, payments, complaints)  
**Base Path**: `/customer-portal`

---

## Controllers Overview

1. **customer-portal.controller.ts** - Customer portal operations (OTP, session, policies, claims, payments, complaints, advocacy)
2. **health.controller.ts** - Health check

---

## 1. customer-portal.controller.ts

**Base Path**: `/customer-portal`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (authenticated endpoints only)

## OTP Authentication Endpoints

### POST /customer-portal/otp/initiate
**Purpose**: Initiate OTP login  
**Auth**: None (public)

**Request Body**:
```json
{
  "tenantId": "string (required)",
  "phoneNumber": "string (required)"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "string",
    "expiresAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /customer-portal/otp/verify
**Purpose**: Verify OTP and get token  
**Auth**: None (public)

**Request Body**:
```json
{
  "sessionId": "string (required)",
  "otp": "string (required)"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "customerId": "string",
    "token": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `INVALID_OTP` - Invalid OTP code
- `SESSION_EXPIRED` - Session expired
- `SESSION_NOT_FOUND` - Session not found

---

## Session Management Endpoints

### GET /customer-portal/session/:sessionId
**Purpose**: Get session by ID  
**Auth**: None (public)

**Path Params**: `sessionId`

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "string",
    "phoneNumber": "string",
    "customerId": "string",
    "createdAt": "ISO8601",
    "expiresAt": "ISO8601"
  }
}
```

**Errors**:
- `NOT_FOUND` - Session not found

---

### POST /customer-portal/session/:sessionId/revoke
**Purpose**: Revoke session  
**Auth**: None (public)

**Path Params**: `sessionId`

**Response**:
```json
{
  "success": true,
  "data": {
    "revoked": true
  }
}
```

---

## Policy Endpoints

### GET /customer-portal/policies
**Purpose**: Get customer policies  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**Headers**:
- `X-Correlation-Id` (optional)
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "policyId": "string",
      "policyNumber": "string",
      "customerId": "string",
      "productId": "string",
      "status": "active|expired|cancelled",
      "startDate": "ISO8601",
      "endDate": "ISO8601",
      "premium": 0
    }
  ],
  "correlationId": "string"
}
```

---

### GET /customer-portal/policies/:policyId
**Purpose**: Get policy by ID  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**Path Params**: `policyId`

**Headers**:
- `X-Correlation-Id` (optional)
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "policyId": "string",
    "policyNumber": "string",
    "customerId": "string",
    "productId": "string",
    "status": "active|expired|cancelled",
    "startDate": "ISO8601",
    "endDate": "ISO8601",
    "premium": 0,
    "coverage": {}
  },
  "correlationId": "string"
}
```

---

### POST /customer-portal/policies/:policyId/endorsement
**Purpose**: Request policy endorsement  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**Path Params**: `policyId`

**Request Body**:
```json
{
  "endorsementType": "string (required)",
  "payload": {} (required),
  "reason": "string"
}
```

**Headers**:
- `X-Correlation-Id` (optional)
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "endorsementId": "string",
    "policyId": "string",
    "status": "pending",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /customer-portal/policies/:policyId/renewal
**Purpose**: Request policy renewal  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**Path Params**: `policyId`

**Request Body**:
```json
{
  "newEndDate": "string (ISO8601)"
}
```

**Headers**:
- `X-Correlation-Id` (optional)
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "renewalId": "string",
    "policyId": "string",
    "status": "pending",
    "newEndDate": "ISO8601",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

## Claim Endpoints

### GET /customer-portal/claims
**Purpose**: Get customer claims  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**Headers**:
- `X-Correlation-Id` (optional)
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "claimId": "string",
      "policyId": "string",
      "customerId": "string",
      "status": "submitted|in_review|approved|rejected|closed",
      "incidentDate": "ISO8601",
      "submittedAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

### GET /customer-portal/claims/:claimId
**Purpose**: Get claim by ID  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**Path Params**: `claimId`

**Headers**:
- `X-Correlation-Id` (optional)
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "string",
    "policyId": "string",
    "customerId": "string",
    "status": "submitted|in_review|approved|rejected|closed",
    "incidentDate": "ISO8601",
    "incidentDescription": "string",
    "submittedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /customer-portal/claims/fnol
**Purpose**: Submit First Notice of Loss (FNOL)  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**Request Body**:
```json
{
  "policyId": "string (required)",
  "incidentDate": "string (ISO8601, required)",
  "incidentDescription": "string (required)",
  "incidentAmount": 0,
  "documents": [
    {
      "name": "string",
      "type": "string",
      "url": "string"
    }
  ]
}
```

**Headers**:
- `X-Correlation-Id` (optional)
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "string",
    "policyId": "string",
    "status": "submitted",
    "submittedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /customer-portal/claims/:claimId/advocacy
**Purpose**: Get claim advocacy information  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**Path Params**: `claimId`

**Headers**:
- `X-Correlation-Id` (optional)
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "caseId": "string",
    "claimId": "string",
    "status": "open|closed",
    "advocateId": "string",
    "communications": []
  },
  "correlationId": "string"
}
```

---

### POST /customer-portal/claims/:claimId/advocacy/:caseId/communications
**Purpose**: Add advocacy communication  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**Path Params**: `claimId`, `caseId`

**Request Body**:
```json
{
  "channel": "email|sms|call|web|mobile_app (required)",
  "contentRef": "string (required)"
}
```

**Headers**:
- `X-Correlation-Id` (optional)
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "communicationId": "string",
    "caseId": "string",
    "channel": "email",
    "contentRef": "string",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /customer-portal/claims/:claimId/status
**Purpose**: Get claim status  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**Path Params**: `claimId`

**Headers**:
- `X-Correlation-Id` (optional)
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "string",
    "status": "submitted|in_review|approved|rejected|closed",
    "currentStage": "string",
    "estimatedCompletionDate": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /customer-portal/claims/:claimId/documents
**Purpose**: Upload claim document  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**Path Params**: `claimId`

**Request Body**:
```json
{
  "documentId": "string (required)",
  "documentType": "string (required)"
}
```

**Headers**:
- `X-Correlation-Id` (optional)
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "documentId": "string",
    "claimId": "string",
    "documentType": "string",
    "uploadedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

## Payment Endpoints

### GET /customer-portal/payments
**Purpose**: Get customer payments  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**Headers**:
- `X-Correlation-Id` (optional)
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "paymentId": "string",
      "policyId": "string",
      "customerId": "string",
      "amount": 0,
      "status": "pending|completed|failed",
      "dueDate": "ISO8601",
      "paidAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

## Complaint Endpoints

### GET /customer-portal/complaints
**Purpose**: Get customer complaints  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**Headers**:
- `X-Correlation-Id` (optional)
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "complaintId": "string",
      "customerId": "string",
      "status": "open|in_progress|resolved|closed",
      "category": "string",
      "description": "string",
      "submittedAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for customer-portal-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "customer-portal-service",
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

**Total Endpoints**: 16

**By Controller**:
- customer-portal.controller.ts: 15
- health.controller.ts: 1

**Authentication**:
- OTP endpoints (initiate, verify) and session endpoints are public
- All other endpoints require JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**OTP Flow**:
1. Initiate → `/customer-portal/otp/initiate`
2. Verify → `/customer-portal/otp/verify`

**Session Management**:
1. Get → `/customer-portal/session/:sessionId`
2. Revoke → `/customer-portal/session/:sessionId/revoke`

**Policy Operations**:
1. List → `/customer-portal/policies`
2. Get → `/customer-portal/policies/:policyId`
3. Request Endorsement → `/customer-portal/policies/:policyId/endorsement`
4. Request Renewal → `/customer-portal/policies/:policyId/renewal`

**Claim Operations**:
1. List → `/customer-portal/claims`
2. Get → `/customer-portal/claims/:claimId`
3. Submit FNOL → `/customer-portal/claims/fnol`
4. Get Advocacy → `/customer-portal/claims/:claimId/advocacy`
5. Add Communication → `/customer-portal/claims/:claimId/advocacy/:caseId/communications`
6. Get Status → `/customer-portal/claims/:claimId/status`
7. Upload Document → `/customer-portal/claims/:claimId/documents`

**Payment Operations**:
1. List → `/customer-portal/payments`

**Complaint Operations**:
1. List → `/customer-portal/complaints`

**Status Types**:
- Policy: active, expired, cancelled
- Claim: submitted, in_review, approved, rejected, closed
- Payment: pending, completed, failed
- Complaint: open, in_progress, resolved, closed
