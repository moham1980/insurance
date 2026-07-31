# Policy Service - Endpoint Catalog

**Service**: policy-service  
**Purpose**: Policy lifecycle management, underwriting, Sanhab integration, endorsements, renewals  
**Base Path**: `/` (varies by controller)

---

## Controllers Overview

1. **policy.controller.ts** - Core policy lifecycle (quote → issue → unique code → endorse → renew)
2. **p3-policy.controller.ts** - P3 lifecycle (details, patch, coverages, endorsements)
3. **policy-projection.controller.ts** - Policy projections from external systems
4. **unique-code-report.controller.ts** - Unique code reports
5. **health.controller.ts** - Health check

---

## 1. policy.controller.ts

**Base Path**: `/`  
**Auth**: JWT + PermissionsGuard + AbacGuard + TenantGuard (all endpoints unless noted)

### POST /policies/quote
**Purpose**: Create quote (مرحله 1: استعلام و مشاوره)  
**Permission**: `policy:quote`

**Request Body**:
```json
{
  "partyId": "UUID",
  "lineOfBusiness": "string",
  "startDate": "ISO8601",
  "endDate": "ISO8601",
  "coverages": {},
  "deductibles": {},
  "installments": {},
  "premiumAmount": 123.45,
  "producerOrgUnitId": "UUID | null"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "policyId": "UUID",
    "productId": "UUID",
    "partyId": "UUID",
    "lineOfBusiness": "string",
    "startDate": "ISO8601",
    "endDate": "ISO8601",
    "premiumAmount": 123.45,
    "status": "quoted",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Invalid input (partyId UUID, lineOfBusiness, dates, premiumAmount)
- `INTERNAL_ERROR` - Quote creation failed

---

### POST /policies/convert-quote
**Purpose**: Convert quote to policy  
**Permission**: `policy:quote`

**Request Body**:
```json
{
  "quote": {
    "productId": "UUID",
    "partyId": "UUID",
    "lineOfBusiness": "string",
    "startDate": "ISO8601",
    "endDate": "ISO8601",
    "premiumAmount": 123.45
  },
  "producerOrgUnitId": "UUID | null"
}
```

**Response**: Same as quote

**Errors**:
- `VALIDATION_ERROR` - Invalid quote data
- `INTERNAL_ERROR` - Conversion failed

---

### POST /policies/:policyId/sanhab/inquiry
**Purpose**: Sanhab multi-channel inquiry (سنهاب: استعلام چندکاناله)  
**Permission**: `policy:sanhab_inquiry`

**Path Params**: `policyId` (UUID)

**Request Body**:
```json
{
  "nationalId": "string",
  "uniqueCode": "string",
  "policyNumber": "string",
  "vin": "string"
}
```

**Validation**: Either (nationalId + uniqueCode) OR policyNumber OR vin

**Response**:
```json
{
  "success": true,
  "data": {
    "response": {},
    "inquiryId": "UUID",
    "resultCode": "string",
    "workItemId": "UUID",
    "workItemSagaId": "UUID"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Invalid inquiry params
- `NOT_FOUND` - Policy not found
- `INTERNAL_ERROR` - Sanhab inquiry failed

---

### GET /policies/:policyId/sanhab/inquiries
**Purpose**: List Sanhab inquiries for policy  
**Permission**: `policy:sanhab_inquiries_view`

**Path Params**: `policyId` (UUID)

**Query Params**:
- `limit` (default: 50)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 0,
    "limit": 50,
    "offset": 0
  },
  "correlationId": "string"
}
```

---

### POST /policies/sanhab/sms-inquiry
**Purpose**: Sanhab SMS inquiry  
**Permission**: `policy:sanhab_inquiry`

**Request Body**: Same as `/policies/:policyId/sanhab/inquiry` plus:
```json
{
  "phoneNumber": "string"
}
```

**Response**: Same as Sanhab inquiry

---

### GET /policies/:policyId/changes
**Purpose**: List policy changes  
**Permission**: `policy:changes_view`

**Path Params**: `policyId` (UUID)

**Query Params**:
- `limit` (default: 50)
- `offset` (default: 0)

**Response**: Same pagination format

---

### GET /policies/:policyId/timeline
**Purpose**: Get policy timeline (changes + inquiries)  
**Auth**: JWT only (no specific permission, but requires `policy:view` or `policy:changes_view` or `policy:sanhab_inquiries_view`)

**Path Params**: `policyId` (UUID)

**Query Params**:
- `limit` (default: 50)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "eventType": "change|inquiry",
      "timestamp": "ISO8601",
      "details": {}
    }
  ],
  "pagination": {...},
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Invalid policyId
- `FORBIDDEN` - Insufficient permissions

---

### POST /policies/:policyId/submit-docs
**Purpose**: Submit application documents (مرحله 2: جمع‌آوری اطلاعات و مدارک)  
**Permission**: `policy:submit_docs`

**Path Params**: `policyId` (UUID)

**Request Body**:
```json
{
  "applicationData": {}
}
```

**Response**: Policy object

**Errors**:
- `VALIDATION_ERROR` - applicationData required
- `NOT_FOUND` - Policy not found
- `INVALID_STATE` - Wrong policy state
- `INTERNAL_ERROR` - Submission failed

---

### POST /policies/:policyId/risk-assess
**Purpose**: Risk assessment (مرحله 3: ارزیابی ریسک)  
**Permission**: `policy:risk_assess`

**Path Params**: `policyId` (UUID)

**Request Body**:
```json
{
  "riskAssessment": {}
}
```

**Response**: Policy object

**Errors**:
- `VALIDATION_ERROR` - riskAssessment required
- `NOT_FOUND` - Policy not found
- `INVALID_STATE` - Wrong policy state
- `INTERNAL_ERROR` - Assessment failed

---

### POST /policies/:policyId/issue
**Purpose**: Issue policy (مرحله 4: صدور بیمه‌نامه - نیازمند پرداخت)  
**Permission**: `policy:issue`

**Path Params**: `policyId` (UUID)

**Request Body**:
```json
{
  "paymentId": "string",
  "brokerLicenseId": "string"
}
```

**Response**: Policy object

**Errors**:
- `VALIDATION_ERROR` - paymentId required
- `NOT_FOUND` - Policy not found
- `PAYMENT_REQUIRED` - Payment verification failed
- `PAYMENT_MISMATCH` - Payment amount mismatch
- `PAYMENT_SERVICE_UNAVAILABLE` - Payment service down
- `PAYMENT_SERVICE_ERROR` - Payment service error
- `QUALITY_GATE_FAILED` - Quality gate check failed
- `INVALID_STATE` - Wrong policy state
- `BROKER_LICENSE_INVALID` - Broker license invalid
- `INTERNAL_ERROR` - Issue failed

---

### POST /policies/:policyId/unique-code
**Purpose**: Set unique code (مرحله 5: پس از صدور - ثبت کد یکتا/سنهاب)  
**Permission**: `policy:set_unique_code`

**Path Params**: `policyId` (UUID)

**Request Body**:
```json
{
  "uniqueCode": "string"
}
```

**Response**: Policy object

**Errors**:
- `VALIDATION_ERROR` - uniqueCode required
- `NOT_FOUND` - Policy not found
- `INVALID_STATE` - Wrong policy state
- `QUALITY_GATE_FAILED` - Quality gate check failed
- `INTERNAL_ERROR` - Set unique code failed

---

### POST /policies/:policyId/quality-gate/override
**Purpose**: Override quality gate (for issue or set_unique_code)  
**Permission**: `policy:quality_gate_override`

**Path Params**: `policyId` (UUID)

**Request Body**:
```json
{
  "action": "issue|set_unique_code",
  "reason": "string (min 3 chars)"
}
```

**Response**: Policy object

**Errors**:
- `VALIDATION_ERROR` - Invalid action or reason
- `NOT_FOUND` - Policy not found

---

### POST /policies/:policyId/underwriting/decision
**Purpose**: Apply underwriting decision  
**Permission**: `policy:underwriting_decide`

**Path Params**: `policyId` (UUID)

**Request Body**:
```json
{
  "decision": "approved|rejected|escalated",
  "notes": "string",
  "decidedBy": "UUID"
}
```

**Response**: Policy object

**Errors**:
- `VALIDATION_ERROR` - Invalid decision
- `NOT_FOUND` - Policy not found
- `INVALID_STATE` - Wrong policy state
- `INTERNAL_ERROR` - Decision failed

---

### POST /policies/:policyId/endorse
**Purpose**: Endorse policy (تغییرات بیمه‌نامه)  
**Permission**: `policy:endorse`

**Path Params**: `policyId` (UUID)

**Request Body**:
```json
{
  "endorsementType": "coverage_change|premium_change|beneficiary_change|address_change|vehicle_change|other",
  "payload": {},
  "effectiveDate": "ISO8601",
  "reason": "string"
}
```

**Response**: Policy object

**Errors**:
- `VALIDATION_ERROR` - Invalid endorsementType or payload
- `NOT_FOUND` - Policy not found
- `INVALID_STATE` - Wrong policy state
- `INTERNAL_ERROR` - Endorsement failed

---

### GET /policies/:policyId/endorsements
**Purpose**: List endorsements for policy  
**Permission**: `policy:changes_view`

**Path Params**: `policyId` (UUID)

**Query Params**:
- `limit` (default: 50)
- `offset` (default: 0)

**Response**: Pagination format

---

### POST /policies/:policyId/cancel
**Purpose**: Cancel policy  
**Permission**: `policy:cancel`

**Path Params**: `policyId` (UUID)

**Request Body**:
```json
{
  "reason": "string"
}
```

**Response**: Policy object

**Errors**:
- `VALIDATION_ERROR` - Invalid policyId
- `NOT_FOUND` - Policy not found

---

### POST /policies/:policyId/lapse
**Purpose**: Lapse policy (انقضای غیرفعال)  
**Permission**: `policy:cancel`

**Path Params**: `policyId` (UUID)

**Request Body**:
```json
{
  "reason": "string"
}
```

**Response**: Policy object

**Errors**: Same as cancel

---

### POST /policies/:policyId/renew
**Purpose**: Renew policy (تمدید بیمه‌نامه)  
**Permission**: `policy:renew`

**Path Params**: `policyId` (UUID)

**Request Body**:
```json
{
  "newEndDate": "ISO8601",
  "newPremium": 123.45
}
```

**Response**: Policy object

**Errors**:
- `VALIDATION_ERROR` - Invalid policyId
- `NOT_FOUND` - Policy not found

---

### GET /policies/:policyId
**Purpose**: Get policy by ID  
**Permission**: `policy:view`

**Path Params**: `policyId` (UUID)

**Response**: Policy object

**Errors**:
- `VALIDATION_ERROR` - Invalid policyId
- `NOT_FOUND` - Policy not found

---

### GET /policies
**Purpose**: List policies  
**Permission**: `policy:list`

**Query Params**:
- `partyId` (optional, UUID)
- `uniqueCode` (optional, string)
- `limit` (default: 50)
- `offset` (default: 0)

**Response**: Pagination format

---

### POST /policies/:policyId/auto-renew
**Purpose**: Set auto-renew configuration  
**Permission**: `policy:renew`

**Path Params**: `policyId` (UUID)

**Request Body**:
```json
{
  "autoRenew": true,
  "maxRenewals": 5
}
```

**Response**: Policy object

**Errors**:
- `VALIDATION_ERROR` - Invalid policyId or autoRenew
- `NOT_FOUND` - Policy not found
- `INTERNAL_ERROR` - Failed to set auto-renew

---

### POST /policies/:policyId/renewal/schedule
**Purpose**: Schedule renewal  
**Permission**: `policy:renew`

**Path Params**: `policyId` (UUID)

**Request Body**:
```json
{
  "newStartDate": "ISO8601",
  "newEndDate": "ISO8601",
  "newPremium": 123.45,
  "type": "manual|auto",
  "notes": "string"
}
```

**Response**: Renewal object

**Errors**:
- `VALIDATION_ERROR` - Invalid dates
- `NOT_FOUND` - Policy not found
- `INVALID_STATE` - Wrong policy state
- `INTERNAL_ERROR` - Failed to schedule

---

### POST /renewals/:renewalId/approve
**Purpose**: Approve renewal  
**Permission**: `policy:renew`

**Path Params**: `renewalId` (UUID)

**Request Body**:
```json
{
  "reason": "string"
}
```

**Response**: Renewal object

**Errors**:
- `NOT_FOUND` - Renewal not found
- `INVALID_STATE` - Wrong renewal state
- `INTERNAL_ERROR` - Failed to approve

---

### POST /renewals/:renewalId/reject
**Purpose**: Reject renewal  
**Permission**: `policy:renew`

**Path Params**: `renewalId` (UUID)

**Request Body**:
```json
{
  "reason": "string (required)"
}
```

**Response**: Renewal object

**Errors**:
- `VALIDATION_ERROR` - reason required
- `NOT_FOUND` - Renewal not found
- `INVALID_STATE` - Wrong renewal state
- `INTERNAL_ERROR` - Failed to reject

---

### GET /policies/:policyId/renewals
**Purpose**: Get renewals for policy  
**Permission**: `policy:view`

**Path Params**: `policyId` (UUID)

**Query Params**:
- `status` (optional, string)
- `limit` (default: 50)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [...],
  "correlationId": "string"
}
```

