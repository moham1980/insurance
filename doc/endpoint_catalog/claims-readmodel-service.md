# Claims Readmodel Service - Endpoint Catalog

**Service**: claims-readmodel-service  
**Purpose**: Read model for claims, fraud cases, and complaints with PII masking  
**Base Path**: `/rm`

---

## Controllers Overview

1. **readmodel.controller.ts** - Read model operations (claims, fraud cases, complaints, summary, rebuild)
2. **health.controller.ts** - Health check

---

## 1. readmodel.controller.ts

**Base Path**: `/rm`  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard, AbacGuard

## Claim Endpoints

### GET /rm/claims
**Purpose**: List claims with PII masking  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard, AbacGuard  
**Permission**: `rm:claims:view`

**Query Params**:
- `policyId` (optional, string)
- `status` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "claimId": "string",
      "policyId": "string",
      "status": "submitted|approved|rejected|settled",
      "complainantMobile": "masked_string",
      "assignedTo": "masked_string",
      "adjusterId": "masked_string"
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

**PII Masking**:
- PII fields: `complainantMobile`, `policyNumber`, `assignedTo`, `adjusterId`
- Masked for users without PII view permission
- Roles with PII view: `insurer_admin`, `head_office_ops`, `compliance_aml`, `auditor`, `system_admin`

---

### GET /rm/claims/:claimId
**Purpose**: Get claim by ID with PII masking  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard, AbacGuard  
**Permission**: `rm:claims:view`

**Path Params**: `claimId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "string",
    "policyId": "string",
    "status": "submitted|approved|rejected|settled",
    "complainantMobile": "masked_string",
    "policyNumber": "masked_string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Claim not found

---

### GET /rm/claims/summary
**Purpose**: Get claims summary statistics  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard, AbacGuard  
**Permission**: `rm:claims:summary`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "totalClaims": 0,
    "byStatus": {
      "submitted": 0,
      "approved": 0,
      "rejected": 0,
      "settled": 0
    },
    "averageSettlementTime": 0,
    "totalSettledAmount": 0
  },
  "correlationId": "string"
}
```

---

## Fraud Case Endpoints

### GET /rm/fraud/cases
**Purpose**: List fraud cases with PII masking  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard, AbacGuard  
**Permission**: `rm:fraud:view`

**Query Params**:
- `status` (optional, string)
- `minScore` (optional, number)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "caseId": "string",
      "claimId": "string",
      "status": "open|investigating|closed",
      "fraudScore": 0,
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

## Complaint Endpoints

### GET /rm/complaints
**Purpose**: List complaints with PII masking  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard, AbacGuard  
**Permission**: `rm:complaints:view`

**Query Params**:
- `status` (optional, string)
- `complaintType` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "complaintId": "string",
      "complaintType": "string",
      "status": "open|in_progress|resolved|closed",
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

## Admin Endpoints

### POST /rm/admin/rebuild
**Purpose**: Rebuild read model projection  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard, AbacGuard  
**Permission**: `rm:claims:summary`

**Request Body**:
```json
{
  "aggregateId": "string"
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "rebuilt": true,
    "aggregateId": "string",
    "recordsProcessed": 0
  },
  "correlationId": "string"
}
```

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for claims-readmodel-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "claims-readmodel-service",
  "timestamp": "ISO8601",
  "uptime": 0,
  "components": {
    "db": "ok|error",
    "kafka": "ok|error",
    "dlqCount": 0,
    "lastProcessedAt": "ISO8601|null"
  }
}
```

---

## Summary

**Total Endpoints**: 6

**By Controller**:
- readmodel.controller.ts: 5
- health.controller.ts: 1

**Authentication**:
- All endpoints except `/health` use JwtAuthGuard, TenantGuard, PermissionsGuard, AbacGuard
- Requires specific permissions for each endpoint

**Claim Operations**:
1. List Claims → `/rm/claims` (permission: `rm:claims:view`)
2. Get Claim → `/rm/claims/:claimId` (permission: `rm:claims:view`)
3. Claims Summary → `/rm/claims/summary` (permission: `rm:claims:summary`)

**Fraud Case Operations**:
1. List Fraud Cases → `/rm/fraud/cases` (permission: `rm:fraud:view`)

**Complaint Operations**:
1. List Complaints → `/rm/complaints` (permission: `rm:complaints:view`)

**Admin Operations**:
1. Rebuild Projection → `/rm/admin/rebuild` (permission: `rm:claims:summary`)

**Permissions**:
- `rm:claims:view` - View claims
- `rm:claims:summary` - View claims summary and rebuild projection
- `rm:fraud:view` - View fraud cases
- `rm:complaints:view` - View complaints

**PII Masking**:
- PII fields are masked for users without PII view permission
- Masked format: first 2 chars + asterisks + last 2 chars
- Example: `1234567890` → `12******90`

**Roles with PII View**:
- insurer_admin
- head_office_ops
- compliance_aml
- auditor
- system_admin

**Claim Status**:
- submitted - Submitted
- approved - Approved
- rejected - Rejected
- settled - Settled

**Fraud Case Status**:
- open - Open
- investigating - Investigating
- closed - Closed

**Complaint Status**:
- open - Open
- in_progress - In Progress
- resolved - Resolved
- closed - Closed

**Pagination**:
- Default limit: 50
- Maximum limit: 200
- Default offset: 0

**Health Components**:
- db - Database connectivity
- kafka - Kafka connectivity
- dlqCount - Dead letter queue count
- lastProcessedAt - Last event processed timestamp
