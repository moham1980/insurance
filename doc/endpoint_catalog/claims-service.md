# Claims Service - Endpoint Catalog

**Service**: claims-service  
**Purpose**: Claims lifecycle management, FNOL, advocacy, adjuster referrals, recovery  
**Base Path**: `/` (varies by controller)

---

## Controllers Overview

1. **claims.controller.ts** - Core claims lifecycle (register, assess, approve, reject, pay, close)
2. **advocacy/advocacy.controller.ts** - Advocacy cases, adjuster referrals, projections, recovery, documents
3. **health.controller.ts** - Health check

---

## 1. claims.controller.ts

**Base Path**: `/`  
**Auth**: JWT + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### POST /claims
**Purpose**: Register new claim  
**Permission**: `claims:register`

**Headers**:
- `X-Correlation-Id` (optional)
- `X-Idempotency-Key` (optional for idempotency)

**Request Body**:
```json
{
  "policyId": "UUID",
  "policyNumber": "string",
  "claimantPartyId": "UUID",
  "brokerOrganizationId": "UUID",
  "distributionOrganizationId": "UUID",
  "carrierOrganizationId": "UUID",
  "recordOwnerOrganizationId": "UUID",
  "authoritativeTenantId": "UUID",
  "representativePartyId": "UUID",
  "claimType": "string",
  "notificationChannel": "string",
  "lossDate": "ISO8601",
  "lossType": "string",
  "description": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "UUID",
    "claimNumber": "string",
    "status": "string",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required fields (policyId, claimantPartyId, lossDate, lossType)
- `IDEMPOTENCY_CONFLICT` - Duplicate idempotency key
- `POLICY_NOT_FOUND` - Policy not found
- `POLICY_SERVICE_NOT_CONFIGURED` - Policy service unavailable
- `SAGA_START_FAILED` - Saga orchestration failed
- `INTERNAL_ERROR` - Creation failed

---

### POST /claims/:claimId/assess
**Purpose**: Assess claim  
**Permission**: `claims:assess`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "assessedAmount": 123.45
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - assessedAmount required
- `NOT_FOUND` - Claim not found
- `INVALID_STATE` - Wrong claim state
- `INTERNAL_ERROR` - Assessment failed

---

### POST /claims/:claimId/approve
**Purpose**: Approve claim (triggers payment)  
**Permission**: `claims:approve`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "approvedAmount": 123.45,
  "currency": "IRR"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - approvedAmount required
- `NOT_FOUND` - Claim not found
- `INVALID_STATE` - Wrong claim state
- `AMOUNT_LIMIT_EXCEEDED` - Amount exceeds limit
- `AMOUNT_MISMATCH` - Amount mismatch
- `CURRENCY_MISMATCH` - Currency mismatch
- `POLICY_NOT_VALIDATED` - Policy not validated
- `PAYMENT_REFERENCE_DUPLICATE` - Duplicate payment reference
- `INTERNAL_ERROR` - Approval failed

---

### POST /claims/:claimId/reject
**Purpose**: Reject claim  
**Permission**: `claims:reject`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "reason": "string (required)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - reason required
- `NOT_FOUND` - Claim not found
- `INVALID_STATE` - Wrong claim state
- `INTERNAL_ERROR` - Rejection failed

---

### POST /claims/:claimId/pay
**Purpose**: Pay claim  
**Permission**: `claims:pay`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "paidAmount": 123.45,
  "paymentReference": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - paidAmount required
- `NOT_FOUND` - Claim not found
- `INVALID_STATE` - Wrong claim state
- `INTERNAL_ERROR` - Payment failed

---

### POST /claims/:claimId/close
**Purpose**: Close claim  
**Permission**: `claims:close`

**Path Params**: `claimId`

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Claim not found
- `INVALID_STATE` - Wrong claim state
- `INTERNAL_ERROR` - Close failed

---

### POST /claims/:claimId/refer-to-adjuster
**Purpose**: Refer claim to adjuster  
**Permission**: `claims:refer_adjuster`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "adjusterId": "UUID (required)",
  "reason": "string (required)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "UUID",
    "status": "string",
    "adjusterId": "UUID"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - adjusterId and reason required
- `NOT_FOUND` - Claim not found
- `INVALID_STATE` - Wrong claim state
- `INTERNAL_ERROR` - Referral failed

---

### GET /claims/:claimId
**Purpose**: Get claim by ID  
**Permission**: `claims:view`

**Path Params**: `claimId`

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "UUID",
    "claimNumber": "string",
    "policyId": "UUID",
    "status": "string",
    ...
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Claim not found

---

### PATCH /claims/:claimId
**Purpose**: Update claim  
**Permission**: `claims:edit`

**Path Params**: `claimId`

**Request Body**: Partial update (any claim fields)

**Response**: Claim object

**Errors**:
- `NOT_FOUND` - Claim not found
- `INVALID_STATE` - Wrong claim state
- `INTERNAL_ERROR` - Update failed

---

### GET /claims
**Purpose**: List claims  
**Permission**: `claims:list`

**Query Params**:
- `policyId` (optional, UUID)
- `status` (optional, string)
- `limit` (default: 20, max: 200)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 0,
    "limit": 20,
    "offset": 0
  },
  "correlationId": "string"
}
```

