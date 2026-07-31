# Orchestrator Service - Endpoint Catalog

**Service**: orchestrator-service  
**Purpose**: Saga orchestration, workflow management, work items, SLA monitoring, and compensation handling  
**Base Path**: `/`

---

## Controllers Overview

1. **orchestrations.controller.ts** - Saga orchestration operations (start, view, compensation)
2. **work-items.controller.ts** - Work item operations (list, get, complete, assign, create special items, SLA monitoring)
3. **workflows.controller.ts** - Workflow process operations (start, get, work items)
4. **health.controller.ts** - Health check

---

## 1. orchestrations.controller.ts

**Base Path**: `/orchestrations`  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard

## Saga Endpoints

### POST /orchestrations/sagas
**Purpose**: Start a saga (orchestrated transaction)  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `orchestrations:saga_start`

**Request Body**:
```json
{
  "sagaType": "ClaimPayment|PolicyIssuance|ComplaintHandling|ComplaintResolution|ReinsuranceRecovery",
  "claimId": "string",
  "policyId": "string",
  "complaintId": "string",
  "recoveryId": "string",
  "contractId": "string",
  "context": {}
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "sagaId": "string",
    "sagaType": "ClaimPayment",
    "status": "started|completed|failed|compensating",
    "currentStep": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required fields
- `NOT_SUPPORTED` - Saga type not supported
- `INTERNAL_ERROR` - Failed to start saga

**Supported Saga Types**:
- ClaimPayment - Requires `claimId`
- PolicyIssuance - Requires `policyId`
- ComplaintHandling - Requires `complaintId`
- ComplaintResolution - Requires `complaintId`
- ReinsuranceRecovery - Requires `recoveryId`

---

### GET /orchestrations/sagas/:sagaId
**Purpose**: Get saga by ID  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `orchestrations:saga_view`

**Path Params**: `sagaId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "sagaId": "string",
    "sagaType": "ClaimPayment",
    "status": "started|completed|failed|compensating",
    "currentStep": "string",
    "steps": []
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Saga not found

---

## Compensation Endpoints

### POST /orchestrations/sagas/:sagaId/compensation
**Purpose**: Initiate saga compensation (rollback)  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `orchestrations:saga_compensate`

**Path Params**: `sagaId`

**Request Body**:
```json
{
  "reason": "string"
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "sagaId": "string",
    "status": "compensating",
    "compensationStartedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Reason is required
- `NOT_FOUND` - Saga not found
- `INVALID_STATE` - Saga cannot be compensated

---

### POST /orchestrations/sagas/:sagaId/compensation/retry
**Purpose**: Retry failed compensation  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `orchestrations:saga_compensate`

**Path Params**: `sagaId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "sagaId": "string",
    "status": "compensating"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Saga not found
- `INVALID_STATE` - Saga cannot be retried

---

### GET /orchestrations/sagas/:sagaId/compensation/status
**Purpose**: Get compensation status  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `orchestrations:saga_view`

**Path Params**: `sagaId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "sagaId": "string",
    "status": "not_started|in_progress|completed|failed",
    "compensatedSteps": 0,
    "totalSteps": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Saga not found

---

## 2. work-items.controller.ts

**Base Path**: `/work-items`  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard

## Work Item Endpoints

### GET /work-items
**Purpose**: List work items  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `work_items:list`

**Query Params**:
- `status` (optional, string)
- `assignedTo` (optional, string)
- `priority` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "workItemId": "string",
      "sagaId": "string",
      "type": "string",
      "status": "pending|in_progress|completed|rejected",
      "assignedTo": "string",
      "priority": "high|medium|low"
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

### GET /work-items/:workItemId
**Purpose**: Get work item by ID  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `work_items:view`

**Path Params**: `workItemId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "workItemId": "string",
    "sagaId": "string",
    "type": "string",
    "status": "pending|in_progress|completed|rejected",
    "assignedTo": "string",
    "priority": "high|medium|low",
    "context": {}
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Work item not found

---

### POST /work-items/:workItemId/complete
**Purpose**: Complete a work item with decision  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `work_items:complete`

**Path Params**: `workItemId`

