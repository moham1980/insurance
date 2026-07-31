# Workflow Engine Service - Endpoint Catalog

**Service**: workflow-engine-service  
**Purpose**: BPMN workflow engine for process definitions and instances  
**Base Path**: `/workflow`

---

## Controllers Overview

1. **workflow-engine.controller.ts** - Workflow operations (definitions, instances, signaling, history)
2. **health.controller.ts** - Health check

---

## 1. workflow-engine.controller.ts

**Base Path**: `/workflow`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (all endpoints except /health)

## Process Definition Endpoints

### POST /workflow/definitions
**Purpose**: Create process definition  
**Permission**: `workflow:define`

**Request Body**:
```json
{
  "key": "string (required)",
  "name": "string (required)",
  "description": "string",
  "graph": {},
  "variables": {},
  "version": 0,
  "effectiveFrom": "ISO8601",
  "effectiveTo": "ISO8601",
  "metadata": {}
}
```

**Response**:
```json
{
  "id": "UUID",
  "key": "string",
  "name": "string",
  "description": "string",
  "graph": {},
  "variables": {},
  "version": 0,
  "status": "string",
  "tenantId": "string",
  "createdBy": "string",
  "createdAt": "ISO8601",
  "effectiveFrom": "ISO8601",
  "effectiveTo": "ISO8601",
  "metadata": {}
}
```

---

### GET /workflow/definitions
**Purpose**: List process definitions  
**Permission**: `workflow:list`

**Query Params**:
- `status` (optional, ProcessDefinitionStatus)
- `key` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response**:
```json
{
  "rows": [...],
  "total": 0
}
```

---

### GET /workflow/definitions/:id
**Purpose**: Get process definition by ID  
**Permission**: `workflow:view`

**Path Params**: `id`

**Response**:
```json
{
  "id": "UUID",
  "key": "string",
  "name": "string",
  "description": "string",
  "graph": {},
  "variables": {},
  "version": 0,
  "status": "string",
  "tenantId": "string",
  "createdBy": "string",
  "createdAt": "ISO8601",
  "effectiveFrom": "ISO8601",
  "effectiveTo": "ISO8601",
  "metadata": {}
}
```

---

### PUT /workflow/definitions/:id
**Purpose**: Update process definition  
**Permission**: `workflow:define`

**Path Params**: `id`