**Scoping**: Organization and role-based filtering applied.

---

### POST /claims/:claimId/calculate-deductible
**Purpose**: Calculate deductible  
**Permission**: `claims:assess`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "grossClaimAmount": 123.45,
  "deductibleAmount": 123.45,
  "deductiblePercentage": 0.1,
  "franchiseAmount": 123.45,
  "franchisePercentage": 0.1
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "grossClaimAmount": 123.45,
    "deductibleAmount": 123.45,
    "netClaimAmount": 123.45
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - grossClaimAmount required
- `INTERNAL_ERROR` - Calculation failed

---

### GET /claims/fnol/form-defaults
**Purpose**: Get FNOL form defaults  
**Permission**: `claims:register`

**Query Params**:
- `policyId` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "policy": {},
    "coverages": [],
    "lossTypes": []
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - policyId required
- `POLICY_NOT_FOUND` - Policy not found
- `POLICY_SERVICE_NOT_CONFIGURED` - Policy service unavailable
- `INTERNAL_ERROR` - Failed to get defaults

---

### POST /claims/fnol
**Purpose**: Create FNOL claim (First Notice of Loss)  
**Permission**: `claims:register`

**Request Body**:
```json
{
  "policyId": "UUID",
  "claimantPartyId": "UUID",
  "lossDate": "ISO8601",
  "lossType": "string",
  "description": "string",
  "notificationChannel": "string",
  "notificationSource": "string",
  "contactPhone": "string",
  "contactEmail": "string",
  "locationAddress": "string",
  "locationCity": "string",
  "locationProvince": "string",
  "witnesses": [],
  "attachedDocuments": []
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "UUID",
    "claimNumber": "string",
    "status": "string",
    "autoTriageCategory": "string",
    "autoTriageScore": 0,
    "requiresHumanTriage": true,
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required fields
- `INTERNAL_ERROR` - Creation failed

---

### POST /claims/:claimId/validate-policy
**Purpose**: Validate policy for claim  
**Permission**: `claims:assess`

**Path Params**: `claimId`

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "policy": {},
    "coverageValidations": []
  },
  "correlationId": "string"
}
```

**Errors**:
- `POLICY_NOT_FOUND` - Policy not found
- `POLICY_SERVICE_NOT_CONFIGURED` - Policy service unavailable
- `INTERNAL_ERROR` - Validation failed

---

### POST /claims/:claimId/acknowledge
**Purpose**: Acknowledge claim  
**Permission**: `claims:view`

**Path Params**: `claimId`

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Claim not found
- `INTERNAL_ERROR` - Acknowledgment failed

---

### POST /claims/:claimId/submit-to-carrier
**Purpose**: Submit claim to carrier  
**Permission**: `claims:register`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "externalClaimId": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "UUID",
    "status": "string",
    "externalClaimId": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Claim not found
- `INTERNAL_ERROR` - Submission failed

---

