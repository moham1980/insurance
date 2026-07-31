# Fraud Service - Endpoint Catalog

**Service**: fraud-service  
**Purpose**: Fraud detection, ML model management, graph/network analytics, irregularity alerts  
**Base Path**: `/`

---

## Controllers Overview

1. **fraud.controller.ts** - Fraud operations (score computation, case management, ML models, graph analytics, alerts)
2. **health.controller.ts** - Health check

---

## 1. fraud.controller.ts

**Base Path**: `/`  
**Auth**: JWT + PermissionsGuard + TenantGuard (all endpoints except /health)

### POST /fraud/compute-score
**Purpose**: Compute fraud score for claim  
**Permission**: `fraud:triage`

**Headers**:
- `X-Correlation-Id` (optional)

**Request Body**:
```json
{
  "claimId": "string (required)",
  "claimNumber": "string (required)",
  "lossType": "string (required)",
  "policyId": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "string",
    "score": 0,
    "signals": [],
    "holdClaim": false,
    "threshold": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - claimId, claimNumber, lossType required

---

### POST /fraud/cases/:claimId/open
**Purpose**: Open fraud case  
**Permission**: `fraud:triage`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "claimNumber": "string",
  "claimantId": "string",
  "lossType": "string",
  "claimAmount": 123.45,
  "policyId": "string",
  "partyId": "string",
  "score": 0,
  "signals": [],
  "notes": "string",
  "assignedTo": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "fraudCaseId": "UUID",
    "claimId": "string",
    "status": "string",
    "holdClaim": false
  },
  "correlationId": "string"
}
```

---

### POST /fraud/cases/:fraudCaseId/escalate
**Purpose**: Escalate fraud case  
**Permission**: `fraud:escalate`

**Path Params**: `fraudCaseId`

