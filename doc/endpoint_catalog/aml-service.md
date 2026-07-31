# AML Service - Endpoint Catalog

**Service**: aml-service  
**Purpose**: Anti-Money Laundering (AML) compliance, consents, rules, alerts, external data sources, official reports  
**Base Path**: `/`

---

## Controllers Overview

1. **aml.controller.ts** - AML operations (consents, rules, alerts, dashboard, external sources, reports)
2. **health.controller.ts** - Health check

---

## 1. aml.controller.ts

**Base Path**: `/`  
**Auth**: JWT + PermissionsGuard + AbacGuard + TenantGuard (all endpoints except /health)

### GET /health
**Purpose**: Health check for aml-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok",
  "service": "aml-service"
}
```

---

## Consent Endpoints

### POST /aml/consents
**Purpose**: Create AML consent  
**Permission**: `aml:consents:create`

**Headers**:
- `X-Correlation-Id` (optional)

**Request Body**:
```json
{
  "subjectNationalId": "string",
  "consentType": "string",
  "validFrom": "ISO8601",
  "validTo": "ISO8601",
  "notes": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { "consentId": "UUID", ... },
  "correlationId": "string"
}
```

---

### GET /aml/consents/:consentId
**Purpose**: Get consent by ID  
**Permission**: `aml:consents:view`

**Path Params**: `consentId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Consent not found

---

### GET /aml/consents
**Purpose**: List consents  
**Permission**: `aml:consents:list`

**Query Params**:
- `subjectNationalId` (optional, string)
- `status` (optional, AmlConsentStatus)
- `consentType` (optional, string)
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

### PATCH /aml/consents/:consentId/revoke
**Purpose**: Revoke consent  
**Permission**: `aml:consents:revoke`

**Path Params**: `consentId`

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
  "data": { ... },
  "correlationId": "string"
}
```

---

## Dashboard

### GET /aml/dashboard
**Purpose**: Get AML dashboard  
**Permission**: `aml:dashboard`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

## Rule Endpoints

### POST /aml/rules
**Purpose**: Create AML rule  
**Permission**: `aml:rules:manage`

**Request Body**:
```json
{
  "ruleName": "string",
  "ruleType": "string",
  "expression": "string",
  "severity": "string",
  "description": "string",
  "status": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { "ruleId": "UUID", ... },
  "correlationId": "string"
}
```

---

### GET /aml/rules/:ruleId
**Purpose**: Get rule by ID  
**Permission**: `aml:rules:view`

**Path Params**: `ruleId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Rule not found

---

### GET /aml/rules
**Purpose**: List rules  
**Permission**: `aml:rules:list`

**Query Params**:
- `status` (optional, AmlRuleStatus)
- `ruleType` (optional, string)
- `severity` (optional, string)
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

### PATCH /aml/rules/:ruleId
**Purpose**: Update rule  
**Permission**: `aml:rules:manage`

**Path Params**: `ruleId`

**Request Body**:
```json
{
  "ruleName": "string",
  "ruleType": "string",
  "expression": "string",
  "severity": "string",
  "description": "string",
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

## Alert Endpoints

### POST /aml/alerts
**Purpose**: Create AML alert  
**Permission**: `aml:alerts:create`

**Request Body**:
```json
{
  "title": "string",
  "subjectNationalId": "string",
  "ruleId": "string",
  "severity": "string",
  "details": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": { "alertId": "UUID", ... },
  "correlationId": "string"
}
```

---

### GET /aml/alerts/:alertId
**Purpose**: Get alert by ID  
**Permission**: `aml:alerts:view`

**Path Params**: `alertId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Alert not found

---

### GET /aml/alerts
**Purpose**: List alerts  
**Permission**: `aml:alerts:list`

**Query Params**:
- `status` (optional, AmlAlertStatus)
- `severity` (optional, string)
- `subjectNationalId` (optional, string)
- `ruleId` (optional, string)
- `assignedTo` (optional, string)
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

### PATCH /aml/alerts/:alertId/assign
**Purpose**: Assign alert  
**Permission**: `aml:alerts:assign`

**Path Params**: `alertId`

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

### PATCH /aml/alerts/:alertId/status
**Purpose**: Update alert status  
**Permission**: `aml:alerts:update_status`

**Path Params**: `alertId`