### POST /claims/:claimId/appeal
**Purpose**: Appeal rejected claim  
**Permission**: `claims:reject`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "reason": "string (required)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - reason required
- `NOT_FOUND` - Claim not found
- `INVALID_STATE` - Wrong claim state
- `INTERNAL_ERROR` - Appeal failed

---

### GET /claims/:claimId/history
**Purpose**: Get claim history  
**Permission**: `claims:view`

**Path Params**: `claimId`

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "UUID",
    "history": [
      {
        "timestamp": "ISO8601",
        "event": "string",
        "actor": "string",
        "details": {}
      }
    ]
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Claim not found
- `INTERNAL_ERROR` - Failed to get history

---

## 2. advocacy/advocacy.controller.ts

**Base Path**: `/`  
**Auth**: JWT + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### POST /claims/:claimId/advocacy-cases
**Purpose**: Open advocacy case  
**Permission**: `claims:advocacy:manage`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "brokerOrganizationId": "UUID",
  "customerPartyId": "UUID",
  "carrierOrganizationId": "UUID",
  "priority": "low|medium|high"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "caseId": "UUID",
    "status": "string",
    "openedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - tenantId and organizationId required
- `NOT_FOUND` - Claim not found
- `CROSS_TENANT_ACCESS_DENIED` - Cross-tenant access denied
- `INTERNAL_ERROR` - Failed to open case

---

### GET /advocacy-cases
**Purpose**: List advocacy cases  
**Permission**: `claims:advocacy:view`