**Request Body**:
```json
{
  "toUnit": "siu|legal (required)",
  "reasonCodes": [],
  "notes": "string",
  "requiresHumanApproval": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "fraudCaseId": "UUID",
    "status": "string",
    "holdClaim": false
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - toUnit must be siu or legal
- `NOT_FOUND` - Fraud case not found

---

### POST /fraud/cases/:fraudCaseId/close
**Purpose**: Close fraud case  
**Permission**: `fraud:investigate`

**Path Params**: `fraudCaseId`

**Request Body**:
```json
{
  "resolution": "confirmed|cleared (required)",
  "notes": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "fraudCaseId": "UUID",
    "status": "string",
    "holdClaim": false
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - resolution must be confirmed or cleared
- `NOT_FOUND` - Fraud case not found

---

### GET /fraud/cases
**Purpose**: List fraud cases  
**Permission**: `fraud:cases:list`

**Query Params**:
- `status` (optional, string)
- `claimId` (optional, string)
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

---

## ML Model Endpoints

### POST /fraud/ml/train
**Purpose**: Train ML model  
**Permission**: `fraud:ml:train`

**Request Body**:
```json
{
  "modelName": "string (required)",
  "modelVersion": "string (required)",
  "modelType": "string (required)",
  "modelConfig": {} (required),
  "trainingData": [] (required),
  "description": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "modelId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - modelName, modelVersion, modelType, modelConfig, trainingData required

---

### POST /fraud/ml/models/:modelId/deploy
**Purpose**: Deploy ML model  
**Permission**: `fraud:ml:deploy`

**Path Params**: `modelId`

**Response**:
```json
{
  "success": true,
  "data": {
    "modelId": "UUID",
    "status": "string",
    "isDefault": false
  },
  "correlationId": "string"
}
```

---

### POST /fraud/ml/predict
**Purpose**: Predict fraud with ML  
**Permission**: `fraud:ml:predict`

**Request Body**:
```json
{
  "claimId": "string (required)",
  "claimNumber": "string (required)",
  "lossType": "string (required)",
  "features": {} (required),
  "policyId": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "prediction": "string",
    "score": 0,
    "confidence": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - claimId, claimNumber, lossType, features required

---

### GET /fraud/ml/models
**Purpose**: List ML models  
**Permission**: `fraud:ml:view`

**Query Params**:
- `status` (optional, string)
- `modelType` (optional, string)
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

## Graph/Network Analytics Endpoints

### POST /fraud/graph/entities
**Purpose**: Create graph entity  
**Permission**: `fraud:graph:create`

**Request Body**:
```json
{
  "entityType": "string (required)",
  "entityId": "string (required)",
  "entityName": "string (required)",
  "description": "string",
  "attributes": {}
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
- `VALIDATION_ERROR` - entityType, entityId, entityName required

---

### POST /fraud/graph/relationships
**Purpose**: Create graph relationship  
**Permission**: `fraud:graph:create`

**Request Body**:
```json
{
  "sourceEntityId": "string (required)",
  "targetEntityId": "string (required)",
  "relationshipType": "string (required)",
  "description": "string",
  "weight": 0,
  "attributes": {}
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
- `VALIDATION_ERROR` - sourceEntityId, targetEntityId, relationshipType required

---

### GET /fraud/graph/suspicious-networks
**Purpose**: Detect suspicious networks  
**Permission**: `fraud:graph:view`

**Query Params**:
- `minConnectionCount` (optional, number)
- `minFraudCaseCount` (optional, number)

**Response**:
```json
{
  "success": true,
  "data": {
    "networks": [...]
  },
  "correlationId": "string"
}
```

---

## Irregularity Alert Endpoints

### POST /fraud/alerts/detect
**Purpose**: Detect irregularities  
**Permission**: `fraud:alert:create`

**Request Body**:
```json
{
  "claimId": "string (required)",
  "claimData": {} (required)
}
```

**Response**:
```json
{
  "success": true,
  "data": [...],
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - claimId and claimData required

---

### GET /fraud/alerts
**Purpose**: List irregularity alerts  
**Permission**: `fraud:alert:view`

**Query Params**:
- `claimId` (optional, string)
- `patternType` (optional, string)
- `severity` (optional, string)
- `status` (optional, string)
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

### PUT /fraud/alerts/:alertId
**Purpose**: Update irregularity alert  
**Permission**: `fraud:alert:update`

**Path Params**: `alertId`

**Request Body**:
```json
{
  "status": "string",
  "assignedTo": "string",
  "notes": "string",
  "resolutionNotes": "string"
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

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for fraud-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "fraud-service",
  "timestamp": "ISO8601",
  "uptime": 123.45,
  "components": {
    "db": "ok|error",
    "ml": "ok|error|not_configured",
    "kafka": "configured|not_configured"
  },
  "error": "string (only if degraded)"
}
```

---

## Summary

**Total Endpoints**: 14

**By Controller**:
- fraud.controller.ts: 13
- health.controller.ts: 1

**Fraud Case Lifecycle**:
1. Compute Score → `/fraud/compute-score`
2. Open Case → `/fraud/cases/:claimId/open`
3. Escalate → `/fraud/cases/:fraudCaseId/escalate`
4. Close → `/fraud/cases/:fraudCaseId/close`
5. List → `/fraud/cases`

**ML Model Lifecycle**:
1. Train → `/fraud/ml/train`
2. Deploy → `/fraud/ml/models/:modelId/deploy`
3. Predict → `/fraud/ml/predict`
4. List → `/fraud/ml/models`

**Graph Analytics**:
1. Create Entity → `/fraud/graph/entities`
2. Create Relationship → `/fraud/graph/relationships`
3. Detect Suspicious Networks → `/fraud/graph/suspicious-networks`

**Irregularity Alerts**:
1. Detect → `/fraud/alerts/detect`
2. List → `/fraud/alerts`
3. Update → `/fraud/alerts/:alertId`

**Permissions**:
- `fraud:triage` - Compute score, open cases
- `fraud:escalate` - Escalate cases
- `fraud:investigate` - Close cases
- `fraud:cases:list` - List cases
- `fraud:ml:train` - Train ML models
- `fraud:ml:deploy` - Deploy ML models
- `fraud:ml:predict` - Predict with ML
- `fraud:ml:view` - View ML models
- `fraud:graph:create` - Create graph entities/relationships
- `fraud:graph:view` - View graph analytics
- `fraud:alert:create` - Detect irregularities
- `fraud:alert:view` - View alerts
- `fraud:alert:update` - Update alerts

**Authentication**:
- All endpoints except `/health` use JWT + PermissionsGuard + TenantGuard
