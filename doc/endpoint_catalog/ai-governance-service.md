# AI Governance Service - Endpoint Catalog

**Service**: ai-governance-service  
**Purpose**: AI model governance, incident response, committee decisions, deployment approvals, monitoring, validation, ecosystem sync  
**Base Path**: `/` (varies by controller)

---

## Controllers Overview

1. **governance.controller.ts** - AI governance (incidents, committee decisions, approvals, monitoring, MRO, validation, ecosystem sync)
2. **model-intake.controller.ts** - Model lifecycle management
3. **health.controller.ts** - Health check

---

## 1. governance.controller.ts

**Base Path**: `/governance`  
**Auth**: JWT + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### POST /governance/incidents
**Purpose**: Create AI incident report  
**Permission**: `ai:governance:incidents:manage`

**Request Body**:
```json
{
  "modelId": "string",
  "modelName": "string",
  "type": "string",
  "severity": "string",
  "title": "string",
  "description": "string"
}
```

**Response**: Incident object

---

### GET /governance/incidents/:incidentId
**Purpose**: Get incident by ID  
**Permission**: `ai:governance:incidents:view`

**Path Params**: `incidentId`

**Response**: Incident object

---

### GET /governance/incidents
**Purpose**: List incidents by status or severity  
**Permission**: `ai:governance:incidents:view`

**Query Params**:
- `status` (optional, string)
- `severity` (optional, string)
- `modelId` (optional, string)

**Response**: Array of incidents

---

### GET /governance/incidents/statistics
**Purpose**: Get incident statistics  
**Permission**: `ai:governance:incidents:view`

**Response**: Incident statistics

---

### PUT /governance/incidents/:incidentId/assign
**Purpose**: Assign incident  
**Permission**: `ai:governance:incidents:manage`

**Path Params**: `incidentId`

**Request Body**:
```json
{
  "assignedTo": "string"
}
```

**Response**: Updated incident

---

### PUT /governance/incidents/:incidentId/investigate
**Purpose**: Start investigation  
**Permission**: `ai:governance:incidents:manage`

**Path Params**: `incidentId`

**Response**: Incident with investigation status

---

### PUT /governance/incidents/:incidentId/mitigate
**Purpose**: Mark incident as mitigated  
**Permission**: `ai:governance:incidents:manage`

**Path Params**: `incidentId`

**Response**: Mitigated incident

---

### PUT /governance/incidents/:incidentId/resolve
**Purpose**: Resolve incident  
**Permission**: `ai:governance:incidents:manage`

**Path Params**: `incidentId`

**Request Body**:
```json
{
  "resolutionNotes": "string"
}
```

**Response**: Resolved incident

---

### PUT /governance/incidents/:incidentId/close
**Purpose**: Close incident  
**Permission**: `ai:governance:incidents:manage`

**Path Params**: `incidentId`

**Response**: Closed incident

---

## Committee Endpoints

### POST /governance/committee/decisions
**Purpose**: Record committee decision  
**Permission**: `ai:governance:committee:manage`

**Request Body**: Committee decision object

**Response**: Recorded decision

---

### GET /governance/committee/decisions/:decisionId
**Purpose**: Get committee decision by ID  
**Permission**: `ai:governance:committee:view`

**Path Params**: `decisionId`

**Response**: Committee decision

---

### GET /governance/committee/decisions
**Purpose**: Get audit trail with filters  
**Permission**: `ai:governance:committee:view`

**Query Params**:
- `modelId` (optional, string)
- `committeeId` (optional, string)
- `decisionType` (optional, string)

**Response**: Audit trail

---

### GET /governance/committee/statistics/:committeeId
**Purpose**: Get committee statistics  
**Permission**: `ai:governance:committee:view`

**Path Params**: `committeeId`

**Response**: Committee statistics

---

## Approval Endpoints

### POST /governance/approvals
**Purpose**: Request deployment approval  
**Permission**: `ai:governance:approvals:manage`

**Request Body**:
```json
{
  "modelId": "string",
  "modelVersion": "string",
  "environment": "string",
  "validationReportId": "string",
  "riskAssessmentId": "string"
}
```

**Response**: Approval request

---

### GET /governance/approvals/:requestId
**Purpose**: Get approval request by ID  
**Permission**: `ai:governance:approvals:view`

**Path Params**: `requestId`

**Response**: Approval request

---

### PUT /governance/approvals/:requestId/approve
**Purpose**: Approve deployment request  
**Permission**: `ai:governance:approvals:manage`

**Path Params**: `requestId`

**Request Body**:
```json
{
  "comments": "string"
}
```

