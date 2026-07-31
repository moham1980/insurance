# Partner Gateway - Endpoint Catalog

**Service**: partner-gateway  
**Purpose**: Partner registration, certificate management, token exchange, and federation access control  
**Base Path**: `/partner-gateway`

---

## Controllers Overview

1. **partner-gateway.controller.ts** - Partner operations, certificate management, token exchange, access validation
2. **health.controller.ts** - Health and readiness checks

---

## 1. partner-gateway.controller.ts

**Base Path**: `/partner-gateway`  
**Auth**: Varies by endpoint (FederationSignatureGuard for token-exchange)

## Partner Endpoints

### POST /partner-gateway/partners
**Purpose**: Register a new partner  
**Auth**: None (public)

**Request Body**:
```json
{
  "name": "string",
  "type": "broker|carrier|regulator|reinsurer",
  "tenantId": "string",
  "contactEmail": "string",
  "contactPhone": "string",
  "apiScopes": ["string"],
  "allowedApis": ["string"]
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "partnerId": "string",
    "name": "string",
    "type": "broker|carrier|regulator|reinsurer",
    "tenantId": "string",
    "status": "active|suspended|revoked",
    "contactEmail": "string",
    "contactPhone": "string",
    "apiScopes": ["string"],
    "allowedApis": ["string"],
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /partner-gateway/partners
**Purpose**: List partners for a tenant  
**Auth**: None (public)

**Headers**:
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "partnerId": "string",
      "name": "string",
      "type": "broker|carrier|regulator|reinsurer",
      "tenantId": "string",
      "status": "active|suspended|revoked"
    }
  ],
  "correlationId": "string"
}
```

**Errors**:
- `BadRequestException` - x-tenant-id header required

---

### GET /partner-gateway/partners/:partnerId
**Purpose**: Get partner by ID  
**Auth**: None (public)

**Path Params**: `partnerId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "partnerId": "string",
    "name": "string",
    "type": "broker|carrier|regulator|reinsurer",
    "tenantId": "string",
    "status": "active|suspended|revoked",
    "contactEmail": "string",
    "contactPhone": "string",
    "apiScopes": ["string"],
    "allowedApis": ["string"],
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### PUT /partner-gateway/partners/:partnerId
**Purpose**: Update partner details  
**Auth**: None (public)

**Path Params**: `partnerId`

**Request Body**:
```json
{
  "name": "string",
  "contactEmail": "string",
  "contactPhone": "string",
  "apiScopes": ["string"],
  "allowedApis": ["string"]
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "partnerId": "string",
    "name": "string",
    "type": "broker|carrier|regulator|reinsurer",
    "tenantId": "string",
    "status": "active|suspended|revoked",
    "contactEmail": "string",
    "contactPhone": "string",
    "apiScopes": ["string"],
    "allowedApis": ["string"],
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /partner-gateway/partners/:partnerId/revoke
**Purpose**: Revoke a partner  
**Auth**: None (public)

**Path Params**: `partnerId`

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
    "partnerId": "string",
    "status": "revoked",
    "revokedAt": "ISO8601",
    "revocationReason": "string"
  },
  "correlationId": "string"
}
```

---

### POST /partner-gateway/partners/:partnerId/suspend
**Purpose**: Suspend a partner  
**Auth**: None (public)

**Path Params**: `partnerId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "partnerId": "string",
    "status": "suspended",
    "suspendedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /partner-gateway/partners/:partnerId/activate
**Purpose**: Activate a suspended partner  
**Auth**: None (public)

