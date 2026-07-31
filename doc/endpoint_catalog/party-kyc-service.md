# Party KYC Service - Endpoint Catalog

**Service**: party-kyc-service  
**Purpose**: Party management, KYC workflow, AML screening, identity proofing, consent management  
**Base Path**: `/`

---

## Controllers Overview

1. **party.controller.ts** - Party CRUD, KYC workflow, AML consent, document trust chain, identity proofing, external verification, KYC exceptions, SLA compliance
2. **health.controller.ts** - Health check with database connectivity

---

## 1. party.controller.ts

**Base Path**: `/`  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**PII Masking**: PiiMaskingInterceptor applied globally

## Party Endpoints

### POST /api/v1/parties
**Purpose**: Create a new party  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `party:create`

**Request Body**:
```json
{
  "type": "individual|organization",
  "fullName": "string",
  "nationalId": "string",
  "mobile": "string"
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
    "partyId": "string",
    "type": "individual|organization",
    "fullName": "string",
    "status": "active|inactive|blocked",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - type, fullName, nationalId are required

---

### GET /api/v1/parties/:partyId
**Purpose**: Get party by ID with latest KYC  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `party:view`

**Path Params**: `partyId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "party": {
      "partyId": "string",
      "type": "individual|organization",
      "fullName": "string",
      "nationalId": "string",
      "mobile": "string",
      "status": "active|inactive|blocked"
    },
    "kyc": {
      "kycReviewId": "string",
      "status": "pending|approved|rejected",
      "workflowStage": "string"
    }
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Party not found

---

### PATCH /api/v1/parties/:partyId
**Purpose**: Update party details  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `party:manage`

**Path Params**: `partyId`

**Request Body**:
```json
{
  "fullName": "string",
  "mobile": "string",
  "status": "active|inactive|blocked"
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
    "partyId": "string",
    "type": "individual|organization",
    "fullName": "string",
    "status": "active|inactive|blocked",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /api/v1/parties
**Purpose**: List parties  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `party:list`

**Query Params**:
- `nationalId` (optional, string)
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
      "partyId": "string",
      "type": "individual|organization",
      "fullName": "string",
      "nationalId": "string",
      "status": "active|inactive|blocked"
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

## KYC Workflow Endpoints

### POST /party/:partyId/kyc/review
**Purpose**: Review KYC (approve/reject)  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:review`

**Path Params**: `partyId`

**Request Body**:
```json
{
  "decision": "approved|rejected",
  "notes": "string"
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
    "partyId": "string",
    "kycReviewId": "string",
    "status": "approved|rejected"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - decision must be approved or rejected
- `NOT_FOUND` - Party not found

---

### POST /party/:partyId/kyc/documents
**Purpose**: Submit KYC documents  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:submit`

**Path Params**: `partyId`

**Request Body**:
```json
{
  "documentTypes": ["national_id", "passport", "utility_bill", "bank_statement"]
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
    "kycReviewId": "string",
    "workflowStage": "string",
    "documentStatus": "pending|verified|rejected"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - documentTypes array is required

---

### POST /party/:partyId/kyc/documents/verify
**Purpose**: Verify KYC documents  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:verify`

**Path Params**: `partyId`

**Request Body**:
```json
{
  "decision": "verified|rejected",
  "notes": "string"
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
    "kycReviewId": "string",
    "workflowStage": "string",
    "documentStatus": "verified|rejected"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - decision must be verified or rejected

---

### POST /party/:partyId/kyc/aml-screening
**Purpose**: Run AML screening  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:screen`

**Path Params**: `partyId`

**Request Body**:
```json
{
  "providerRequestId": "string",
  "idempotencyKey": "string"
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
    "kycReviewId": "string",
    "workflowStage": "string",
    "riskLevel": "low|medium|high",
    "riskScore": 0,
    "riskFactors": ["string"],
    "amlScreeningStatus": "pending|completed|failed"
  },
  "correlationId": "string"
}
```

---

