# Workflow Service - Endpoint Catalog

**Service**: workflow-service  
**Purpose**: Workflow definitions, instances, and ecosystem AI profile recommendations  
**Base Path**: `/workflow` and `/ecosystem-ai`

---

## Controllers Overview

1. **workflow.controller.ts** - Workflow operations (definitions, instances, tasks, metrics)
2. **profile-reco.controller.ts** - Ecosystem AI profile recommendations
3. **health.controller.ts** - Health check

---

## 1. workflow.controller.ts

**Base Path**: `/workflow`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

## Workflow Definition Endpoints

### POST /workflow/definitions
**Purpose**: Create workflow definition  
**Permission**: (implicit from guards)

**Request Body**:
```json
{
  "tenantId": "string (required)",
  "name": "string (required)",
  "key": "string (required)",
  "description": "string",
  "definition": {},
  "metadata": {},
  "version": 0,
  "tags": []
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

### PUT /workflow/definitions/:id/activate
**Purpose**: Activate workflow definition  
**Permission**: (implicit from guards)

**Path Params**: `id`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

### PUT /workflow/definitions/:id/deactivate
**Purpose**: Deactivate workflow definition  
**Permission**: (implicit from guards)

**Path Params**: `id`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

### GET /workflow/definitions/:id/validate
**Purpose**: Validate workflow definition  
**Permission**: (implicit from guards)

**Path Params**: `id`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

### PUT /workflow/definitions/:id
**Purpose**: Update workflow definition  
**Permission**: (implicit from guards)

**Path Params**: `id`

**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "definition": {},
  "metadata": {},
  "tags": []
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Definition not found

---

### DELETE /workflow/definitions/:id
**Purpose**: Delete workflow definition  
**Permission**: (implicit from guards)

**Path Params**: `id`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "correlationId": "string"
}
```

---

### GET /workflow/definitions/:id
**Purpose**: Get workflow definition by ID  
**Permission**: (implicit from guards)

**Path Params**: `id`

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- `NOT_FOUND` - Definition not found

---

### GET /workflow/definitions
**Purpose**: List workflow definitions  
**Permission**: (implicit from guards)

**Query Params**:
- `tenantId` (optional, string)
- `key` (optional, string)
- `status` (optional, WorkflowStatus)
- `tags` (optional, comma-separated string)
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
  }
}
```

---

## Workflow Instance Endpoints

### POST /workflow/instances
**Purpose**: Start workflow instance  
**Permission**: (implicit from guards)

**Request Body**:
```json
{
  "tenantId": "string (required)",
  "workflowKey": "string (required)",
  "businessKey": "string",
  "variables": {},
  "metadata": {},
  "initiatorUserId": "string"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

### POST /workflow/instances/:id/advance
**Purpose**: Advance workflow instance  
**Permission**: (implicit from guards)

**Path Params**: `id` (instanceId)

**Request Body**:
```json
{
  "userId": "string"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

### POST /workflow/instances/:id/tasks/:taskId/complete
**Purpose**: Complete workflow task  
**Permission**: (implicit from guards)

**Path Params**: `id` (instanceId), `taskId`

**Request Body**:
```json
{
  "userId": "string (required)",
  "variables": {}
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

### PUT /workflow/instances/:id/cancel
**Purpose**: Cancel workflow instance  
**Permission**: (implicit from guards)

**Path Params**: `id` (instanceId)

**Request Body**:
```json
{
  "reason": "string"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "correlationId": "string"
}
```

---

### GET /workflow/instances/:id
**Purpose**: Get workflow instance by ID  
**Permission**: (implicit from guards)

**Path Params**: `id` (instanceId)

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- `NOT_FOUND` - Instance not found

---

### GET /workflow/instances
**Purpose**: List workflow instances  
**Permission**: (implicit from guards)

**Query Params**:
- `tenantId` (optional, string)
- `workflowKey` (optional, string)
- `businessKey` (optional, string)
- `status` (optional, InstanceStatus)
- `initiatorUserId` (optional, string)
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
  }
}
```

---

### GET /workflow/instances/metrics
**Purpose**: Get workflow instance metrics  
**Permission**: (implicit from guards)

**Query Params**:
- `tenantId` (optional, string)
- `workflowKey` (optional, string)
- `fromDate` (optional, ISO8601)
- `toDate` (optional, ISO8601)

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

---

## 2. profile-reco.controller.ts

**Base Path**: `/ecosystem-ai`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### GET /ecosystem-ai/recommendations
**Purpose**: Get profile recommendations  
**Permission**: (implicit from guards)

**Query Params**:
- `subjectId` (required, string)
- `domain` (default: insurance)
- `maxResults` (default: 5)

**Headers**:
- `Authorization` (required)

**Response**:
```json
{
  "success": true,
  "data": [...]
}
```

---

### POST /ecosystem-ai/signals
**Purpose**: Publish domain signals  
**Permission**: (implicit from guards)

**Request Body**:
```json
{
  "subjectId": "string (required)",
  "traits": {}
}
```

**Headers**:
- `Authorization` (required)

**Response**:
```json
{
  "success": true
}
```

---

### POST /ecosystem-ai/feedback
**Purpose**: Record recommendation feedback  
**Permission**: (implicit from guards)

**Request Body**:
```json
{
  "subjectId": "string (required)",
  "recommendationId": "string (required)",
  "eventType": "string (required)",
  "metadata": {}
}
```

**Headers**:
- `Authorization` (required)

**Response**:
```json
{
  "success": true
}
```

---

## 3. health.controller.ts

### GET /health
**Purpose**: Health check for workflow-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "workflow-service",
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

**Total Endpoints**: 18

**By Controller**:
- workflow.controller.ts: 14
- profile-reco.controller.ts: 3
- health.controller.ts: 1

**Workflow Definition Lifecycle**:
1. Create → `/workflow/definitions`
2. Activate → `/workflow/definitions/:id/activate`
3. Deactivate → `/workflow/definitions/:id/deactivate`
4. Validate → `/workflow/definitions/:id/validate`
5. Update → `/workflow/definitions/:id`
6. Delete → `/workflow/definitions/:id`
7. Get → `/workflow/definitions/:id`
8. List → `/workflow/definitions`

**Workflow Instance Lifecycle**:
1. Start → `/workflow/instances`
2. Advance → `/workflow/instances/:id/advance`
3. Complete Task → `/workflow/instances/:id/tasks/:taskId/complete`
4. Cancel → `/workflow/instances/:id/cancel`
5. Get → `/workflow/instances/:id`
6. List → `/workflow/instances`
7. Metrics → `/workflow/instances/metrics`

**Profile Recommendation**:
1. Get Recommendations → `/ecosystem-ai/recommendations`
2. Publish Signals → `/ecosystem-ai/signals`
3. Record Feedback → `/ecosystem-ai/feedback`

**Status Types**:
- WorkflowStatus: draft, active, retired, archived
- InstanceStatus: running, completed, cancelled, failed, suspended

**Authentication**:
- All endpoints except `/health` use JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard
