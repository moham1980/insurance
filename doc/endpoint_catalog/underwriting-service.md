# Underwriting Service - Endpoint Catalog

**Service**: underwriting-service  
**Purpose**: Underwriting request management, decision workflow, escalation, SLA tracking, risk assessment, appetite matrix  
**Base Path**: `/`

---

## Controllers Overview

1. **underwriting.controller.ts** - Underwriting operations (requests, decisions, escalation, SLA, risk, appetite rules)
2. **health.controller.ts** - Health check

---

## 1. underwriting.controller.ts

**Base Path**: `/`  
**Auth**: EcosystemJwtGuard + PermissionsGuard + TenantGuard (all endpoints except /health)

### POST /underwriting/requests
**Purpose**: Create underwriting request  
**Permission**: `underwriting:create`

**Headers**:
- `X-Correlation-Id` (optional)
- `Authorization` (required)

**Request Body**:
```json
{
  "policyId": "UUID (required)",
  "reasonCode": "string (required)",
  "input": {},
  "dueDate": "ISO8601"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "underwritingRequestId": "UUID",
    "policyId": "UUID",
    "status": "string",
    ...
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - policyId and reasonCode required, policyId must be UUID

---

### GET /underwriting/requests/:underwritingRequestId
**Purpose**: Get underwriting request by ID  
**Permission**: `underwriting:view`

**Path Params**: `underwritingRequestId` (must be UUID)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - underwritingRequestId must be UUID
- `NOT_FOUND` - Underwriting request not found

---

### GET /underwriting/requests
**Purpose**: List underwriting requests  
**Permission**: `underwriting:list`

**Query Params**:
- `status` (optional, string)
- `policyId` (optional, string)
- `limit` (default: 50, max: 200)
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

### POST /underwriting/requests/:underwritingRequestId/decide
**Purpose**: Decide on underwriting request  
**Permission**: `underwriting:decide`

**Path Params**: `underwritingRequestId`

**Request Body**:
```json
{
  "decision": "approved|rejected|referred (required)",
  "notes": "string",
  "conditions": []
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

### POST /underwriting/requests/:underwritingRequestId/escalate
**Purpose**: Escalate underwriting request  
**Permission**: `underwriting:escalate`

**Path Params**: `underwritingRequestId`

**Request Body**:
```json
{
  "toRole": "string (required)",
  "reason": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

### PATCH /underwriting/requests/:underwritingRequestId
**Purpose**: Update underwriting request  
**Permission**: `underwriting:update`

**Path Params**: `underwritingRequestId`

**Request Body**:
```json
{
  "notes": "string",
  "input": {},
  "dueDate": "ISO8601"
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

## SLA Endpoints

### GET /underwriting/sla/breaches
**Purpose**: Get SLA breaches  
**Permission**: `underwriting:list`

**Query Params**:
- `from` (optional, ISO8601)
- `to` (optional, ISO8601)
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

### GET /underwriting/sla/metrics
**Purpose**: Get SLA metrics  
**Permission**: `underwriting:list`

**Query Params**:
- `from` (optional, ISO8601)
- `to` (optional, ISO8601)

**Response**:
```json
{
  "success": true,
  "data": {
    "averageTurnaroundTime": 0,
    "breachRate": 0,
    ...
  },
  "correlationId": "string"
}
```

---

## Risk Assessment Endpoints

### POST /underwriting/requests/:id/assess-risk
**Purpose**: Assess risk for underwriting request  
**Permission**: `underwriting:create`

**Path Params**: `id`

**Request Body**:
```json
{
  "factors": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "riskScore": 0,
    "riskLevel": "string",
    ...
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to assess risk

---

### GET /underwriting/risk-matrix
**Purpose**: Get risk matrix  
**Permission**: `underwriting:view`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

## Appetite Matrix Endpoints

### POST /underwriting/appetite-rules
**Purpose**: Create appetite rule  
**Permission**: `underwriting:create`

**Request Body**:
```json
{
  "lineOfBusiness": "string",
  "productId": "string",
  "riskLevel": "string",
  "decision": "string",
  "minSumInsured": 0,
  "maxSumInsured": 0,
  "minPremium": 0,
  "maxPremium": 0,
  "authorityLevel": "string",
  "approverRole": "string",
  "priority": 0,
  "slaHours": 0
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

### POST /underwriting/appetite-rules/evaluate
**Purpose**: Evaluate appetite  
**Permission**: `underwriting:view`

**Request Body**:
```json
{
  "lineOfBusiness": "string",
  "productId": "string",
  "riskLevel": "string",
  "sumInsured": 0,
  "premium": 0
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "decision": "string",
    "authorityLevel": "string",
    ...
  },
  "correlationId": "string"
}
```

---

### GET /underwriting/appetite-rules
**Purpose**: List appetite rules  
**Permission**: `underwriting:view`

**Query Params**:
- `lineOfBusiness` (optional, string)
- `productId` (optional, string)
- `active` (optional, boolean)
- `limit` (default: 50, max: 200)
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

### PATCH /underwriting/appetite-rules/:id
**Purpose**: Update appetite rule  
**Permission**: `underwriting:create`

**Path Params**: `id`

**Request Body**:
```json
{
  "lineOfBusiness": "string",
  "productId": "string",
  "riskLevel": "string",
  "decision": "string",
  ...
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Appetite rule not found

---

### POST /underwriting/appetite-rules/:id/delete
**Purpose**: Delete appetite rule  
**Permission**: `underwriting:create`

**Path Params**: `id`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "deleted": true
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Appetite rule not found

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for underwriting-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|error",
  "service": "underwriting-service",
  "timestamp": "ISO8601",
  "message": "string (only if error)"
}
```

---

## Summary

**Total Endpoints**: 15

**By Controller**:
- underwriting.controller.ts: 14
- health.controller.ts: 1

**Underwriting Request Lifecycle**:
1. Create → `/underwriting/requests`
2. Get → `/underwriting/requests/:underwritingRequestId`
3. List → `/underwriting/requests`
4. Decide → `/underwriting/requests/:underwritingRequestId/decide`
5. Escalate → `/underwriting/requests/:underwritingRequestId/escalate`
6. Update → `/underwriting/requests/:underwritingRequestId`

**SLA Monitoring**:
1. Breaches → `/underwriting/sla/breaches`
2. Metrics → `/underwriting/sla/metrics`

**Risk Assessment**:
1. Assess Risk → `/underwriting/requests/:id/assess-risk`
2. Risk Matrix → `/underwriting/risk-matrix`

**Appetite Matrix**:
1. Create Rule → `/underwriting/appetite-rules`
2. Evaluate → `/underwriting/appetite-rules/evaluate`
3. List → `/underwriting/appetite-rules`
4. Update → `/underwriting/appetite-rules/:id`
5. Delete → `/underwriting/appetite-rules/:id/delete`

**Permissions**:
- `underwriting:create` - Create requests, appetite rules, assess risk
- `underwriting:view` - View requests, SLA, risk matrix, appetite rules
- `underwriting:list` - List requests, SLA breaches/metrics
- `underwriting:decide` - Decide on requests
- `underwriting:escalate` - Escalate requests
- `underwriting:update` - Update requests

**Authentication**:
- All endpoints except `/health` use EcosystemJwtGuard + PermissionsGuard + TenantGuard