### POST /party/:partyId/kyc/escalate
**Purpose**: Escalate KYC review  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:escalate`

**Path Params**: `partyId`

**Request Body**:
```json
{
  "reason": "string",
  "escalatedTo": "string"
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
    "kycReviewId": "string",
    "workflowStage": "string",
    "escalationReason": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - reason and escalatedTo are required

---

### GET /kyc/reviews
**Purpose**: List KYC reviews  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:list`

**Query Params**:
- `partyId` (optional, string)
- `status` (optional, string)
- `workflowStage` (optional, string)
- `limit` (default: 50)
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
      "kycReviewId": "string",
      "partyId": "string",
      "status": "pending|approved|rejected",
      "workflowStage": "string"
    }
  ],
  "correlationId": "string"
}
```

---

## AML Consent Endpoints

### POST /party/:partyId/aml-consent/grant
**Purpose**: Grant AML consent  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:review`

**Path Params**: `partyId`

**Request Body**:
```json
{
  "consentType": "string",
  "validTo": "ISO8601",
  "purpose": "string",
  "legalBasis": "string",
  "channel": "string",
  "evidence": "string"
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
    "partyId": "string",
    "amlConsentStatus": "granted|revoked",
    "amlConsentType": "string",
    "amlConsentValidTo": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - consentType is required

---

### POST /party/:partyId/aml-consent/revoke
**Purpose**: Revoke AML consent  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:review`

**Path Params**: `partyId`

**Request Body**:
```json
{
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
    "partyId": "string",
    "amlConsentStatus": "revoked"
  },
  "correlationId": "string"
}
```

---

### GET /party/:partyId/aml-consent/check
**Purpose**: Check AML consent status  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `party:view`

**Path Params**: `partyId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "partyId": "string",
    "amlConsentStatus": "granted|revoked",
    "amlConsentType": "string",
    "amlConsentValidTo": "ISO8601",
    "isValid": true
  },
  "correlationId": "string"
}
```

---

### GET /party/:partyId/aml-consent/history
**Purpose**: List consent history  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `party:view`

**Path Params**: `partyId`

**Query Params**:
- `consentType` (optional, string)

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
      "partyId": "string",
      "consentType": "string",
      "status": "granted|revoked",
      "grantedAt": "ISO8601",
      "revokedAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

## Document Trust Chain Endpoints

### POST /party/:partyId/document-trust-chain
**Purpose**: Add document to trust chain  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:submit`

**Path Params**: `partyId`

**Request Body**:
```json
{
  "documentId": "string",
  "documentType": "string",
  "hash": "string",
  "verificationMethod": "manual|ai"
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
    "chainEntryId": "string",
    "partyId": "string",
    "documentId": "string",
    "documentType": "string",
    "hash": "string",
    "verificationMethod": "manual|ai",
    "trustLevel": "pending",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - documentId, documentType, and hash are required

---

### POST /party/:partyId/document-trust-chain/:documentId/verify
**Purpose**: Verify document in trust chain  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:verify`

**Path Params**: `partyId`, `documentId`

**Request Body**:
```json
{
  "trustLevel": "low|medium|high",
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
    "chainEntryId": "string",
    "partyId": "string",
    "documentId": "string",
    "trustLevel": "low|medium|high",
    "verifiedAt": "ISO8601",
    "verifiedBy": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - trustLevel is required

---

### GET /party/:partyId/document-trust-chain
**Purpose**: Get document trust chain  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:view`

**Path Params**: `partyId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "chainEntryId": "string",
      "partyId": "string",
      "documentId": "string",
      "documentType": "string",
      "hash": "string",
      "trustLevel": "low|medium|high",
      "verificationMethod": "manual|ai",
      "createdAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

## Identity Proofing Endpoints

### POST /party/:partyId/identity-proofing
**Purpose**: Perform identity proofing  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:screen`

**Path Params**: `partyId`

**Request Body**:
```json
{
  "nationalId": "string",
  "faceImage": "string",
  "documentImage": "string",
  "proofingMethod": "ai|manual"
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
    "proofingId": "string",
    "partyId": "string",
    "status": "pending|completed|failed",
    "matchScore": 0,
    "livenessCheck": true,
    "result": "matched|not_matched",
    "completedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - nationalId, faceImage, and documentImage are required

---

### GET /identity-proofing/:proofingId
**Purpose**: Get identity proofing result  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:view`

**Path Params**: `proofingId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "proofingId": "string",
    "partyId": "string",
    "status": "pending|completed|failed",
    "matchScore": 0,
    "livenessCheck": true,
    "result": "matched|not_matched",
    "completedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Identity proofing result not found

---

## External Verification Endpoints

### POST /party/:partyId/external-verification
**Purpose**: Request external verification  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:screen`