**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "graph": {},
  "variables": {},
  "effectiveFrom": "ISO8601",
  "effectiveTo": "ISO8601",
  "metadata": {}
}
```

**Response**:
```json
{
  "id": "UUID",
  "key": "string",
  "name": "string",
  "description": "string",
  "graph": {},
  "variables": {},
  "version": 0,
  "status": "string",
  "tenantId": "string",
  "createdBy": "string",
  "createdAt": "ISO8601",
  "effectiveFrom": "ISO8601",
  "effectiveTo": "ISO8601",
  "metadata": {}
}
```

---

### DELETE /workflow/definitions/:id
**Purpose**: Delete process definition  
**Permission**: `workflow:admin`

**Path Params**: `id`

**Response**: 204 No Content

---

## Process Instance Endpoints

### POST /workflow/start
**Purpose**: Start process instance  
**Permission**: `workflow:start`

**Request Body**:
```json
{
  "definitionKey": "string (required)",
  "businessKey": "string",
  "variables": {},
  "startNodeId": "string"
}
```

**Response**:
```json
{
  "id": "UUID",
  "definitionId": "UUID",
  "definitionKey": "string",
  "businessKey": "string",
  "status": "string",
  "currentNodeId": "string",
  "variables": {},
  "tenantId": "string",
  "startedBy": "string",
  "startedAt": "ISO8601",
  "completedAt": "ISO8601"
}
```

---

### POST /workflow/instances/:id/signal
**Purpose**: Signal process instance  
**Permission**: `workflow:signal`

**Path Params**: `id` (instanceId)

**Request Body**:
```json
{
  "signalName": "string (required)",
  "variables": {}
}
```

**Response**:
```json
{
  "id": "UUID",
  "definitionId": "UUID",
  "definitionKey": "string",
  "businessKey": "string",
  "status": "string",
  "currentNodeId": "string",
  "variables": {},
  "tenantId": "string",
  "startedBy": "string",
  "startedAt": "ISO8601",
  "completedAt": "ISO8601"
}
```

---

### POST /workflow/instances/:id/cancel
**Purpose**: Cancel process instance  
**Permission**: `workflow:cancel`

**Path Params**: `id` (instanceId)

**Request Body**:
```json
{
  "reason": "string"
}
```

**Response**:
```json
{
  "id": "UUID",
  "definitionId": "UUID",
  "definitionKey": "string",
  "businessKey": "string",
  "status": "string",
  "currentNodeId": "string",
  "variables": {},
  "tenantId": "string",
  "startedBy": "string",
  "startedAt": "ISO8601",
  "completedAt": "ISO8601"
}
```

---

### GET /workflow/instances/:id
**Purpose**: Get process instance by ID  
**Permission**: `workflow:view`

**Path Params**: `id` (instanceId)

**Response**:
```json
{
  "id": "UUID",
  "definitionId": "UUID",
  "definitionKey": "string",
  "businessKey": "string",
  "status": "string",
  "currentNodeId": "string",
  "variables": {},
  "tenantId": "string",
  "startedBy": "string",
  "startedAt": "ISO8601",
  "completedAt": "ISO8601"
}
```

---

### GET /workflow/instances
**Purpose**: List process instances  
**Permission**: `workflow:list`

**Query Params**:
- `businessKey` (optional, string) - if provided, returns instances by business key
- `status` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response**:
```json
{
  "rows": [...],
  "total": 0
}
```

---

### GET /workflow/instances/:id/history
**Purpose**: Get process instance history  
**Permission**: `workflow:history`

**Path Params**: `id` (instanceId)

**Response**:
```json
[
  {
    "id": "UUID",
    "instanceId": "UUID",
    "eventType": "string",
    "nodeId": "string",
    "variables": {},
    "userId": "string",
    "timestamp": "ISO8601"
  }
]
```

---

## Health Endpoints

### GET /workflow/health/deep
**Purpose**: Deep health check for workflow-engine-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "workflow-engine-service",
  "timestamp": "ISO8601",
  "components": {
    "db": "ok|error"
  },
  "error": "string (only if degraded)"
}
```

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for workflow-engine-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|error",
  "service": "workflow-engine-service",
  "timestamp": "ISO8601",
  "components": {
    "db": "ok|error",
    "kafka": "ok|error|not_configured"
  }
}
```

---

## Summary

**Total Endpoints**: 12

**By Controller**:
- workflow-engine.controller.ts: 11
- health.controller.ts: 1

**Process Definition Lifecycle**:
1. Create → `/workflow/definitions`
2. List → `/workflow/definitions`
3. Get → `/workflow/definitions/:id`
4. Update → `/workflow/definitions/:id`
5. Delete → `/workflow/definitions/:id`

**Process Instance Lifecycle**:
1. Start → `/workflow/start`
2. Signal → `/workflow/instances/:id/signal`
3. Cancel → `/workflow/instances/:id/cancel`
4. Get → `/workflow/instances/:id`
5. List → `/workflow/instances`
6. History → `/workflow/instances/:id/history`

**Permissions**:
- `workflow:define` - Create/update process definitions
- `workflow:list` - List definitions and instances
- `workflow:view` - View definitions, instances, history
- `workflow:start` - Start process instances
- `workflow:signal` - Signal process instances
- `workflow:cancel` - Cancel process instances
- `workflow:history` - View instance history
- `workflow:admin` - Delete process definitions

**Authentication**:
- All endpoints except `/health` and `/workflow/health/deep` use JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**Status Types**:
- ProcessDefinitionStatus: draft, active, retired, archived
- ProcessInstanceStatus: running, completed, cancelled, failed, suspended
