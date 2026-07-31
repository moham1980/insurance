# Complaints Service - Endpoint Catalog

**Service**: complaints-service  
**Purpose**: Complaint management, escalation, mobile verification, central insurance integration, and analysis  
**Base Path**: `/`

---

## Controllers Overview

1. **complaints.controller.ts** - Complaint operations (create, escalate, list, get, dashboard, status, attachments, OTP, export, analysis, central insurance)
2. **health.controller.ts** - Health check

---

## 1. complaints.controller.ts

**Base Path**: `/`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (all endpoints except /health)

### POST /complaints
**Purpose**: Create complaint  
**Permission**: `complaints:create`

**Request Body**:
```json
{
  "complaintType": "string (required)",
  "description": "string (required)",
  "policyCompanyName": "string",
  "policyNumber": "string",
  "policyTitle": "string",
  "policyId": "string",
  "claimId": "string",
  "complainantNationalId": "string",
  "complainantBirthDate": "ISO8601",
  "complainantMobile": "string",
  "complainantAddress": "string",
  "complainantRepresentativeStatus": "string",
  "assignedTo": "string"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "complaintId": "UUID",
    "complaintType": "string",
    "status": "open|in_progress|resolved|closed",
    "description": "string",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - complaintType and description are required

---

### POST /complaints/:complaintId/escalate
**Purpose**: Escalate complaint  
**Permission**: `complaints:escalate`

**Path Params**: `complaintId`

**Request Body**:
```json
{
  "reason": "string (required)",
  "assignedTo": "string"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "complaintId": "UUID",
    "status": "escalated",
    "escalatedAt": "ISO8601",
    "escalatedReason": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - reason is required
- `NOT_FOUND` - Complaint not found

---

### GET /complaints/:complaintId
**Purpose**: Get complaint by ID  
**Permission**: `complaints:view`

**Path Params**: `complaintId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "complaint": {
      "complaintId": "UUID",
      "complaintType": "string",
      "status": "open|in_progress|resolved|closed",
      "description": "string",
      "createdAt": "ISO8601"
    },
    "attachments": []
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Complaint not found

---

### GET /complaints
**Purpose**: List complaints  
**Permission**: `complaints:list`

**Query Params**:
- `status` (optional, string)
- `complaintType` (optional, string)
- `policyNumber` (optional, string)
- `claimId` (optional, string)
- `complainantNationalId` (optional, string)
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
      "complaintId": "UUID",
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

### GET /complaints/dashboard
**Purpose**: Get complaints dashboard  
**Permission**: `complaints:dashboard`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "totalComplaints": 0,
    "openComplaints": 0,
    "inProgressComplaints": 0,
    "resolvedComplaints": 0,
    "closedComplaints": 0,
    "slaBreached": 0,
    "averageResolutionTime": 0,
    "complaintsByType": {},
    "complaintsByStatus": {}
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to load complaints dashboard

---

### POST /complaints/:complaintId/status
**Purpose**: Update complaint status  
**Permission**: `complaints:update_status`

**Path Params**: `complaintId`

**Request Body**:
```json
{
  "status": "string (required)",
  "resolutionSummary": "string"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "complaintId": "UUID",
    "status": "open|in_progress|resolved|closed",
    "resolutionSummary": "string",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - status is required
- `NOT_FOUND` - Complaint not found

---

### POST /complaints/:complaintId/attachments
**Purpose**: Attach document to complaint  
**Permission**: `complaints:attach_document`

**Path Params**: `complaintId`

**Request Body**:
```json
{
  "documentId": "string (required)",
  "notes": "string"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "attachmentId": "UUID",
    "complaintId": "string",
    "documentId": "string",
    "notes": "string",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - documentId is required
- `NOT_FOUND` - Complaint not found

---

### POST /complaints/:complaintId/mobile/otp/request
**Purpose**: Request mobile OTP for complaint verification  
**Permission**: `complaints:otp_request`

**Path Params**: `complaintId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "complaintId": "string",
    "otpSent": true,
    "expiresAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `MOBILE_NOT_SET` - complainantMobile not set
- `INTERNAL_ERROR` - Failed to request OTP

---

### POST /complaints/:complaintId/mobile/otp/verify
**Purpose**: Verify mobile OTP for complaint  
**Permission**: `complaints:otp_verify`

**Path Params**: `complaintId`

**Request Body**:
```json
{
  "code": "string (required)"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "complaintId": "string",
    "complainantMobileVerified": true,
    "complainantMobileVerifiedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - code is required
- `OTP_INVALID` - Invalid OTP code
- `OTP_EXPIRED` - OTP expired
- `INTERNAL_ERROR` - Failed to verify OTP

---

### GET /complaints/:complaintId/export/central-insurance
**Purpose**: Export complaint for Central Insurance  
**Permission**: `complaints:export`

**Path Params**: `complaintId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "schemaVersion": "central-insurance-complaint-v1",
    "complaint": {
      "complaintId": "UUID",
      "type": "string",
      "status": "string",
      "createdAt": "ISO8601",
      "description": "string"
    },
    "policy": {
      "companyName": "string",
      "policyNumber": "string",
      "policyTitle": "string",
      "policyId": "string"
    },
    "claim": {
      "claimId": "string"
    },
    "complainant": {
      "nationalId": "string",
      "birthDate": "ISO8601",
      "mobile": "string",
      "mobileVerified": true,
      "mobileVerifiedAt": "ISO8601",
      "address": "string",
      "representativeStatus": "string"
    },
    "evidence": {
      "attachments": []
    },
    "internal": {
      "assignedTo": "string",
      "firstResponseAt": "ISO8601",
      "resolvedAt": "ISO8601",
      "escalatedAt": "ISO8601",
      "resolutionSummary": "string",
      "createdBy": "string",
      "tenantId": "string",
      "exportedBy": "string",
      "exportedAt": "ISO8601"
    }
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Complaint not found
- `MOBILE_NOT_VERIFIED` - complainantMobile must be verified for central insurance export
- `VALIDATION_ERROR` - Missing required fields for central insurance export

---

### GET /complaints/analysis/recurring-causes
**Purpose**: Analyze recurring complaint causes  
**Permission**: `complaints:view`

**Query Params**:
- `startDate` (optional, ISO8601)
- `endDate` (optional, ISO8601)
- `complaintType` (optional, string)
- `minOccurrences` (optional, integer)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "causes": [
      {
        "cause": "string",
        "occurrences": 0,
        "percentage": 0,
        "firstOccurrence": "ISO8601",
        "lastOccurrence": "ISO8601"
      }
    ],
    "totalComplaints": 0,
    "analyzedPeriod": {
      "startDate": "ISO8601",
      "endDate": "ISO8601"
    }
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Analysis failed

---

### GET /complaints/analysis/cause-trends
**Purpose**: Get cause trends over time  
**Permission**: `complaints:view`

**Query Params**:
- `cause` (required, string)
- `days` (optional, integer)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "cause": "string",
    "trends": [
      {
        "date": "ISO8601",
        "count": 0
      }
    ],
    "period": {
      "days": 30,
      "startDate": "ISO8601",
      "endDate": "ISO8601"
    }
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - cause parameter is required
- `INTERNAL_ERROR` - Trend analysis failed

---

### POST /complaints/:complaintId/central-insurance/send
**Purpose**: Send complaint to Central Insurance  
**Permission**: `complaints:manage`

**Path Params**: `complaintId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "complaintId": "string",
    "sentAt": "ISO8601",
    "centralInsuranceReference": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to send to Central Insurance

---

### GET /complaints/:complaintId/central-insurance/status
**Purpose**: Get Central Insurance status  
**Permission**: `complaints:view`

**Path Params**: `complaintId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "complaintId": "string",
    "sentAt": "ISO8601",
    "status": "pending|accepted|rejected|processing",
    "centralInsuranceReference": "string",
    "lastUpdatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /complaints/:complaintId/central-insurance/retry
**Purpose**: retry failed Central Insurance send  
**Permission**: `complaints:manage`

**Path Params**: `complaintId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "complaintId": "string",
    "retriedAt": "ISO8601",
    "retryCount": 1
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to retry send to Central Insurance

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for complaints-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "complaints-service",
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
- complaints.controller.ts: 15
- health.controller.ts: 1

**Authentication**:
- All endpoints except `/health` use JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**Complaint Lifecycle**:
1. Create → `/complaints`
2. List → `/complaints`
3. Get → `/complaints/:complaintId`
4. Update Status → `/complaints/:complaintId/status`
5. Escalate → `/complaints/:complaintId/escalate`
6. Attach Document → `/complaints/:complaintId/attachments`

**Mobile Verification**:
1. Request OTP → `/complaints/:complaintId/mobile/otp/request`
2. Verify OTP → `/complaints/:complaintId/mobile/otp/verify`

**Central Insurance Integration**:
1. Export → `/complaints/:complaintId/export/central-insurance`
2. Send → `/complaints/:complaintId/central-insurance/send`
3. Status → `/complaints/:complaintId/central-insurance/status`
4. Retry → `/complaints/:complaintId/central-insurance/retry`

**Analysis**:
1. Recurring Causes → `/complaints/analysis/recurring-causes`
2. Cause Trends → `/complaints/analysis/cause-trends`

**Dashboard**:
1. Dashboard → `/complaints/dashboard`

**Permissions**:
- `complaints:create` - Create complaints
- `complaints:escalate` - Escalate complaints
- `complaints:view` - View complaints and analysis
- `complaints:list` - List complaints
- `complaints:dashboard` - View dashboard
- `complaints:update_status` - Update complaint status
- `complaints:attach_document` - Attach documents
- `complaints:otp_request` - Request mobile OTP
- `complaints:otp_verify` - Verify mobile OTP
- `complaints:export` - Export for Central Insurance
- `complaints:manage` - Manage Central Insurance integration

**Complaint Status**:
- open - New complaint
- in_progress - Being investigated
- resolved - Resolved
- closed - Closed
- escalated - Escalated

**Central Insurance Status**:
- pending - Pending acceptance
- accepted - Accepted by Central Insurance
- rejected - Rejected by Central Insurance
- processing - Being processed

**Required Fields for Central Insurance Export**:
- complaintType
- description
- policyCompanyName
- policyNumber
- policyTitle
- complainantNationalId
- complainantBirthDate
- complainantMobile (must be verified)
- complainantAddress
- complainantRepresentativeStatus
