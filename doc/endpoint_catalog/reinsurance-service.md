# Reinsurance Service - Endpoint Catalog

**Service**: reinsurance-service  
**Purpose**: Reinsurance treaty management, cessions, statements, reconciliations, recoveries, tickets, period close  
**Base Path**: `/re`

---

## Controllers Overview

1. **reinsurance.controller.ts** - Reinsurance operations (treaties, cessions, statements, reconciliations, recoveries, tickets, export, period close)
2. **health.controller.ts** - Health check

---

## 1. reinsurance.controller.ts

**Base Path**: `/re`  
**Auth**: EcosystemJwtGuard + PermissionsGuard + TenantGuard (all endpoints except /health)

## Treaty Endpoints

### POST /re/treaties
**Purpose**: Create reinsurance treaty  
**Permission**: `re:treaties:create`

**Request Body**:
```json
{
  "treatyNumber": "string",
  "reinsurerName": "string",
  "treatyType": "string",
  "effectiveFrom": "ISO8601",
  "effectiveTo": "ISO8601",
  "currency": "string",
  "retentionRate": 0,
  "cessionRate": 0,
  "config": {},
  "terms": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": { "treatyId": "UUID", ... },
  "correlationId": "string"
}
```

---

### GET /re/treaties/:treatyId
**Purpose**: Get treaty by ID  
**Permission**: `re:treaties:view`

**Path Params**: `treatyId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Treaty not found

---

### GET /re/treaties
**Purpose**: List treaties  
**Permission**: `re:treaties:list`

**Query Params**:
- `status` (optional, ReTreatyStatus)
- `reinsurerName` (optional, string)
- `lineOfBusiness` (optional, string)
- `productCode` (optional, string)
- `q` (optional, string - search)
- `limit` (default: 50)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": { "rows": [...], "total": 0 },
  "correlationId": "string"
}
```

---

### PATCH /re/treaties/:treatyId
**Purpose**: Update treaty  
**Permission**: `re:treaties:update`

**Path Params**: `treatyId`

**Request Body**:
```json
{
  "reinsurerName": "string",
  "effectiveFrom": "ISO8601",
  "effectiveTo": "ISO8601",
  "currency": "string",
  "retentionRate": 0,
  "cessionRate": 0,
  "config": {},
  "terms": {},
  "status": "string"
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

### PATCH /re/treaties/:treatyId/close
**Purpose**: Close treaty  
**Permission**: `re:treaties:close`

**Path Params**: `treatyId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

## Cession Endpoints

### POST /re/cessions/calculate-automatic
**Purpose**: Calculate automatic cessions  
**Permission**: `re:cessions:create`

**Request Body**:
```json
{
  "policyId": "string (required)",
  "policyNumber": "string",
  "sumInsured": 0 (required),
  "premium": 0 (required),
  "productCode": "string (required)",
  "effectiveDate": "ISO8601 (required)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "cessions": [...],
    "totalCeded": 0,
    "totalRetained": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required fields

---

### POST /re/cessions
**Purpose**: Create cession  
**Permission**: `re:cessions:create`

**Request Body**:
```json
{
  "treatyId": "string",
  "policyId": "string",
  "policyNumber": "string",
  "riskId": "string",
  "sumInsured": 0,
  "premium": 0,
  "cessionPercent": 0,
  "cededAmount": 0,
  "cededPremium": 0,
  "cededSumInsured": 0,
  "cessionType": "string",
  "retentionRate": 0,
  "cessionRate": 0,
  "effectiveFrom": "ISO8601",
  "effectiveTo": "ISO8601",
  "currency": "string",
  "notes": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { "cessionId": "UUID", ... },
  "correlationId": "string"
}
```

---

### GET /re/cessions/:cessionId
**Purpose**: Get cession by ID  
**Permission**: `re:cessions:view`

**Path Params**: `cessionId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Cession not found

---

### GET /re/cessions
**Purpose**: List cessions  
**Permission**: `re:cessions:list`