---

### GET /policies/renewal/due
**Purpose**: Get policies due for renewal  
**Permission**: `policy:list`

**Query Params**:
- `daysBeforeExpiry` (default: 30)
- `limit` (default: 50)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [...],
  "correlationId": "string"
}
```

---

### POST /policies/:policyId/sanhab-result
**Purpose**: Record Sanhab result (callback from Sanhab)  
**Permission**: `policy:set_unique_code`

**Path Params**: `policyId` (UUID)

**Request Body**:
```json
{
  "sanhabStatus": "pending|confirmed|rejected",
  "sanhabSubmissionId": "string",
  "sanhabResponse": {},
  "uniqueCode": "string"
}
```

**Response**: Policy object

**Errors**:
- `VALIDATION_ERROR` - Invalid policyId or sanhabStatus
- `NOT_FOUND` - Policy not found
- `INVALID_STATE` - Wrong policy state
- `QUALITY_GATE_FAILED` - Quality gate check failed
- `INTERNAL_ERROR` - Failed to record result

---

## 2. p3-policy.controller.ts

**Base Path**: `/`  
**Auth**: JWT + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### GET /policies/:policyId/details
**Purpose**: Get policy with full details  
**Permission**: `policy:view`

**Path Params**: `policyId` (UUID)

**Response**:
```json
{
  "success": true,
  "data": {
    "policy": {},
    "coverages": [],
    "parties": [],
    "documents": []
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Policy not found

---

### PATCH /policies/:policyId
**Purpose**: Patch policy (endorsement)  
**Permission**: `policy:endorse`

**Path Params**: `policyId` (UUID)

**Request Body**:
```json
{
  "patch": {}
}
```

**Response**: Policy object

**Errors**:
- `VALIDATION_ERROR` - Invalid policyId
- `NOT_FOUND` - Policy not found
- `PATCH_FAILED` - Patch failed

---

### GET /policies/:policyId/coverages
**Purpose**: Get policy coverages  
**Permission**: `policy:view`

**Path Params**: `policyId` (UUID)

**Response**:
```json
{
  "success": true,
  "data": {
    "rows": [...]
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Invalid policyId

---

### POST /policies/:policyId/coverages
**Purpose**: Add coverage to policy  
**Permission**: `policy:endorse`

**Path Params**: `policyId` (UUID)

**Request Body**:
```json
{
  "coverageCode": "string",
  "limitAmount": 123.45,
  "limitCurrency": "IRR",
  "deductibleAmount": 0,
  "deductibleCurrency": "IRR",
  "premiumAmount": 0,
  "premiumCurrency": "IRR"
}
```

**Response**: Coverage object

**Errors**:
- `COVERAGE_CREATE_FAILED` - Creation failed

---

### GET /policies/:policyId/history
**Purpose**: Get policy history  
**Permission**: `policy:changes_view`

**Path Params**: `policyId` (UUID)

**Query Params**:
- `limit` (default: 50)
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

---

### POST /policies/:policyId/endorsements
**Purpose**: Create endorsement  
**Permission**: `policy:endorse`

**Path Params**: `policyId` (UUID)

**Request Body**:
```json
{
  "endorsementType": "string",
  "effectiveDate": "ISO8601",
  "requestedByPartyId": "UUID",
  "reason": "string",
  "payload": {}
}
```

**Response**: Endorsement object

**Errors**:
- `NOT_FOUND` - Policy not found
- `ENDORSEMENT_FAILED` - Creation failed

---

### POST /endorsements/:endorsementId/apply
**Purpose**: Apply endorsement  
**Permission**: `policy:endorse`

**Path Params**: `endorsementId` (UUID)

**Request Body**:
```json
{
  "approvedByPartyId": "UUID"
}
```

**Response**: Result object

**Errors**:
- `NOT_FOUND` - Endorsement not found
- `APPLY_FAILED` - Apply failed

---

### POST /endorsements/:endorsementId/submit
**Purpose**: Submit endorsement  
**Permission**: `policy:endorse`

**Path Params**: `endorsementId` (UUID)

**Response**: Result object

**Errors**:
- `NOT_FOUND` - Endorsement not found
- `SUBMIT_FAILED` - Submit failed

---

### POST /endorsements/:endorsementId/approve
**Purpose**: Approve endorsement  
**Permission**: `policy:endorse`

**Path Params**: `endorsementId` (UUID)

**Request Body**:
```json
{
  "approvedByPartyId": "UUID (required)"
}
```

**Response**: Result object

**Errors**:
- `VALIDATION_ERROR` - approvedByPartyId required
- `NOT_FOUND` - Endorsement not found
- `APPROVE_FAILED` - Approve failed

---

### POST /endorsements/:endorsementId/reject
**Purpose**: Reject endorsement  
**Permission**: `policy:endorse`

**Path Params**: `endorsementId` (UUID)

**Request Body**:
```json
{
  "rejectionReason": "string (required)"
}
```

**Response**: Result object

**Errors**:
- `VALIDATION_ERROR` - rejectionReason required
- `NOT_FOUND` - Endorsement not found
- `REJECT_FAILED` - Reject failed

---

## 3. policy-projection.controller.ts

**Base Path**: `/api/v1`  
**Auth**: JWT + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### POST /api/v1/policies/projections
**Purpose**: Create policy projection from external system  
**Permission**: `policy:project`

**Request Body**:
```json
{
  "placementId": "string (required)",
  "policyNumber": "string (required)",
  "policyId": "UUID",
  "uniqueCode": "string",
  "brokerOrganizationId": "UUID",
  "issuerOrganizationId": "UUID",
  "sourceSystemId": "string",
  "sourceVersion": "string",
  "receivedAt": "ISO8601",
  "payload": {},
  "status": "active",
  "idempotencyKey": "string"
}
```

**Response**: Projection object

**Errors**:
- `VALIDATION_ERROR` - placementId and policyNumber required

---

### GET /api/v1/policies/projections
**Purpose**: List projections by placement  
**Permission**: `policy:view`

**Query Params**:
- `placementId` (required)

**Response**:
```json
{
  "success": true,
  "data": [...],
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - placementId required

---

### GET /api/v1/policies/projections/:policyId
**Purpose**: Get projection by policy ID  
**Permission**: `policy:view`

**Path Params**: `policyId` (UUID)

**Response**: Projection object

**Errors**:
- `NOT_FOUND` - Projection not found

---

## 4. unique-code-report.controller.ts

**Base Path**: `/`  
**Auth**: JWT + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### GET /api/v1/reports/policies-without-unique-code
**Purpose**: Report policies without unique code  
**Permission**: `policy:view`

**Query Params**:
- `limit` (default: 50)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 0,
    "limit": 50,
    "offset": 0
  },
  "correlationId": "string"
}
```

---

### GET /api/v1/reports/duplicate-unique-codes
**Purpose**: Report duplicate unique codes  
**Permission**: `policy:view`

**Response**:
```json
{
  "success": true,
  "data": [...],
  "count": 0,
  "correlationId": "string"
}
```

---

## 5. health.controller.ts

### GET /health
**Purpose**: Health check for policy-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "policy-service",
  "timestamp": "ISO8601",
  "uptime": 123.45,
  "components": {
    "db": "ok|error",
    "migrations": "ok|pending|error"
  }
}
```

---

## Summary

**Total Endpoints**: 42

**By Controller**:
- policy.controller.ts: 24
- p3-policy.controller.ts: 9
- policy-projection.controller.ts: 3
- unique-code-report.controller.ts: 2
- health.controller.ts: 1

**Policy Lifecycle Stages**:
1. **Quote** → `/policies/quote`
2. **Convert Quote** → `/policies/convert-quote`
3. **Submit Docs** → `/policies/:policyId/submit-docs`
4. **Risk Assess** → `/policies/:policyId/risk-assess`
5. **Underwriting Decision** → `/policies/:policyId/underwriting/decision`
6. **Issue** → `/policies/:policyId/issue` (requires payment)
7. **Set Unique Code** → `/policies/:policyId/unique-code`
8. **Endorse** → `/policies/:policyId/endorse`
9. **Renew** → `/policies/:policyId/renew`
10. **Cancel/Lapse** → `/policies/:policyId/cancel` or `/policies/:policyId/lapse`

**Sanhab Integration**:
- Inquiry: `/policies/:policyId/sanhab/inquiry`
- SMS Inquiry: `/policies/sanhab/sms-inquiry`
- List Inquiries: `/policies/:policyId/sanhab/inquiries`
- Record Result: `/policies/:policyId/sanhab-result`

**Quality Gate**:
- Override: `/policies/:policyId/quality-gate/override`
- Applied to: issue, set_unique_code

**Renewal Workflow**:
- Schedule: `/policies/:policyId/renewal/schedule`
- Approve: `/renewals/:renewalId/approve`
- Reject: `/renewals/:renewalId/reject`
- List: `/policies/:policyId/renewals`
- Due List: `/policies/renewal/due`
- Auto-renew: `/policies/:policyId/auto-renew`

**Permissions**:
- `policy:quote` - Quote and convert
- `policy:submit_docs` - Submit documents
- `policy:risk_assess` - Risk assessment
- `policy:underwriting_decide` - Underwriting decisions
- `policy:issue` - Issue policy
- `policy:set_unique_code` - Set unique code, Sanhab result
- `policy:quality_gate_override` - Override quality gate
- `policy:endorse` - Endorsements
- `policy:cancel` - Cancel/lapse
- `policy:renew` - Renewals
- `policy:view` - View policy
- `policy:list` - List policies
- `policy:changes_view` - View changes/timeline
- `policy:sanhab_inquiry` - Sanhab inquiry
- `policy:sanhab_inquiries_view` - View Sanhab inquiries
- `policy:project` - Create projections