**Request Body**:
```json
{
  "decision": "approved|rejected|escalated",
  "decidedBy": "string",
  "notes": "string",
  "result": {}
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "workItemId": "string",
    "status": "completed",
    "sagaId": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Decision or notes required for rejected/escalated
- `NOT_FOUND` - Work item not found
- `ALREADY_DECIDED` - Work item already decided
- `INTERNAL_ERROR` - Failed to complete work item

---

### POST /work-items/:workItemId/assign
**Purpose**: Assign work item to a user  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `work_items:assign`

**Path Params**: `workItemId`

**Request Body**:
```json
{
  "assignedTo": "string"
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "workItemId": "string",
    "assignedTo": "string",
    "status": "in_progress"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - assignedTo is required
- `NOT_FOUND` - Work item not found
- `INTERNAL_ERROR` - Failed to assign work item

---

## Special Work Item Creation Endpoints

### POST /work-items/sanhab-followup
**Purpose**: Create Sanhab followup work item  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `work_items:create_sanhab`

**Request Body**:
```json
{
  "policyId": "string",
  "claimId": "string",
  "reasonCode": "string",
  "inquiry": "string",
  "result": {},
  "priority": "high|medium|low"
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "sagaId": "string",
    "workItemId": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - reasonCode and inquiry are required

---

### POST /work-items/underwriting-review
**Purpose**: Create underwriting review work item  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `work_items:create_underwriting`

**Request Body**:
```json
{
  "policyId": "string",
  "reasonCode": "string",
  "context": {},
  "priority": "high|medium|low",
  "dueDate": "ISO8601"
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "sagaId": "string",
    "workItemId": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - policyId and reasonCode are required

---

### POST /work-items/suspicious-case
**Purpose**: Create suspicious case work item  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `work_items:create_suspicious_case`

**Request Body**:
```json
{
  "policyId": "string",
  "claimId": "string",
  "reasonCodes": ["string"],
  "explainability": {},
  "fraudScore": 0,
  "priority": "high|medium|low",
  "dueDate": "ISO8601"
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "sagaId": "string",
    "workItemId": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - reasonCodes and (policyId or claimId) are required
- `INTERNAL_ERROR` - Failed to create suspicious case work item

---

### POST /work-items/override-review
**Purpose**: Create override review work item  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `work_items:create_override`

**Request Body**:
```json
{
  "policyId": "string",
  "claimId": "string",
  "reasonCode": "string",
  "context": {},
  "priority": "high|medium|low",
  "dueDate": "ISO8601"
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "sagaId": "string",
    "workItemId": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - reasonCode and (policyId or claimId) are required

---

## SLA Monitoring Endpoints

### GET /work-items/sla/breaches
**Purpose**: Get SLA breaches  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `work_items:sla_view`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "breached": [
      {
        "workItemId": "string",
        "sagaId": "string",
        "dueDate": "ISO8601",
        "overdueBy": 3600
      }
    ],
    "metrics": {
      "totalWorkItems": 0,
      "breachedCount": 0,
      "breachRate": 0
    }
  },
  "correlationId": "string"
}
```

---

### POST /work-items/sla/process-breaches
**Purpose**: Process SLA breaches (escalate or notify)  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `work_items:sla_manage`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "processed": 0,
    "escalated": 0,
    "notified": 0
  },
  "correlationId": "string"
}
```

---

### GET /work-items/sla/stats/:sagaId
**Purpose**: Get SLA stats for a saga  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `work_items:sla_view`

**Path Params**: `sagaId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "sagaId": "string",
    "totalWorkItems": 0,
    "completedWorkItems": 0,
    "averageCompletionTime": 0,
    "slaComplianceRate": 0.95
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Saga not found

---

## 3. workflows.controller.ts

**Base Path**: `/workflows`  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard

## Process Endpoints

### POST /workflows/processes/:processType/start
**Purpose**: Start a workflow process  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `orchestrations:saga_start`

**Path Params**: `processType` (ClaimPayment|PolicyIssuance|ComplaintHandling|ComplaintResolution|ReinsuranceRecovery)

**Request Body**:
```json
{
  "subject": {
    "claimId": "string",
    "policyId": "string",
    "complaintId": "string",
    "recoveryId": "string",
    "contractId": "string"
  },
  "inputs": {},
  "context": {}
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "processInstanceId": "string",
    "processType": "ClaimPayment",
    "status": "started|completed|failed",
    "currentStep": "string",
    "sagaId": "string",
    "sagaType": "ClaimPayment"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required subject fields
- `NOT_SUPPORTED` - Process type not supported
- `INTERNAL_ERROR` - Failed to start process

---

### GET /workflows/processes/:processInstanceId
**Purpose**: Get process by ID  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `orchestrations:saga_view`

**Path Params**: `processInstanceId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "processInstanceId": "string",
    "processType": "ClaimPayment",
    "status": "started|completed|failed",
    "currentStep": "string",
    "saga": {}
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Process not found

---

## Workflow Work Item Endpoints

### GET /workflows/work-items
**Purpose**: List workflow work items  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `work_items:list`

**Query Params**:
- `state` (optional, string)
- `assigneeUserId` (optional, string)
- `priority` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "workItemId": "string",
      "sagaId": "string",
      "type": "string",
      "status": "pending|in_progress|completed|rejected",
      "assignedTo": "string"
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

### POST /workflows/work-items/:workItemId/claim
**Purpose**: Claim a work item  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `work_items:assign`

**Path Params**: `workItemId`

**Request Body**:
```json
{
  "assigneeUserId": "string"
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "workItemId": "string",
    "assignedTo": "string",
    "status": "in_progress"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - assigneeUserId is required
- `NOT_FOUND` - Work item not found
- `INTERNAL_ERROR` - Failed to claim work item

---

### POST /workflows/work-items/:workItemId/complete
**Purpose**: Complete a workflow work item  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `work_items:complete`

**Path Params**: `workItemId`

**Request Body**:
```json
{
  "decision": "approved|rejected|escalated",
  "decidedBy": "string",
  "notes": "string",
  "result": {}
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "workItemId": "string",
    "status": "completed",
    "sagaId": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Decision is required
- `NOT_FOUND` - Work item not found
- `ALREADY_DECIDED` - Work item already decided
- `INTERNAL_ERROR` - Failed to complete work item

---

## 4. health.controller.ts

### GET /health
**Purpose**: Health check for orchestrator-service with database and Kafka connectivity  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "orchestrator-service",
  "timestamp": "ISO8601",
  "uptime": 0,
  "components": {
    "db": "ok|error",
    "kafka": "ok|error|disabled"
  }
}
```

**Errors**:
- `degraded` status returned if database or Kafka connection fails

---

## Summary

**Total Endpoints**: 18

**By Controller**:
- orchestrations.controller.ts: 5
- work-items.controller.ts: 9
- workflows.controller.ts: 4
- health.controller.ts: 1

**Authentication**:
- `/health` - Public
- All other endpoints use JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard

**Saga Operations**:
1. Start Saga → `/orchestrations/sagas` (permission: `orchestrations:saga_start`)
2. Get Saga → `/orchestrations/sagas/:sagaId` (permission: `orchestrations:saga_view`)
3. Initiate Compensation → `/orchestrations/sagas/:sagaId/compensation` (permission: `orchestrations:saga_compensate`)
4. Retry Compensation → `/orchestrations/sagas/:sagaId/compensation/retry` (permission: `orchestrations:saga_compensate`)
5. Get Compensation Status → `/orchestrations/sagas/:sagaId/compensation/status` (permission: `orchestrations:saga_view`)

**Work Item Operations**:
1. List Work Items → `/work-items` (permission: `work_items:list`)
2. Get Work Item → `/work-items/:workItemId` (permission: `work_items:view`)
3. Complete Work Item → `/work-items/:workItemId/complete` (permission: `work_items:complete`)
4. Assign Work Item → `/work-items/:workItemId/assign` (permission: `work_items:assign`)

**Special Work Item Creation**:
1. Create Sanhab Followup → `/work-items/sanhab-followup` (permission: `work_items:create_sanhab`)
2. Create Underwriting Review → `/work-items/underwriting-review` (permission: `work_items:create_underwriting`)
3. Create Suspicious Case → `/work-items/suspicious-case` (permission: `work_items:create_suspicious_case`)
4. Create Override Review → `/work-items/override-review` (permission: `work_items:create_override`)

**SLA Monitoring**:
1. Get SLA Breaches → `/work-items/sla/breaches` (permission: `work_items:sla_view`)
2. Process SLA Breaches → `/work-items/sla/process-breaches` (permission: `work_items:sla_manage`)
3. Get SLA Stats → `/work-items/sla/stats/:sagaId` (permission: `work_items:sla_view`)

**Workflow Process Operations**:
1. Start Process → `/workflows/processes/:processType/start` (permission: `orchestrations:saga_start`)
2. Get Process → `/workflows/processes/:processInstanceId` (permission: `orchestrations:saga_view`)

**Workflow Work Item Operations**:
1. List Work Items → `/workflows/work-items` (permission: `work_items:list`)
2. Claim Work Item → `/workflows/work-items/:workItemId/claim` (permission: `work_items:assign`)
3. Complete Work Item → `/workflows/work-items/:workItemId/complete` (permission: `work_items:complete`)

**Permissions**:
- `orchestrations:saga_start` - Start sagas and processes
- `orchestrations:saga_view` - View sagas and compensation status
- `orchestrations:saga_compensate` - Initiate and retry compensation
- `work_items:list` - List work items
- `work_items:view` - View work items
- `work_items:complete` - Complete work items
- `work_items:assign` - Assign work items
- `work_items:create_sanhab` - Create Sanhab followup work items
- `work_items:create_underwriting` - Create underwriting review work items
- `work_items:create_suspicious_case` - Create suspicious case work items
- `work_items:create_override` - Create override review work items
- `work_items:sla_view` - View SLA breaches and stats
- `work_items:sla_manage` - Process SLA breaches

**Saga Status**:
- started - Started
- completed - Completed
- failed - Failed
- compensating - Compensating

**Work Item Status**:
- pending - Pending
- in_progress - In Progress
- completed - Completed
- rejected - Rejected

**Work Item Priority**:
- high - High
- medium - Medium
- low - Low

**Decision Types**:
- approved - Approved
- rejected - Rejected
- escalated - Escalated

**Compensation Status**:
- not_started - Not Started
- in_progress - In Progress
- completed - Completed
- failed - Failed

**Saga Types**:
- ClaimPayment - Claim Payment Saga
- PolicyIssuance - Policy Issuance Saga
- ComplaintHandling - Complaint Handling Saga
- ComplaintResolution - Complaint Resolution Saga
- ReinsuranceRecovery - Reinsurance Recovery Saga

**Pagination**:
- Default limit: 50
- Maximum limit: 200
- Default offset: 0

**Audit Logging**:
- All operations are logged with correlation ID, tenant ID, actor, and action
- Validation failures are logged with warnings
- Success operations are logged with info
- Failures are logged with errors
