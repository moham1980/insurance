# Rule Engine Service - Endpoint Catalog

**Service**: rule-engine-service  
**Purpose**: Rule management, rule evaluation, rule templates, execution tracking  
**Base Path**: `/rule-engine`

---

## Controllers Overview

1. **rule-engine.controller.ts** - Rule operations (create, update, delete, activate, deactivate, validate, evaluate, list, templates)
2. **health.controller.ts** - Health check with database, outbox, and Kafka connectivity

---

## 1. rule-engine.controller.ts

**Base Path**: `/rule-engine`  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard

## Rule Management Endpoints

### POST /rule-engine/rules
**Purpose**: Create rule  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `rule_engine:rules:create`

**Request Body**:
```json
{
  "name": "string",
  "ruleSetKey": "string",
  "type": "business|validation|routing|pricing|fraud|compliance",
  "description": "string",
  "condition": {
    "expression": "string",
    "variables": ["string"]
  },
  "action": {},
  "priority": 0,
  "metadata": {},
  "templateId": "string",
  "version": 1,
  "tags": ["string"]
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "ruleSetKey": "string",
    "type": "business|validation|routing|pricing|fraud|compliance",
    "description": "string",
    "condition": {
      "expression": "string",
      "variables": ["string"]
    },
    "action": {},
    "priority": 0,
    "status": "draft|active|inactive|archived",
    "metadata": {},
    "templateId": "string",
    "version": 1,
    "tags": ["string"],
    "tenantId": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `UNAUTHORIZED` - Tenant not available in token

---

### PUT /rule-engine/rules/:id/activate
**Purpose**: Activate rule  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `rule_engine:rules:activate`

**Path Params**: `id`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "active",
    "activatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `UNAUTHORIZED` - Tenant not available in token

---

### PUT /rule-engine/rules/:id/deactivate
**Purpose**: Deactivate rule  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `rule_engine:rules:deactivate`

**Path Params**: `id`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "inactive",
    "deactivatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `UNAUTHORIZED` - Tenant not available in token

---

### PUT /rule-engine/rules/:id
**Purpose**: Update rule  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `rule_engine:rules:update`

**Path Params**: `id`

**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "condition": {
    "expression": "string",
    "variables": ["string"]
  },
  "action": {},
  "priority": 0,
  "status": "draft|active|inactive|archived",
  "metadata": {},
  "tags": ["string"]
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "ruleSetKey": "string",
    "type": "business|validation|routing|pricing|fraud|compliance",
    "description": "string",
    "condition": {
      "expression": "string",
      "variables": ["string"]
    },
    "action": {},
    "priority": 0,
    "status": "draft|active|inactive|archived",
    "metadata": {},
    "tags": ["string"],
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Rule not found
- `UNAUTHORIZED` - Tenant not available in token

---

### DELETE /rule-engine/rules/:id
**Purpose**: Delete rule  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `rule_engine:rules:delete`

**Path Params**: `id`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "correlationId": "string"
}
```

**Errors**:
- `UNAUTHORIZED` - Tenant not available in token

---

### GET /rule-engine/rules/:id/validate
**Purpose**: Validate rule  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `rule_engine:rules:view`