**Response**: Approved request

---

### PUT /governance/approvals/:requestId/reject
**Purpose**: Reject deployment request  
**Permission**: `ai:governance:approvals:manage`

**Path Params**: `requestId`

**Request Body**:
```json
{
  "reason": "string"
}
```

**Response**: Rejected request

---

## Monitoring Endpoints

### GET /governance/monitoring/metrics/:modelId
**Purpose**: Get model metrics history  
**Permission**: `ai:governance:monitoring:view`

**Path Params**: `modelId`

**Query Params**:
- `minutes` (default: 60, number)

**Response**: Metrics history

---

### POST /governance/monitoring/metrics
**Purpose**: Record model metrics  
**Permission**: `ai:governance:monitoring:manage`

**Request Body**: Metrics object

**Response**: Recorded metrics

---

### GET /governance/monitoring/anomalies
**Purpose**: List anomalies  
**Permission**: `ai:governance:monitoring:view`

**Query Params**:
- `modelId` (optional, string)

**Response**: Array of anomalies

---

### GET /governance/monitoring/drift/:modelId
**Purpose**: Get drift metrics for model  
**Permission**: `ai:governance:monitoring:view`

**Path Params**: `modelId`

**Response**: Drift metrics

---

## MRO Endpoints

### GET /governance/mro/dashboard
**Purpose**: Get MRO dashboard metrics  
**Permission**: `ai:governance:mro:view`

**Response**: MRO dashboard metrics

---

### GET /governance/mro/alerts
**Purpose**: Get MRO active alerts  
**Permission**: `ai:governance:mro:view`

**Response**: Active alerts

---

## Validation Endpoints

### POST /governance/validation/initiate
**Purpose**: Initiate model validation  
**Permission**: `ai:governance:validation:manage`

**Request Body**:
```json
{
  "modelId": "string",
  "modelVersion": "string",
  "validationType": "string"
}
```

**Response**: Validation report

---

### GET /governance/validation/:reportId
**Purpose**: Get validation report by ID  
**Permission**: `ai:governance:validation:view`

**Path Params**: `reportId`

**Response**: Validation report

---

### PUT /governance/validation/:reportId/approve
**Purpose**: Approve validation report  
**Permission**: `ai:governance:validation:manage`

**Path Params**: `reportId`

**Response**: Approved report

---

### PUT /governance/validation/:reportId/reject
**Purpose**: Reject validation report  
**Permission**: `ai:governance:validation:manage`

**Path Params**: `reportId`

**Request Body**:
```json
{
  "reason": "string"
}
```

**Response**: Rejected report

---

## Ecosystem Sync Endpoints

### GET /governance/ecosystem-sync
**Purpose**: Export local models and incidents to ecosystem A06 format  
**Permission**: `ai:governance:sync:view`

**Response**: Exported data

---

### GET /governance/ecosystem-sync/status
**Purpose**: Get ecosystem sync status  
**Permission**: `ai:governance:sync:view`

**Response**: Sync status

---

### POST /governance/ecosystem-sync/policy-update
**Purpose**: Receive policy update from ecosystem AI governance  
**Permission**: `ai:governance:sync:manage`

**Request Body**:
```json
{
  "policyId": "string",
  "policyType": "model_approval|incident_escalation|risk_threshold|evaluation_frequency",
  "rules": {},
  "effectiveFrom": "ISO8601",
  "sourceSystem": "string"
}
```

**Response**: Imported policy

---

## 2. model-intake.controller.ts

**Base Path**: `/models`  
**Auth**: JWT + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### POST /models
**Purpose**: Register new AI model  
**Permission**: `ai:model:register`

**Request Body**: CreateModelDto
```json
{
  "modelName": "string",
  "modelType": "ModelType",
  "version": "string",
  "provider": "string",
  "description": "string",
  "parameters": {},
  "trainingDataSummary": "string",
  "performanceMetrics": {},
  "tags": "string",
  "metadata": {}
}
```

**Response**: ModelInventory object

**Event Published**: `insurance.ai.model.registered`

---

### GET /models
**Purpose**: List all registered models  
**Permission**: `ai:model:list`

**Query Params**:
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response**:
```json
{
  "models": [...],
  "total": 0
}
```

---

### GET /models/:modelId
**Purpose**: Get model details by ID  
**Permission**: `ai:model:view`

**Path Params**: `modelId`

**Response**: ModelInventory object

**Errors**:
- `Error` - Model not found

---

### GET /models/:modelId/state
**Purpose**: Get model lifecycle state  
**Permission**: `ai:model:view`

**Path Params**: `modelId`