**Request Body**:
```json
{
  "status": "string",
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

## Export

### GET /aml/export
**Purpose**: Export AML snapshot  
**Permission**: `aml:export`

**Query Params**:
- `consentsLimit` (default: 200)
- `rulesLimit` (default: 200)
- `alertsLimit` (default: 200)

**Response**:
```json
{
  "success": true,
  "data": {
    "consents": [...],
    "rules": [...],
    "alerts": [...]
  },
  "correlationId": "string"
}
```

---

## Transaction Evaluation

### POST /aml/transactions/evaluate
**Purpose**: Evaluate transaction for AML risk  
**Permission**: `aml:alerts:create`

**Request Body**:
```json
{
  "partyId": "string (required)",
  "partyName": "string (required)",
  "transactionType": "string (required)",
  "amount": 123.45 (required),
  "currency": "IRR",
  "referenceType": "string",
  "referenceId": "string",
  "metadata": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "riskScore": 0,
    "alertsTriggered": [],
    "requiresInvestigation": false
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - partyId, partyName, transactionType, amount required
- `INTERNAL_ERROR` - Evaluation failed

---

## External Data Source Endpoints

### POST /aml/external-sources
**Purpose**: Create external data source  
**Permission**: `aml:manage`

**Request Body**:
```json
{
  "sourceName": "string (required)",
  "sourceType": "string (required)",
  "connectionConfig": {},
  "syncFrequencyMinutes": 60
}
```

**Response**:
```json
{
  "success": true,
  "data": { "sourceId": "UUID", ... },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - sourceName, sourceType, connectionConfig required
- `INTERNAL_ERROR` - Creation failed

---

### PUT /aml/external-sources/:sourceId
**Purpose**: Update external data source  
**Permission**: `aml:manage`

**Path Params**: `sourceId`

**Request Body**:
```json
{
  "sourceName": "string",
  "connectionConfig": {},
  "syncFrequencyMinutes": 60,
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

**Errors**:
- `NOT_FOUND` - Source not found
- `INTERNAL_ERROR` - Update failed

---

### GET /aml/external-sources/:sourceId
**Purpose**: Get external data source by ID  
**Permission**: `aml:view`

**Path Params**: `sourceId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Source not found

---

### GET /aml/external-sources
**Purpose**: List external data sources  
**Permission**: `aml:view`

**Query Params**:
- `sourceType` (optional, string)
- `status` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": { "total": 0, "limit": 50, "offset": 0 },
  "correlationId": "string"
}
```

---

### POST /aml/external-sources/:sourceId/sync
**Purpose**: Sync external data source  
**Permission**: `aml:manage`

**Path Params**: `sourceId`

**Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "recordsSynced": 0,
    "errors": []
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Sync failed

---

### POST /aml/external-sources/:sourceId/query
**Purpose**: Query external data source  
**Permission**: `aml:view`

**Path Params**: `sourceId`

**Request Body**:
```json
{
  "nationalId": "string",
  "name": "string",
  "limit": 10
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "results": []
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Query failed

---

## Reports

### POST /aml/reports/official
**Purpose**: Generate official AML report  
**Permission**: `aml:manage`

**Request Body**:
```json
{
  "reportType": "suspicious_activity|currency_transaction|annual_summary (required)",
  "startDate": "ISO8601 (required)",
  "endDate": "ISO8601 (required)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "reportId": "UUID",
    "reportType": "string",
    "generatedAt": "ISO8601",
    "fileUrl": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - reportType, startDate, endDate required or invalid reportType
- `VALIDATION_ERROR` - Invalid date format
- `INTERNAL_ERROR` - Report generation failed

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for aml-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "aml-service",
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

**Total Endpoints**: 22

**By Controller**:
- aml.controller.ts: 21
- health.controller.ts: 1

**Consent Management**:
1. Create → `/aml/consents`
2. Get → `/aml/consents/:consentId`
3. List → `/aml/consents`
4. Revoke → `/aml/consents/:consentId/revoke`

**Rule Management**:
1. Create → `/aml/rules`
2. Get → `/aml/rules/:ruleId`
3. List → `/aml/rules`
4. Update → `/aml/rules/:ruleId`

**Alert Management**:
1. Create → `/aml/alerts`
2. Get → `/aml/alerts/:alertId`
3. List → `/aml/alerts`
4. Assign → `/aml/alerts/:alertId/assign`
5. Update Status → `/aml/alerts/:alertId/status`

**External Data Sources**:
1. Create → `/aml/external-sources`
2. Update → `/aml/external-sources/:sourceId`
3. Get → `/aml/external-sources/:sourceId`
4. List → `/aml/external-sources`
5. Sync → `/aml/external-sources/:sourceId/sync`
6. Query → `/aml/external-sources/:sourceId/query`

**Permissions**:
- `aml:consents:create` - Create consents
- `aml:consents:view` - View consents
- `aml:consents:list` - List consents
- `aml:consents:revoke` - Revoke consents
- `aml:dashboard` - View dashboard
- `aml:rules:manage` - Manage rules
- `aml:rules:view` - View rules
- `aml:rules:list` - List rules
- `aml:alerts:create` - Create alerts
- `aml:alerts:view` - View alerts
- `aml:alerts:list` - List alerts
- `aml:alerts:assign` - Assign alerts
- `aml:alerts:update_status` - Update alert status
- `aml:export` - Export snapshot
- `aml:manage` - Manage external sources and reports
- `aml:view` - View external sources

**Authentication**:
- All endpoints except `/health` use JWT + PermissionsGuard + AbacGuard + TenantGuard