**Path Params**: `id`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": ["string"],
    "warnings": ["string"]
  },
  "correlationId": "string"
}
```

**Errors**:
- `UNAUTHORIZED` - Tenant not available in token

---

### GET /rule-engine/rules/:id
**Purpose**: Get rule by ID  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `rule_engine:rules:view`

**Path Params**: `id`

**Headers**:
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "ruleSetKey": "string",
    "type": "business|validation|routing|pricing|fraud|compliance",
    "description": "string",
    "condition": {
      "expression": "string",
      "variables": ["string"]
    },
    "action": {},
    "priority": 0,
    "status": "draft|active|inactive|archived",
    "metadata": {},
    "templateId": "string",
    "version": 1,
    "tags": ["string"],
    "tenantId": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Errors**:
- `NOT_FOUND` - Rule not found

---

### GET /rule-engine/rules
**Purpose**: List rules  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `rule_engine:rules:list`

**Query Params**:
- `ruleSetKey` (optional, string)
- `status` (optional, string: draft|active|inactive|archived)
- `type` (optional, string: business|validation|routing|pricing|fraud|compliance)
- `tags` (optional, comma-separated string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "ruleSetKey": "string",
      "type": "business|validation|routing|pricing|fraud|compliance",
      "status": "draft|active|inactive|archived",
      "priority": 0,
      "tags": ["string"],
      "createdAt": "ISO8601"
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

## Rule Evaluation Endpoints

### POST /rule-engine/evaluate
**Purpose**: Evaluate rules  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `rule_engine:evaluate`

**Request Body**:
```json
{
  "ruleSetKey": "string",
  "businessKey": "string",
  "input": {},
  "metadata": {},
  "dryRun": false
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "executionId": "string",
    "ruleSetKey": "string",
    "businessKey": "string",
    "matchedRules": [
      {
        "ruleId": "string",
        "ruleName": "string",
        "action": {},
        "matchedAt": "ISO8601"
      }
    ],
    "status": "success|partial_success|failed",
    "executedAt": "ISO8601",
    "dryRun": false
  },
  "correlationId": "string"
}
```

**Errors**:
- `UNAUTHORIZED` - Tenant not available in token

---

## Execution Tracking Endpoints

### GET /rule-engine/executions
**Purpose**: List executions  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `rule_engine:executions:list`

**Query Params**:
- `ruleSetKey` (optional, string)
- `businessKey` (optional, string)
- `status` (optional, string: success|partial_success|failed)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "executionId": "string",
      "ruleSetKey": "string",
      "businessKey": "string",
      "status": "success|partial_success|failed",
      "matchedRulesCount": 0,
      "executedAt": "ISO8601"
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

### GET /rule-engine/executions/:id
**Purpose**: Get execution by ID  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `rule_engine:executions:view`

**Path Params**: `id`

**Headers**:
- `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "executionId": "string",
    "ruleSetKey": "string",
    "businessKey": "string",
    "input": {},
    "matchedRules": [
      {
        "ruleId": "string",
        "ruleName": "string",
        "action": {},
        "matchedAt": "ISO8601"
      }
    ],
    "status": "success|partial_success|failed",
    "executedAt": "ISO8601",
    "dryRun": false
  }
}
```

**Errors**:
- `NOT_FOUND` - Execution not found

---

### GET /rule-engine/executions/metrics
**Purpose**: Get execution metrics  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `rule_engine:executions:list`

**Query Params**:
- `ruleSetKey` (optional, string)
- `fromDate` (optional, ISO8601)
- `toDate` (optional, ISO8601)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "totalExecutions": 0,
    "successfulExecutions": 0,
    "failedExecutions": 0,
    "partialSuccessExecutions": 0,
    "averageExecutionTimeMs": 0,
    "ruleSetMetrics": [
      {
        "ruleSetKey": "string",
        "totalExecutions": 0,
        "successfulExecutions": 0,
        "failedExecutions": 0,
        "averageExecutionTimeMs": 0
      }
    ]
  },
  "correlationId": "string"
}
```

---

## Template Endpoints

### POST /rule-engine/templates
**Purpose**: Create template  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `rule_engine:templates:create`