**Path Params**: `partyId`

**Request Body**:
```json
{
  "serviceType": "string",
  "requestPayload": {},
  "idempotencyKey": "string"
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
    "requestId": "string",
    "partyId": "string",
    "serviceType": "string",
    "status": "pending|completed|failed",
    "requestPayload": {},
    "responsePayload": {},
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - serviceType and requestPayload are required

---

### GET /external-verification/:requestId
**Purpose**: Get external verification request  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:view`

**Path Params**: `requestId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "requestId": "string",
    "partyId": "string",
    "serviceType": "string",
    "status": "pending|completed|failed",
    "requestPayload": {},
    "responsePayload": {},
    "createdAt": "ISO8601",
    "completedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - External verification request not found

---

## KYC Exception Endpoints

### POST /party/:partyId/kyc-exception
**Purpose**: Raise KYC exception  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:escalate`

**Path Params**: `partyId`

**Request Body**:
```json
{
  "kycReviewId": "string",
  "exceptionType": "string",
  "severity": "low|medium|high|critical",
  "description": "string"
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
    "exceptionId": "string",
    "partyId": "string",
    "kycReviewId": "string",
    "exceptionType": "string",
    "severity": "low|medium|high|critical",
    "status": "open|assigned|resolved",
    "raisedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - kycReviewId, exceptionType, severity, and description are required

---

### POST /kyc-exception/:exceptionId/assign
**Purpose**: Assign KYC exception  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:review`

**Path Params**: `exceptionId`

**Request Body**:
```json
{
  "assignedTo": "string"
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
    "exceptionId": "string",
    "assignedTo": "string",
    "status": "assigned",
    "assignedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - assignedTo is required

---

### POST /kyc-exception/:exceptionId/resolve
**Purpose**: Resolve KYC exception  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:review`

**Path Params**: `exceptionId`

**Request Body**:
```json
{
  "resolutionNotes": "string"
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
    "exceptionId": "string",
    "status": "resolved",
    "resolutionNotes": "string",
    "resolvedAt": "ISO8601",
    "resolvedBy": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - resolutionNotes is required

---

### POST /kyc-exception/:exceptionId/escalate
**Purpose**: Escalate KYC exception  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:escalate`

**Path Params**: `exceptionId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "exceptionId": "string",
    "status": "escalated",
    "escalatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /kyc-exceptions
**Purpose**: List KYC exceptions  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:list`

**Query Params**:
- `partyId` (optional, string)
- `status` (optional, string)
- `severity` (optional, string)
- `limit` (default: 50)
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
      "exceptionId": "string",
      "partyId": "string",
      "kycReviewId": "string",
      "exceptionType": "string",
      "severity": "low|medium|high|critical",
      "status": "open|assigned|resolved|escalated"
    }
  ],
  "correlationId": "string"
}
```

---

## SLA Compliance Endpoints

### GET /party/:partyId/sla-compliance
**Purpose**: Check SLA compliance for a party  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:view`

**Path Params**: `partyId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "partyId": "string",
    "slaStatus": "compliant|overdue|at_risk",
    "slaTarget": "ISO8601",
    "actualCompletion": "ISO8601",
    "overdueBy": 3600
  },
  "correlationId": "string"
}
```

---