**Response**: Model state

---

### PUT /models/:modelId/transition
**Purpose**: Transition model to new state  
**Permission**: `ai:model:transition`

**Path Params**: `modelId`

**Request Body**:
```json
{
  "targetStatus": "ModelStatus"
}
```

**Response**: Transitioned model

**Errors**:
- `Error` - Invalid transition

---

### PUT /models/:modelId
**Purpose**: Update model metadata  
**Permission**: `ai:model:update`

**Path Params**: `modelId`

**Request Body**: UpdateModelDto
```json
{
  "description": "string",
  "parameters": {},
  "performanceMetrics": {},
  "tags": "string",
  "metadata": {},
  "riskLevel": "ModelRiskLevel"
}
```

**Response**: Updated model

**Errors**:
- `Error` - Model not found

---

### DELETE /models/:modelId
**Purpose**: Delete model (soft delete)  
**Permission**: `ai:model:delete`

**Path Params**: `modelId`

**Response**:
```json
{
  "message": "string"
}
```

**Errors**:
- `Error` - Model not found

---

### GET /models/status/:status
**Purpose**: Get models by status  
**Permission**: `ai:model:list`

**Path Params**: `status` (ModelStatus)

**Response**: Array of models

---

### GET /models/evaluation/due
**Purpose**: Get models needing evaluation  
**Permission**: `ai:model:list`

**Response**: Array of models

---

### POST /models/retire/deprecated
**Purpose**: Auto-retire deprecated models  
**Permission**: `ai:model:retire`

**Request Body**:
```json
{
  "daysThreshold": 90
}
```

**Response**: Array of retired models

---

### GET /models/transitions/rules
**Purpose**: Get all transition rules  
**Permission**: `ai:model:view`

**Response**: Transition rules

---

## 3. health.controller.ts

### GET /health
**Purpose**: Health check for ai-governance-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "ai-governance-service",
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

**Total Endpoints**: 33

**By Controller**:
- governance.controller.ts: 20
- model-intake.controller.ts: 12
- health.controller.ts: 1

**Incident Lifecycle**:
1. Create → `/governance/incidents`
2. Assign → `/governance/incidents/:incidentId/assign`
3. Investigate → `/governance/incidents/:incidentId/investigate`
4. Mitigate → `/governance/incidents/:incidentId/mitigate`
5. Resolve → `/governance/incidents/:incidentId/resolve`
6. Close → `/governance/incidents/:incidentId/close`

**Approval Workflow**:
1. Request → `/governance/approvals`
2. Get → `/governance/approvals/:requestId`
3. Approve → `/governance/approvals/:requestId/approve`
4. Reject → `/governance/approvals/:requestId/reject`

**Validation Workflow**:
1. Initiate → `/governance/validation/initiate`
2. Get Report → `/governance/validation/:reportId`
3. Approve → `/governance/validation/:reportId/approve`
4. Reject → `/governance/validation/:reportId/reject`

**Model Lifecycle**:
1. Register → `/models`
2. List → `/models`
3. Get → `/models/:modelId`
4. Get State → `/models/:modelId/state`
5. Transition → `/models/:modelId/transition`
6. Update → `/models/:modelId`
7. Delete → `/models/:modelId`
8. By Status → `/models/status/:status`
9. Due for Evaluation → `/models/evaluation/due`
10. Retire Deprecated → `/models/retire/deprecated`
11. Transition Rules → `/models/transitions/rules`

**Permissions**:
- `ai:governance:incidents:manage` - Manage incidents
- `ai:governance:incidents:view` - View incidents
- `ai:governance:committee:manage` - Manage committee decisions
- `ai:governance:committee:view` - View committee decisions
- `ai:governance:approvals:manage` - Manage approvals
- `ai:governance:approvals:view` - View approvals
- `ai:governance:monitoring:manage` - Manage monitoring
- `ai:governance:monitoring:view` - View monitoring
- `ai:governance:mro:view` - View MRO
- `ai:governance:validation:manage` - Manage validation
- `ai:governance:validation:view` - View validation
- `ai:governance:sync:view` - View ecosystem sync
- `ai:governance:sync:manage` - Manage ecosystem sync
- `ai:model:register` - Register models
- `ai:model:list` - List models
- `ai:model:view` - View models
- `ai:model:transition` - Transition models
- `ai:model:update` - Update models
- `ai:model:delete` - Delete models
- `ai:model:retire` - Retire models

**Events Published**:
- `insurance.ai.model.registered` - When model is registered

**Authentication**:
- All endpoints use JWT + PermissionsGuard + AbacGuard + TenantGuard