**Path Params**: `partnerId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "partnerId": "string",
    "status": "active",
    "activatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

## Certificate Endpoints

### POST /partner-gateway/partners/:partnerId/certificates
**Purpose**: Upload a certificate for a partner  
**Auth**: None (public)

**Path Params**: `partnerId`

**Request Body**:
```json
{
  "certSubject": "string",
  "certSerial": "string",
  "publicCertPem": "string",
  "issuer": "string",
  "validFrom": "ISO8601",
  "expiresAt": "ISO8601"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "certId": "string",
    "partnerId": "string",
    "certSubject": "string",
    "certSerial": "string",
    "publicCertPem": "string",
    "issuer": "string",
    "validFrom": "ISO8601",
    "expiresAt": "ISO8601",
    "status": "active",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /partner-gateway/partners/:partnerId/certificates
**Purpose**: List certificates for a partner  
**Auth**: None (public)

**Path Params**: `partnerId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "certId": "string",
      "partnerId": "string",
      "certSubject": "string",
      "certSerial": "string",
      "issuer": "string",
      "validFrom": "ISO8601",
      "expiresAt": "ISO8601",
      "status": "active|revoked|expired"
    }
  ],
  "correlationId": "string"
}
```

---

### POST /partner-gateway/partners/:partnerId/certificates/:certId/rotate
**Purpose**: Rotate a certificate  
**Auth**: None (public)

**Path Params**: `partnerId`, `certId`

**Request Body**:
```json
{
  "publicCertPem": "string",
  "certSubject": "string",
  "certSerial": "string",
  "issuer": "string",
  "validFrom": "ISO8601",
  "expiresAt": "ISO8601"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "certId": "string",
    "partnerId": "string",
    "certSubject": "string",
    "certSerial": "string",
    "publicCertPem": "string",
    "issuer": "string",
    "validFrom": "ISO8601",
    "expiresAt": "ISO8601",
    "status": "active",
    "rotatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /partner-gateway/certificates/expiring
**Purpose**: Get expiring certificates  
**Auth**: None (public)

**Headers**:
- `X-Days-Ahead` (default: 30)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "certId": "string",
      "partnerId": "string",
      "certSubject": "string",
      "certSerial": "string",
      "issuer": "string",
      "expiresAt": "ISO8601",
      "daysUntilExpiry": 15,
      "status": "active"
    }
  ],
  "correlationId": "string"
}
```

---

## Token Exchange Endpoints

### POST /partner-gateway/token-exchange
**Purpose**: Exchange federation tokens  
**Auth**: FederationSignatureGuard (requires signed request)

**Request Body**:
```json
{
  "partnerId": "string",
  "subjectToken": "string",
  "subjectTokenType": "string",
  "audience": "string",
  "scope": "string",
  "requestedTokenType": "urn:ietf:params:oauth:token-type:access_token"
}
```

**Headers**:
- `X-Federation-Nonce` (required for replay protection)
- `X-Correlation-Id` (optional)
- `X-Federation-Signature` (required - federation signature)
- `X-Federation-Key-Id` (required - signing key ID)

**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "scope": "string",
    "issuedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Note**: This endpoint requires federation signature validation. The request body hash is computed for replay protection.

---

## Access Validation Endpoints

### POST /partner-gateway/validate-access
**Purpose**: Validate partner access to an API  
**Auth**: None (public)

**Request Body**:
```json
{
  "certSubject": "string",
  "requestedApi": "string",
  "requestedScope": "string"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "partnerId": "string",
    "allowed": true
  },
  "correlationId": "string"
}
```

---

## 2. health.controller.ts

**Base Path**: `/health`

### GET /health
**Purpose**: Health check for partner-gateway  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok",
  "service": "partner-gateway",
  "timestamp": "ISO8601"
}
```

---

### GET /health/ready
**Purpose**: Readiness check for partner-gateway  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ready",
  "service": "partner-gateway",
  "timestamp": "ISO8601"
}
```

---

## Summary

**Total Endpoints**: 15

**By Controller**:
- partner-gateway.controller.ts: 13
- health.controller.ts: 2

**Authentication**:
- `/health/*` - Public
- `/partner-gateway/partners/*` - Public (partner registration/management)
- `/partner-gateway/certificates/*` - Public (certificate management)
- `/partner-gateway/token-exchange` - FederationSignatureGuard (requires signed request)
- `/partner-gateway/validate-access` - Public

**Partner Operations**:
1. Register Partner → `/partner-gateway/partners`
2. List Partners → `/partner-gateway/partners` (requires x-tenant-id)
3. Get Partner → `/partner-gateway/partners/:partnerId`
4. Update Partner → `/partner-gateway/partners/:partnerId`
5. Revoke Partner → `/partner-gateway/partners/:partnerId/revoke`
6. Suspend Partner → `/partner-gateway/partners/:partnerId/suspend`
7. Activate Partner → `/partner-gateway/partners/:partnerId/activate`

**Certificate Operations**:
1. Upload Certificate → `/partner-gateway/partners/:partnerId/certificates`
2. List Certificates → `/partner-gateway/partners/:partnerId/certificates`
3. Rotate Certificate → `/partner-gateway/partners/:partnerId/certificates/:certId/rotate`
4. Get Expiring Certificates → `/partner-gateway/certificates/expiring`

**Token Exchange**:
1. Exchange Token → `/partner-gateway/token-exchange` (requires FederationSignatureGuard)

**Access Validation**:
1. Validate Access → `/partner-gateway/validate-access`

**Health Operations**:
1. Health Check → `/health`
2. Readiness Check → `/health/ready`

**Partner Types**:
- broker - Broker
- carrier - Carrier
- regulator - Regulator
- reinsurer - Reinsurer

**Partner Status**:
- active - Active
- suspended - Suspended
- revoked - Revoked

**Certificate Status**:
- active - Active
- revoked - Revoked
- expired - Expired

**Federation Signature**:
- Token exchange endpoint requires federation signature validation
- Headers: `X-Federation-Signature`, `X-Federation-Key-Id`, `X-Federation-Nonce`
- Replay protection via body hash and nonce

**Rate Limiting**:
- Configured per partner and endpoint
- Implemented via RateLimitService

**Replay Protection**:
- Request body hash computed for token exchange
- Nonce-based replay protection

**Certificate Rotation**:
- Supports certificate rotation without partner re-registration
- Old certificates marked as revoked

**Expiring Certificates**:
- Configurable days ahead (default: 30)
- Used for certificate renewal notifications