**Query Params**:
- `scope` (optional, "mine" for user's org)
- `customerPartyId` (optional, UUID)
- `status` (optional, string)
- `limit` (default: 20, max: 100)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": {
    "rows": [...],
    "total": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to list cases

---

### GET /advocacy-cases/:caseId
**Purpose**: Get advocacy case by ID  
**Permission**: `claims:advocacy:view`

**Path Params**: `caseId`

**Response**: Advocacy case object

**Errors**:
- `NOT_FOUND` - Case not found
- `INTERNAL_ERROR` - Failed to get case

---

### POST /advocacy-cases/:caseId/tasks
**Purpose**: Create advocacy task  
**Permission**: `claims:advocacy:manage`

**Path Params**: `caseId`

**Request Body**:
```json
{
  "taskType": "string (required)",
  "assignedToPartyId": "UUID (required)",
  "dueDate": "ISO8601 (required)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "taskId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required fields
- `NOT_FOUND` - Case not found
- `INTERNAL_ERROR` - Failed to create task

---

### PATCH /advocacy-cases/:caseId/tasks/:taskId
**Purpose**: Update advocacy task  
**Permission**: `claims:advocacy:manage`

**Path Params**: `caseId`, `taskId`

**Request Body**:
```json
{
  "status": "string",
  "outcome": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "taskId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Task not found
- `INTERNAL_ERROR` - Failed to update task

---

### POST /advocacy-cases/:caseId/communications
**Purpose**: Add communication to case  
**Permission**: `claims:advocacy:manage`

**Path Params**: `caseId`

**Request Body**:
```json
{
  "channel": "string (required)",
  "direction": "inbound|outbound (required)",
  "contentRef": "string (required)",
  "partyId": "UUID",
  "subject": "string",
  "summary": "string",
  "isPii": true,
  "timestamp": "ISO8601"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "communicationId": "UUID"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required fields
- `INTERNAL_ERROR` - Failed to add communication

---

### POST /advocacy-cases/:caseId/escalate
**Purpose**: Escalate advocacy case  
**Permission**: `claims:advocacy:manage`

**Path Params**: `caseId`

**Request Body**:
```json
{
  "reason": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "caseId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Case not found
- `INTERNAL_ERROR` - Failed to escalate

---

### POST /advocacy-cases/:caseId/close
**Purpose**: Close advocacy case  
**Permission**: `claims:advocacy:manage`

**Path Params**: `caseId`

**Response**:
```json
{
  "success": true,
  "data": {
    "caseId": "UUID",
    "status": "string",
    "closedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Case not found
- `INTERNAL_ERROR` - Failed to close case

---

### POST /claims/:claimId/adjuster-referrals
**Purpose**: Create adjuster referral  
**Permission**: `claims:adjuster:refer`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "caseId": "UUID (required)",
  "adjusterOrganizationId": "UUID (required)",
  "adjusterPartyId": "UUID (required)",
  "estimatedFeeAmount": 123.45,
  "estimatedFeeCurrency": "IRR"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "referralId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required fields
- `INTERNAL_ERROR` - Failed to create referral

---

### GET /claims/:claimId/adjuster-referrals
**Purpose**: List adjuster referrals for claim  
**Permission**: `claims:adjuster:refer`

**Path Params**: `claimId`

**Query Params**:
- `limit` (default: 20, max: 100)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": {
    "rows": [...],
    "total": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to list referrals

---

### POST /adjuster-referrals/:referralId/accept
**Purpose**: Accept adjuster referral  
**Permission**: `claims:adjuster:respond`

**Path Params**: `referralId`

**Response**:
```json
{
  "success": true,
  "data": {
    "referralId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Referral not found
- `INTERNAL_ERROR` - Failed to accept

---

### POST /adjuster-referrals/:referralId/reject
**Purpose**: Reject adjuster referral  
**Permission**: `claims:adjuster:respond`

**Path Params**: `referralId`

**Request Body**:
```json
{
  "reason": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "referralId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Referral not found
- `INTERNAL_ERROR` - Failed to reject

---

### POST /adjuster-referrals/:referralId/submit-report
**Purpose**: Submit adjuster report  
**Permission**: `claims:adjuster:submit_report`

**Path Params**: `referralId`

**Request Body**:
```json
{
  "reportRef": "string (required)",
  "reportChecksum": "string (required)",
  "reportMetadata": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "referralId": "UUID",
    "status": "string",
    "reportReceivedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - reportRef and reportChecksum required
- `NOT_FOUND` - Referral not found
- `INTERNAL_ERROR` - Failed to submit report

---

### GET /claims/:claimId/projections
**Purpose**: List claim projections  
**Permission**: `claims:projection:view`

**Path Params**: `claimId`

**Query Params**:
- `limit` (default: 20, max: 100)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": {
    "rows": [...],
    "total": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to list projections

---

### POST /claims/:claimId/projections
**Purpose**: Add claim projection  
**Permission**: `claims:projection:write`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "brokerOrganizationId": "UUID (required)",
  "carrierOrganizationId": "UUID (required)",
  "externalClaimId": "string (required)",
  "sourceSystemId": "string (required)",
  "sourceVersion": 1,
  "payload": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "projectionId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required fields
- `INTERNAL_ERROR` - Failed to add projection

---

### POST /claims/:claimId/recovery
**Purpose**: Create recovery case  
**Permission**: `claims:recovery:manage`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "responsiblePartyId": "UUID",
  "expectedRecoveryAmount": 123.45,
  "expectedRecoveryCurrency": "IRR"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "recoveryId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - expectedRecoveryAmount required
- `INTERNAL_ERROR` - Failed to create recovery case

---

### POST /claims/:claimId/documents
**Purpose**: Attach document to claim  
**Permission**: `claims:document:attach`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "caseId": "UUID",
  "documentId": "UUID (required)",
  "documentType": "string",
  "uploadedByPartyId": "UUID (required)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "documentId": "UUID",
    "documentType": "string",
    "virusScanStatus": "string",
    "piiScanStatus": "string",
    "classification": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - documentId and uploadedByPartyId required
- `INTERNAL_ERROR` - Failed to attach document

---

### GET /claims/:claimId/documents
**Purpose**: List claim documents  
**Permission**: `claims:document:view`

**Path Params**: `claimId`

**Response**:
```json
{
  "success": true,
  "data": [...],
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to list documents

---

### GET /claims/:claimId/documents/:documentId/download
**Purpose**: Get document download URL  
**Permission**: `claims:document:download`

**Path Params**: `claimId`, `documentId`

**Response**:
```json
{
  "success": true,
  "data": {
    "downloadUrl": "string",
    "expiresAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Download URL not available
- `INTERNAL_ERROR` - Failed to get download URL

---

## 3. health.controller.ts

### GET /health
**Purpose**: Health check for claims-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "claims-service",
  "timestamp": "ISO8601",
  "uptime": 123.45,
  "components": {
    "db": "ok|error",
    "schema": "claims"
  },
  "error": "string (only if degraded)"
}
```

---

## Summary

**Total Endpoints**: 35

**By Controller**:
- claims.controller.ts: 17
- advocacy/advocacy.controller.ts: 17
- health.controller.ts: 1

**Claims Lifecycle**:
1. **Register** → `/claims` or `/claims/fnol`
2. **Validate Policy** → `/claims/:claimId/validate-policy`
3. **Assess** → `/claims/:claimId/assess`
4. **Calculate Deductible** → `/claims/:claimId/calculate-deductible`
5. **Approve** → `/claims/:claimId/approve`
6. **Reject** → `/claims/:claimId/reject`
7. **Appeal** → `/claims/:claimId/appeal`
8. **Pay** → `/claims/:claimId/pay`
9. **Close** → `/claims/:claimId/close`
10. **Refer to Adjuster** → `/claims/:claimId/refer-to-adjuster`

**Advocacy Workflow**:
- Open Case → `/claims/:claimId/advocacy-cases`
- Create Task → `/advocacy-cases/:caseId/tasks`
- Add Communication → `/advocacy-cases/:caseId/communications`
- Escalate → `/advocacy-cases/:caseId/escalate`
- Close → `/advocacy-cases/:caseId/close`

**Adjuster Referral Workflow**:
- Create Referral → `/claims/:claimId/adjuster-referrals`
- Accept → `/adjuster-referrals/:referralId/accept`
- Reject → `/adjuster-referrals/:referralId/reject`
- Submit Report → `/adjuster-referrals/:referralId/submit-report`

**Permissions**:
- `claims:register` - Register claims, FNOL, submit to carrier
- `claims:assess` - Assess, calculate deductible, validate policy
- `claims:approve` - Approve claims
- `claims:reject` - Reject, appeal claims
- `claims:pay` - Pay claims
- `claims:close` - Close claims
- `claims:refer_adjuster` - Refer to adjuster
- `claims:view` - View claims, acknowledge, history
- `claims:edit` - Edit claims
- `claims:list` - List claims
- `claims:advocacy:manage` - Manage advocacy cases
- `claims:advocacy:view` - View advocacy cases
- `claims:adjuster:refer` - Create adjuster referrals
- `claims:adjuster:respond` - Accept/reject referrals
- `claims:adjuster:submit_report` - Submit adjuster reports
- `claims:projection:view` - View projections
- `claims:projection:write` - Add projections
- `claims:recovery:manage` - Manage recovery cases
- `claims:document:attach` - Attach documents
- `claims:document:view` - View documents
- `claims:document:download` - Download documents

**Idempotency**:
- `/claims` supports idempotency via `X-Idempotency-Key` header or `idempotencyKey` body field

**Error Codes**:
- `VALIDATION_ERROR` - Invalid input
- `NOT_FOUND` - Resource not found
- `INVALID_STATE` - Wrong state transition
- `CROSS_TENANT_ACCESS_DENIED` - Cross-tenant access denied
- `CONFLICT_OF_INTEREST` - Conflict of interest
- `AMOUNT_LIMIT_EXCEEDED` - Amount exceeds limit
- `AMOUNT_MISMATCH` - Amount mismatch
- `CURRENCY_MISMATCH` - Currency mismatch
- `POLICY_NOT_VALIDATED` - Policy not validated
- `PAYMENT_REFERENCE_DUPLICATE` - Duplicate payment reference
- `IDEMPOTENCY_CONFLICT` - Duplicate idempotency key
- `POLICY_NOT_FOUND` - Policy not found
- `POLICY_SERVICE_NOT_CONFIGURED` - Policy service unavailable
- `SAGA_START_FAILED` - Saga orchestration failed
- `INTERNAL_ERROR` - Internal error