**Query Params**:
- `treatyId` (optional, string)
- `status` (optional, ReCessionStatus)
- `policyId` (optional, string)
- `limit` (default: 50)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": { "rows": [...], "total": 0 },
  "correlationId": "string"
}
```

---

### PATCH /re/cessions/:cessionId
**Purpose**: Update cession  
**Permission**: `re:cessions:update`

**Path Params**: `cessionId`

**Request Body**:
```json
{
  "notes": "string",
  "sumInsured": 0,
  "premium": 0,
  "cessionPercent": 0,
  "cededAmount": 0,
  "cededPremium": 0,
  "cededSumInsured": 0,
  "status": "string"
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

### PATCH /re/cessions/:cessionId/approve
**Purpose**: Approve cession  
**Permission**: `re:cessions:approve`

**Path Params**: `cessionId`

**Request Body**:
```json
{
  "approved": true,
  "notes": "string"
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

## Statement Endpoints

### POST /re/statements
**Purpose**: Create statement  
**Permission**: `re:statements:create`

**Request Body**:
```json
{
  "treatyId": "string",
  "statementType": "string",
  "periodStart": "ISO8601",
  "periodEnd": "ISO8601",
  "totals": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": { "statementId": "UUID", ... },
  "correlationId": "string"
}
```

---

### GET /re/statements/:statementId
**Purpose**: Get statement by ID  
**Permission**: `re:statements:view`

**Path Params**: `statementId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Statement not found

---

### GET /re/statements
**Purpose**: List statements  
**Permission**: `re:statements:list`

**Query Params**:
- `treatyId` (optional, string)
- `status` (optional, ReStatementStatus)
- `statementType` (optional, string)
- `limit` (default: 50)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": { "rows": [...], "total": 0 },
  "correlationId": "string"
}
```

---

### PATCH /re/statements/:statementId
**Purpose**: Update statement  
**Permission**: `re:statements:update`

**Path Params**: `statementId`

**Request Body**:
```json
{
  "status": "string",
  "totals": {}
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

## Reconciliation Endpoints

### POST /re/reconciliations
**Purpose**: Create reconciliation  
**Permission**: `re:reconciliations:create`

**Request Body**:
```json
{
  "statementId": "string",
  "summary": {},
  "details": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": { "reconciliationId": "UUID", ... },
  "correlationId": "string"
}
```

---

### GET /re/reconciliations/:reconciliationId
**Purpose**: Get reconciliation by ID  
**Permission**: `re:reconciliations:view`

**Path Params**: `reconciliationId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Reconciliation not found

---

### GET /re/reconciliations
**Purpose**: List reconciliations  
**Permission**: `re:reconciliations:list`

**Query Params**:
- `statementId` (optional, string)
- `status` (optional, ReReconciliationStatus)
- `limit` (default: 50)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": { "rows": [...], "total": 0 },
  "correlationId": "string"
}
```

---

### PATCH /re/reconciliations/:reconciliationId
**Purpose**: Update reconciliation  
**Permission**: `re:reconciliations:update`

**Path Params**: `reconciliationId`

**Request Body**:
```json
{
  "status": "string",
  "summary": {},
  "details": {}
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

### POST /re/reconciliations/invoice/register
**Purpose**: Register external invoice  
**Permission**: `re:reconciliations:update`

**Request Body**:
```json
{
  "statementId": "string (required)",
  "invoiceNumber": "string (required)",
  "invoiceDate": "ISO8601 (required)",
  "invoiceAmount": 0 (required),
  "invoiceCurrency": "string",
  "receivedFrom": "string (required)"
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
- `VALIDATION_ERROR` - Missing required fields
- `INTERNAL_ERROR` - Failed to register invoice

---

### POST /re/reconciliations/:reconciliationId/auto-match
**Purpose**: Auto-match invoice  
**Permission**: `re:reconciliations:update`

**Path Params**: `reconciliationId`

**Request Body**:
```json
{
  "invoiceId": "string"
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

## Recovery Endpoints

### POST /re/recoveries
**Purpose**: Create recovery  
**Permission**: `re:recoveries:create`

**Request Body**:
```json
{
  "treatyId": "string",
  "claimId": "string",
  "policyId": "string",
  "lossDate": "ISO8601",
  "grossLossAmount": 0,
  "cededLossAmount": 0,
  "recoveredAmount": 0,
  "currency": "string",
  "status": "string",
  "nextFollowUpAt": "ISO8601",
  "notes": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { "recoveryId": "UUID", ... },
  "correlationId": "string"
}
```

---

### GET /re/recoveries/:recoveryId
**Purpose**: Get recovery by ID  
**Permission**: `re:recoveries:view`

**Path Params**: `recoveryId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Recovery not found

---

### GET /re/recoveries
**Purpose**: List recoveries  
**Permission**: `re:recoveries:list`

**Query Params**:
- `treatyId` (optional, string)
- `status` (optional, ReClaimRecoveryStatus)
- `claimId` (optional, string)
- `limit` (default: 50)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": { "rows": [...], "total": 0 },
  "correlationId": "string"
}
```

---

### PATCH /re/recoveries/:recoveryId
**Purpose**: Update recovery  
**Permission**: `re:recoveries:update`

**Path Params**: `recoveryId`

**Request Body**:
```json
{
  "status": "string",
  "recoveredAmount": 0,
  "nextFollowUpAt": "ISO8601",
  "notes": "string"
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

## Ticket Endpoints

### POST /re/tickets
**Purpose**: Create ticket  
**Permission**: `re:tickets:create`

**Request Body**:
```json
{
  "reconciliationId": "string",
  "reasonCode": "string",
  "summary": "string",
  "assignedTo": "string",
  "slaResponseDueAt": "ISO8601"
}
```

**Response**:
```json
{
  "success": true,
  "data": { "ticketId": "UUID", ... },
  "correlationId": "string"
}
```

---

### GET /re/tickets/:ticketId
**Purpose**: Get ticket by ID  
**Permission**: `re:tickets:view`

**Path Params**: `ticketId`

**Response**:
```json
{
  "success": true,
  "data": {
    "ticket": { ... },
    "messages": [...],
    "attachments": [...]
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Ticket not found

---

### GET /re/tickets
**Purpose**: List tickets  
**Permission**: `re:tickets:list`

**Query Params**:
- `reconciliationId` (optional, string)
- `status` (optional, ReTicketStatus)
- `assignedTo` (optional, string)
- `limit` (default: 50)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": { "rows": [...], "total": 0 },
  "correlationId": "string"
}
```

---

### PATCH /re/tickets/:ticketId
**Purpose**: Update ticket  
**Permission**: `re:tickets:update`

**Path Params**: `ticketId`

**Request Body**:
```json
{
  "status": "string",
  "summary": "string"
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

### PATCH /re/tickets/:ticketId/assign
**Purpose**: Assign ticket  
**Permission**: `re:tickets:assign`

**Path Params**: `ticketId`

**Request Body**:
```json
{
  "assignedTo": "string"
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

### POST /re/tickets/:ticketId/messages
**Purpose**: Add ticket message  
**Permission**: `re:tickets:add_message`

**Path Params**: `ticketId`

**Request Body**:
```json
{
  "messageType": "string",
  "body": "string"
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

### POST /re/tickets/:ticketId/attachments
**Purpose**: Add ticket attachment  
**Permission**: `re:tickets:add_attachment`

**Path Params**: `ticketId`

**Request Body**:
```json
{
  "documentId": "string",
  "notes": "string"
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

## Export & Period Close

### GET /re/export
**Purpose**: Export reinsurance snapshot  
**Permission**: `re:export`

**Query Params**:
- `treatiesLimit` (default: 200)
- `cessionsLimit` (default: 200)
- `statementsLimit` (default: 200)
- `reconciliationsLimit` (default: 200)
- `recoveriesLimit` (default: 200)
- `ticketsLimit` (default: 200)

**Response**:
```json
{
  "success": true,
  "data": {
    "treaties": [...],
    "cessions": [...],
    "statements": [...],
    "reconciliations": [...],
    "recoveries": [...],
    "tickets": [...]
  },
  "correlationId": "string"
}
```

---

### POST /re/periods/close
**Purpose**: Close reinsurance period  
**Permission**: `re:periods:close`

**Request Body**:
```json
{
  "treatyId": "string (required)",
  "periodEnd": "ISO8601 (required)",
  "notes": "string"
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
- `VALIDATION_ERROR` - treatyId and periodEnd required
- `INTERNAL_ERROR` - Failed to close period

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for reinsurance-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "reinsurance-service",
  "timestamp": "ISO8601",
  "uptime": 123.45,
  "components": {
    "db": "ok|error",
    "kafka": "ok|error|not_configured"
  },
  "error": "string (only if degraded)"
}
```

---

## Summary

**Total Endpoints**: 35

**By Controller**:
- reinsurance.controller.ts: 34
- health.controller.ts: 1

**Treaty Lifecycle**:
1. Create → `/re/treaties`
2. Get → `/re/treaties/:treatyId`
3. List → `/re/treaties`
4. Update → `/re/treaties/:treatyId`
5. Close → `/re/treaties/:treatyId/close`

**Cession Lifecycle**:
1. Calculate Automatic → `/re/cessions/calculate-automatic`
2. Create → `/re/cessions`
3. Get → `/re/cessions/:cessionId`
4. List → `/re/cessions`
5. Update → `/re/cessions/:cessionId`
6. Approve → `/re/cessions/:cessionId/approve`

**Statement Lifecycle**:
1. Create → `/re/statements`
2. Get → `/re/statements/:statementId`
3. List → `/re/statements`
4. Update → `/re/statements/:statementId`

**Reconciliation Lifecycle**:
1. Create → `/re/reconciliations`
2. Get → `/re/reconciliations/:reconciliationId`
3. List → `/re/reconciliations`
4. Update → `/re/reconciliations/:reconciliationId`
5. Register Invoice → `/re/reconciliations/invoice/register`
6. Auto-Match → `/re/reconciliations/:reconciliationId/auto-match`

**Recovery Lifecycle**:
1. Create → `/re/recoveries`
2. Get → `/re/recoveries/:recoveryId`
3. List → `/re/recoveries`
4. Update → `/re/recoveries/:recoveryId`

**Ticket Lifecycle**:
1. Create → `/re/tickets`
2. Get → `/re/tickets/:ticketId`
3. List → `/re/tickets`
4. Update → `/re/tickets/:ticketId`
5. Assign → `/re/tickets/:ticketId/assign`
6. Add Message → `/re/tickets/:ticketId/messages`
7. Add Attachment → `/re/tickets/:ticketId/attachments`

**Permissions**:
- `re:treaties:create` - Create treaties
- `re:treaties:view` - View treaties
- `re:treaties:list` - List treaties
- `re:treaties:update` - Update treaties
- `re:treaties:close` - Close treaties
- `re:cessions:create` - Create cessions
- `re:cessions:view` - View cessions
- `re:cessions:list` - List cessions
- `re:cessions:update` - Update cessions
- `re:cessions:approve` - Approve cessions
- `re:statements:create` - Create statements
- `re:statements:view` - View statements
- `re:statements:list` - List statements
- `re:statements:update` - Update statements
- `re:reconciliations:create` - Create reconciliations
- `re:reconciliations:view` - View reconciliations
- `re:reconciliations:list` - List reconciliations
- `re:reconciliations:update` - Update reconciliations
- `re:recoveries:create` - Create recoveries
- `re:recoveries:view` - View recoveries
- `re:recoveries:list` - List recoveries
- `re:recoveries:update` - Update recoveries
- `re:tickets:create` - Create tickets
- `re:tickets:view` - View tickets
- `re:tickets:list` - List tickets
- `re:tickets:update` - Update tickets
- `re:tickets:assign` - Assign tickets
- `re:tickets:add_message` - Add ticket messages
- `re:tickets:add_attachment` - Add ticket attachments
- `re:export` - Export snapshot
- `re:periods:close` - Close periods

**Authentication**:
- All endpoints except `/health` use EcosystemJwtGuard + PermissionsGuard + TenantGuard
