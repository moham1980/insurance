# Customer 360 Service - Endpoint Catalog

**Service**: customer-360-service  
**Purpose**: Customer 360 profile, portfolio summary, and consent management  
**Base Path**: `/customer-360`

---

## Controllers Overview

1. **customer-360.controller.ts** - Customer 360 operations (profile, portfolio, consents)
2. **health.controller.ts** - Health check

---

## 1. customer-360.controller.ts

**Base Path**: `/customer-360`  
**Auth**: JwtAuthGuard + AbacGuard + TenantGuard (all endpoints)

### GET /customer-360/:customerId
**Purpose**: Get customer 360 profile  
**Auth**: JwtAuthGuard + AbacGuard + TenantGuard

**Path Params**: `customerId`

**Headers**:
- `X-Correlation-Id` (optional)
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "customerId": "string",
    "tenantId": "string",
    "profile": {
      "firstName": "string",
      "lastName": "string",
      "dateOfBirth": "ISO8601",
      "nationalId": "string"
    },
    "contact": {
      "phoneNumber": "string",
      "email": "string",
      "address": {}
    },
    "policies": [],
    "claims": [],
    "payments": []
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Internal server error

---

### GET /customer-360/:customerId/portfolio
**Purpose**: Get customer portfolio summary  
**Auth**: JwtAuthGuard + AbacGuard + TenantGuard

**Path Params**: `customerId`

**Headers**:
- `X-Correlation-Id` (optional)
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "customerId": "string",
    "totalPolicies": 0,
    "activePolicies": 0,
    "totalPremium": 0,
    "totalClaims": 0,
    "openClaims": 0,
    "totalPaid": 0,
    "outstandingBalance": 0,
    "policiesByProduct": {},
    "claimsByStatus": {}
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Internal server error

---

### GET /customer-360/:customerId/consents
**Purpose**: List customer consents  
**Auth**: JwtAuthGuard + AbacGuard + TenantGuard

**Path Params**: `customerId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "consentId": "UUID",
      "customerId": "string",
      "purpose": "string",
      "status": "granted|denied|revoked",
      "grantedAt": "ISO8601",
      "expiresAt": "ISO8601",
      "source": "string",
      "channel": "string",
      "version": "string"
    }
  ],
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Internal server error

---

### POST /customer-360/:customerId/consents
**Purpose**: Record consent  
**Auth**: JwtAuthGuard + AbacGuard + TenantGuard

**Path Params**: `customerId`

**Request Body**:
```json
{
  "purpose": "string (required)",
  "status": "granted|denied (default: granted)",
  "expiresAt": "ISO8601",
  "source": "string",
  "channel": "string",
  "version": "string"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "consentId": "UUID",
    "customerId": "string",
    "purpose": "string",
    "status": "granted",
    "grantedAt": "ISO8601",
    "expiresAt": "ISO8601",
    "source": "string",
    "channel": "string",
    "version": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Internal server error

---

### POST /customer-360/:customerId/consents/:consentId/revoke
**Purpose**: Revoke consent  
**Auth**: JwtAuthGuard + AbacGuard + TenantGuard

**Path Params**: `customerId`, `consentId`

**Request Body**:
```json
{
  "reason": "string"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "consentId": "UUID",
    "customerId": "string",
    "purpose": "string",
    "status": "revoked",
    "revokedAt": "ISO8601",
    "reason": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Consent not found
- `INTERNAL_ERROR` - Internal server error

---

### GET /customer-360/:customerId/consents/check
**Purpose**: Check consent for specific purpose  
**Auth**: JwtAuthGuard + AbacGuard + TenantGuard

**Path Params**: `customerId`

**Query Params**: `purpose` (required)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "customerId": "string",
    "purpose": "string",
    "hasConsent": true,
    "status": "granted",
    "grantedAt": "ISO8601",
    "expiresAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Internal server error

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for customer-360-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "customer-360-service",
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

**Total Endpoints**: 6

**By Controller**:
- customer-360.controller.ts: 5
- health.controller.ts: 1

**Authentication**:
- All endpoints except `/health` use JwtAuthGuard + AbacGuard + TenantGuard

**Customer 360 Operations**:
1. Get Profile → `/customer-360/:customerId`
2. Get Portfolio → `/customer-360/:customerId/portfolio`

**Consent Operations**:
1. List → `/customer-360/:customerId/consents`
2. Record → `/customer-360/:customerId/consents`
3. Revoke → `/customer-360/:customerId/consents/:consentId/revoke`
4. Check → `/customer-360/:customerId/consents/check`

**Consent Status**:
- granted - Consent granted by customer
- denied - Consent denied by customer
- revoked - Consent revoked by customer

**Downstream Services**:
- policy-service (policies)
- claims-service (claims)
- billing-service (payments)