**Request Body**:
```json
{
  "name": "string",
  "category": "string",
  "description": "string",
  "conditionTemplate": "string",
  "actionTemplate": {},
  "variables": ["string"]
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "templateId": "string",
    "name": "string",
    "category": "string",
    "description": "string",
    "conditionTemplate": "string",
    "actionTemplate": {},
    "variables": ["string"],
    "tenantId": "string",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `UNAUTHORIZED` - Tenant not available in token

---

### GET /rule-engine/templates
**Purpose**: List templates  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `rule_engine:templates:list`

**Query Params**:
- `category` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "templateId": "string",
      "name": "string",
      "category": "string",
      "description": "string",
      "variables": ["string"],
      "createdAt": "ISO8601"
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

### POST /rule-engine/templates/:templateId/rules
**Purpose**: Create rule from template  
**Auth**: JwtAuthGuard, PermissionsGuard, TenantGuard  
**Permission**: `rule_engine:templates:create`

**Path Params**: `templateId`

**Request Body**:
```json
{
  "name": "string",
  "ruleSetKey": "string",
  "type": "business|validation|routing|pricing|fraud|compliance",
  "variableValues": {},
  "priority": 0
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "ruleSetKey": "string",
    "type": "business|validation|routing|pricing|fraud|compliance",
    "condition": {
      "expression": "string",
      "variables": ["string"]
    },
    "action": {},
    "priority": 0,
    "status": "draft",
    "templateId": "string",
    "tenantId": "string",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `UNAUTHORIZED` - Tenant not available in token

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for rule-engine-service with database, outbox, and Kafka connectivity  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded|error",
  "service": "rule-engine-service",
  "timestamp": "ISO8601",
  "checks": {
    "database": {
      "status": "ok|error",
      "message": "string"
    },
    "outbox": {
      "status": "ok|error",
      "pending": 0,
      "failed": 0,
      "message": "string"
    },
    "kafka": {
      "status": "ok|error",
      "message": "string",
      "note": "string"
    }
  }
}
```

**Health Checks**:
- Database connectivity check
- Outbox event backlog check (pending and failed events in last 5 minutes)
- Kafka broker reachability check (if KAFKA_BROKERS configured)

**Status Logic**:
- `error` - Database check failed
- `degraded` - Outbox has failed events or Kafka check failed
- `ok` - All checks passed

---

## Summary

**Total Endpoints**: 16

**By Controller**:
- rule-engine.controller.ts: 15
- health.controller.ts: 1

**Authentication**:
- `/health` - Public
- All other endpoints use JwtAuthGuard, PermissionsGuard, TenantGuard

**Rule Management**:
1. Create Rule → `/rule-engine/rules` (permission: `rule_engine:rules:create`)
2. Activate Rule → `/rule-engine/rules/:id/activate` (permission: `rule_engine:rules:activate`)
3. Deactivate Rule → `/rule-engine/rules/:id/deactivate` (permission: `rule_engine:rules:deactivate`)
4. Update Rule → `/rule-engine/rules/:id` (permission: `rule_engine:rules:update`)
5. Delete Rule → `/rule-engine/rules/:id` (permission: `rule_engine:rules:delete`)
6. Validate Rule → `/rule-engine/rules/:id/validate` (permission: `rule_engine:rules:view`)
7. Get Rule → `/rule-engine/rules/:id` (permission: `rule_engine:rules:view`)
8. List Rules → `/rule-engine/rules` (permission: `rule_engine:rules:list`)

**Rule Evaluation**:
1. Evaluate Rules → `/rule-engine/evaluate` (permission: `rule_engine:evaluate`)

**Execution Tracking**:
1. List Executions → `/rule-engine/executions` (permission: `rule_engine:executions:list`)
2. Get Execution → `/rule-engine/executions/:id` (permission: `rule_engine:executions:view`)
3. Execution Metrics → `/rule-engine/executions/metrics` (permission: `rule_engine:executions:list`)

**Templates**:
1. Create Template → `/rule-engine/templates` (permission: `rule_engine:templates:create`)
2. List Templates → `/rule-engine/templates` (permission: `rule_engine:templates:list`)
3. Create Rule from Template → `/rule-engine/templates/:templateId/rules` (permission: `rule_engine:templates:create`)

**Permissions**:
- `rule_engine:rules:create` - Create rules
- `rule_engine:rules:activate` - Activate rules
- `rule_engine:rules:deactivate` - Deactivate rules
- `rule_engine:rules:update` - Update rules
- `rule_engine:rules:delete` - Delete rules
- `rule_engine:rules:view` - View rules
- `rule_engine:rules:list` - List rules
- `rule_engine:evaluate` - Evaluate rules
- `rule_engine:executions:list` - List executions
- `rule_engine:executions:view` - View executions
- `rule_engine:templates:create` - Create templates
- `rule_engine:templates:list` - List templates

**Rule Types**:
- business - Business rules
- validation - Validation rules
- routing - Routing rules
- pricing - Pricing rules
- fraud - Fraud detection rules
- compliance - Compliance rules

**Rule Status**:
- draft - Draft
- active - Active
- inactive - Inactive
- archived - Archived

**Execution Status**:
- success - Success
- partial_success - Partial success
- failed - Failed

**Condition Expression**:
- Uses expression language for rule conditions
- Variables defined in condition.variables array
- Expression evaluated against input data

**Rule Priority**:
- Higher priority rules evaluated first
- Default priority: 0
- Can be set during creation or update

**Rule Sets**:
- Rules grouped by ruleSetKey
- Multiple rules can belong to same rule set
- Evaluation performed within rule set context

**Dry Run**:
- dryRun=true evaluates rules without executing actions
- Useful for testing and validation
- Returns matched rules without side effects

**Business Key**:
- Optional identifier for business context
- Used for tracking and correlation
- Can be used to group related executions

**Templates**:
- Reusable rule templates
- Category-based organization
- Variable substitution using variableValues
- Condition and action templates support placeholders

**Execution Metrics**:
- Total executions count
- Success/failure breakdown
- Average execution time
- Per-rule-set metrics
- Date range filtering

**Pagination**:
- Default limit: 50
- Maximum limit: 200
- Default offset: 0

**Tags**:
- Comma-separated in query params
- Array in request/response bodies
- Used for categorization and filtering

**Correlation IDs**:
- Auto-generated if not provided
- Format: `re-{timestamp}`
- Used for tracing across services

**Tenant Context**:
- All operations require tenant context
- Tenant ID extracted from JWT token
- Rules and templates scoped to tenant

**Outbox Pattern**:
- Events published via outbox
- Health check monitors pending/failed events
- Failed events cause degraded status

**Kafka Integration**:
- Optional (if KAFKA_BROKERS configured)
- Health check verifies broker connectivity
- Used for event publishing

**Rule Validation**:
- Syntax validation of condition expressions
- Variable reference validation
- Action structure validation
- Returns errors and warnings

**Rule Evaluation Flow**:
1. Load active rules for ruleSetKey
2. Sort by priority (descending)
3. Evaluate each rule condition against input
4. Execute action for matching rules
5. Track execution results
6. Return matched rules and status

**Template Variable Substitution**:
- Variables defined in template
- Values provided in variableValues
- Condition template rendered with values
- Action template rendered with values