### GET /kyc/overdue-reviews
**Purpose**: Get overdue KYC reviews  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `kyc:list`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "kycReviewId": "string",
      "partyId": "string",
      "slaTarget": "ISO8601",
      "overdueBy": 3600,
      "workflowStage": "string"
    }
  ],
  "correlationId": "string"
}
```

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for party-kyc-service with database connectivity  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "party-kyc-service",
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

**Total Endpoints**: 28

**By Controller**:
- party.controller.ts: 27
- health.controller.ts: 1

**Authentication**:
- `/health` - Public
- All other endpoints use JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard

**PII Masking**:
- PiiMaskingInterceptor applied globally to mask PII fields for unauthorized users

**Party Operations**:
1. Create Party → `/api/v1/parties` (permission: `party:create`)
2. Get Party → `/api/v1/parties/:partyId` (permission: `party:view`)
3. Update Party → `/api/v1/parties/:partyId` (permission: `party:manage`)
4. List Parties → `/api/v1/parties` (permission: `party:list`)

**KYC Workflow**:
1. Review KYC → `/party/:partyId/kyc/review` (permission: `kyc:review`)
2. Submit Documents → `/party/:partyId/kyc/documents` (permission: `kyc:submit`)
3. Verify Documents → `/party/:partyId/kyc/documents/verify` (permission: `kyc:verify`)
4. Run AML Screening → `/party/:partyId/kyc/aml-screening` (permission: `kyc:screen`)
5. Escalate Review → `/party/:partyId/kyc/escalate` (permission: `kyc:escalate`)
6. List KYC Reviews → `/kyc/reviews` (permission: `kyc:list`)

**AML Consent**:
1. Grant Consent → `/party/:partyId/aml-consent/grant` (permission: `kyc:review`)
2. Revoke Consent → `/party/:partyId/aml-consent/revoke` (permission: `kyc:review`)
3. Check Consent → `/party/:partyId/aml-consent/check` (permission: `party:view`)
4. Consent History → `/party/:partyId/aml-consent/history` (permission: `party:view`)

**Document Trust Chain**:
1. Add to Chain → `/party/:partyId/document-trust-chain` (permission: `kyc:submit`)
2. Verify Document → `/party/:partyId/document-trust-chain/:documentId/verify` (permission: `kyc:verify`)
3. Get Chain → `/party/:partyId/document-trust-chain` (permission: `kyc:view`)

**Identity Proofing**:
1. Perform Proofing → `/party/:partyId/identity-proofing` (permission: `kyc:screen`)
2. Get Result → `/identity-proofing/:proofingId` (permission: `kyc:view`)

**External Verification**:
1. Request Verification → `/party/:partyId/external-verification` (permission: `kyc:screen`)
2. Get Request → `/external-verification/:requestId` (permission: `kyc:view`)

**KYC Exceptions**:
1. Raise Exception → `/party/:partyId/kyc-exception` (permission: `kyc:escalate`)
2. Assign Exception → `/kyc-exception/:exceptionId/assign` (permission: `kyc:review`)
3. Resolve Exception → `/kyc-exception/:exceptionId/resolve` (permission: `kyc:review`)
4. Escalate Exception → `/kyc-exception/:exceptionId/escalate` (permission: `kyc:escalate`)
5. List Exceptions → `/kyc-exceptions` (permission: `kyc:list`)

**SLA Compliance**:
1. Check Compliance → `/party/:partyId/sla-compliance` (permission: `kyc:view`)
2. Overdue Reviews → `/kyc/overdue-reviews` (permission: `kyc:list`)

**Permissions**:
- `party:create` - Create party
- `party:view` - View party details
- `party:manage` - Update party
- `party:list` - List parties
- `kyc:review` - Review KYC, manage AML consent
- `kyc:submit` - Submit KYC documents, add to trust chain
- `kyc:verify` - Verify KYC documents, verify in trust chain
- `kyc:screen` - Run AML screening, identity proofing, external verification
- `kyc:escalate` - Escalate KYC review, raise/escalate exceptions
- `kyc:list` - List KYC reviews and exceptions

**Party Type**:
- individual - Individual
- organization - Organization

**Party Status**:
- active - Active
- inactive - Inactive
- blocked - Blocked

**KYC Status**:
- pending - Pending
- approved - Approved
- rejected - Rejected

**Decision Types**:
- approved - Approved
- rejected - Rejected
- verified - Verified

**Risk Level**:
- low - Low
- medium - Medium
- high - High

**Trust Level**:
- low - Low
- medium - Medium
- high - High

**Exception Severity**:
- low - Low
- medium - Medium
- high - High
- critical - Critical

**Exception Status**:
- open - Open
- assigned - Assigned
- resolved - Resolved
- escalated - Escalated

**SLA Status**:
- compliant - Compliant
- overdue - Overdue
- at_risk - At Risk

**Pagination**:
- Default limit: 50
- Maximum limit: 200
- Default offset: 0

**Audit Logging**:
- All operations are logged with correlation ID, tenant ID, actor, and action
- Validation failures are logged with warnings
- Success operations are logged with info
- Failures are logged with errors
