# Model Switchboard Service - Endpoint Catalog

**Service**: model-switchboard-service  
**Purpose**: AI model routing, invocation, governance, and A/B testing  
**Base Path**: `/model-switchboard`

---

## Controllers Overview

1. **model-switchboard.controller.ts** - Model operations (CRUD, routing, usage, governance, A/B testing)
2. **health.controller.ts** - Health check

---

## 1. model-switchboard.controller.ts

**Base Path**: `/model-switchboard`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (all endpoints except /health)

## Model CRUD Endpoints

### POST /model-switchboard/models
**Purpose**: Register AI model  
**Permission**: `switchboard:manage_models`

**Request Body**:
```json
{
  "tenantId": "string (required)",
  "name": "string (required)",
  "modelKey": "string (required)",
  "modelType": "ModelType (required)",
  "description": "string",
  "config": {
    "endpoint": "string",
    "provider": "string",
    "version": "string",
    "parameters": {},
    "capabilities": []
  },
  "priority": 0,
  "metadata": {}
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

### PUT /model-switchboard/models/:id/activate
**Purpose**: Activate model  
**Permission**: `switchboard:manage_models`

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

### GET /model-switchboard/models/:id
**Purpose**: Get model by ID  
**Permission**: `switchboard:manage_models`

**Path Params**: `id`

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- `NOT_FOUND` - Model not found

---

### GET /model-switchboard/models
**Purpose**: List models  
**Permission**: `switchboard:manage_models`

**Query Params**:
- `tenantId` (optional, string)
- `modelType` (optional, ModelType)
- `status` (optional, ModelStatus)
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

## Invocation Endpoints

### POST /model-switchboard/invoke
**Purpose**: Invoke model  
**Permission**: `switchboard:route`

**Request Body**:
```json
{
  "tenantId": "string (required)",
  "modelType": "ModelType (required)",
  "capability": "string",
  "businessKey": "string",
  "input": {},
  "metadata": {},
  "skipGovernance": false
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

### GET /model-switchboard/invocations
**Purpose**: List invocations  
**Permission**: `switchboard:view_usage`

**Query Params**:
- `tenantId` (optional, string)
- `modelKey` (optional, string)
- `businessKey` (optional, string)
- `status` (optional, InvocationStatus)
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

## Route Policy Endpoints

### POST /model-switchboard/policies
**Purpose**: Create route policy  
**Permission**: `switchboard:manage_policies`

**Request Body**:
```json
{
  "capability": "string (required)",
  "tenantId": "string",
  "primaryModel": "string (required)",
  "fallbackChain": [],
  "qualityThreshold": 0,
  "costBudgetPerDay": 0,
  "routingStrategy": "RoutingStrategy",
  "metadata": {},
  "abTestEnabled": false,
  "abTestModelId": "string",
  "abTestSplitPercent": 0
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

### GET /model-switchboard/policies
**Purpose**: List route policies  
**Permission**: `switchboard:manage_policies`

**Query Params**:
- `capability` (optional, string)
- `tenantId` (optional, string)
- `isActive` (optional, boolean)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 0
  }
}
```

---

### GET /model-switchboard/policies/:id
**Purpose**: Get route policy by ID  
**Permission**: `switchboard:manage_policies`

**Path Params**: `id`

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- `NOT_FOUND` - RoutePolicy not found

---

### PUT /model-switchboard/policies/:id
**Purpose**: Update route policy  
**Permission**: `switchboard:manage_policies`

**Path Params**: `id`

**Request Body**:
```json
{
  "capability": "string",
  "tenantId": "string",
  "primaryModel": "string",
  "fallbackChain": [],
  "qualityThreshold": 0,
  "costBudgetPerDay": 0,
  "routingStrategy": "RoutingStrategy",
  "metadata": {},
  "isActive": true,
  "abTestEnabled": false,
  "abTestModelId": "string",
  "abTestSplitPercent": 0
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

---

### DELETE /model-switchboard/policies/:id
**Purpose**: Delete route policy  
**Permission**: `switchboard:admin`

**Path Params**: `id`

**Response**: 204 No Content

---

## Routing Endpoints

### POST /model-switchboard/route
**Purpose**: Route request to appropriate model  
**Permission**: `switchboard:route`

**Request Body**:
```json
{
  "capability": "string (required)",
  "tenantId": "string"
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

## Usage Endpoints

### POST /model-switchboard/record-usage
**Purpose**: Record model usage  
**Permission**: `switchboard:record_usage`

**Request Body**:
```json
{
  "modelId": "string (required)",
  "tenantId": "string",
  "capability": "string (required)",
  "inputTokens": 0,
  "outputTokens": 0,
  "costMicroCents": 0,
  "latencyMs": 0,
  "qualityScore": 0,
  "requestId": "string",
  "metadata": {}
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

### GET /model-switchboard/usage
**Purpose**: Get usage report  
**Permission**: `switchboard:view_usage`

**Query Params**:
- `tenantId` (optional, string)
- `modelId` (optional, string)
- `capability` (optional, string)
- `periodStart` (optional, ISO8601)
- `periodEnd` (optional, ISO8601)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 0
  }
}
```

---

### GET /model-switchboard/usage/summary
**Purpose**: Get usage summary  
**Permission**: `switchboard:view_usage`

**Query Params**:
- `tenantId` (optional, string)
- `periodStart` (optional, ISO8601)
- `periodEnd` (optional, ISO8601)

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

---

## Model Card Endpoints

### POST /model-switchboard/model-cards
**Purpose**: Create model card  
**Permission**: `switchboard:manage`

**Request Body**:
```json
{
  "modelId": "string",
  "version": "string",
  "modelDetails": {},
  "intendedUse": "string",
  "limitations": "string",
  "trainingData": {},
  "evaluationMetrics": {},
  "ethicalConsiderations": "string",
  "citations": []
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

### GET /model-switchboard/model-cards
**Purpose**: List model cards  
**Permission**: `switchboard:view`

**Query Params**:
- `status` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 0
  }
}
```

---

### GET /model-switchboard/model-cards/:modelId
**Purpose**: Get model card by model ID  
**Permission**: `switchboard:view`

**Path Params**: `modelId`

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- `NOT_FOUND` - Model card not found

---

### PATCH /model-switchboard/model-cards/:id
**Purpose**: Update model card  
**Permission**: `switchboard:manage`

**Path Params**: `id`

**Request Body**:
```json
{
  "modelDetails": {},
  "intendedUse": "string",
  "limitations": "string",
  "trainingData": {},
  "evaluationMetrics": {},
  "ethicalConsiderations": "string",
  "citations": []
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- `NOT_FOUND` - Model card not found

---

### POST /model-switchboard/model-cards/:id/approve
**Purpose**: Approve model card  
**Permission**: `switchboard:manage`

**Path Params**: `id`

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- `NOT_FOUND` - Model card not found

---

### POST /model-switchboard/model-cards/:id/deprecate
**Purpose**: Deprecate model card  
**Permission**: `switchboard:manage`

**Path Params**: `id`

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- `NOT_FOUND` - Model card not found

---

## Governance Endpoints

### POST /model-switchboard/governance/validate
**Purpose**: Validate model governance  
**Permission**: `switchboard:view`

**Request Body**:
```json
{
  "modelKey": "string (required)",
  "tenantId": "string"
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

### GET /model-switchboard/governance/report
**Purpose**: Get governance report  
**Permission**: `switchboard:view_usage`

**Query Params**:
- `tenantId` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

---

## Health & Monitoring Endpoints

### GET /model-switchboard/health
**Purpose**: Health check for model-switchboard-service  
**Auth**: None (public)

**Response**:
```json
{
  "success": true,
  "data": {
    "service": "model-switchboard-service",
    "models": { ... },
    "timestamp": "ISO8601"
  }
}
```

---

### GET /model-switchboard/circuit-breaker/:modelKey
**Purpose**: Get circuit breaker state  
**Permission**: `switchboard:view`

**Path Params**: `modelKey`

**Response**:
```json
{
  "success": true,
  "data": {
    "modelKey": "string",
    ...
  }
}
```

---

### GET /model-switchboard/ab-test/:policyId/report
**Purpose**: Get A/B test report  
**Permission**: `switchboard:view`

**Path Params**: `policyId`

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for model-switchboard-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "model-switchboard-service",
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

**Total Endpoints**: 24

**By Controller**:
- model-switchboard.controller.ts: 23
- health.controller.ts: 1

**Model Lifecycle**:
1. Register → `/model-switchboard/models`
2. Activate → `/model-switchboard/models/:id/activate`
3. Get → `/model-switchboard/models/:id`
4. List → `/model-switchboard/models`

**Invocation**:
1. Invoke → `/model-switchboard/invoke`
2. List Invocations → `/model-switchboard/invocations`

**Route Policy Lifecycle**:
1. Create → `/model-switchboard/policies`
2. List → `/model-switchboard/policies`
3. Get → `/model-switchboard/policies/:id`
4. Update → `/model-switchboard/policies/:id`
5. Delete → `/model-switchboard/policies/:id`

**Routing**:
1. Route → `/model-switchboard/route`

**Usage**:
1. Record → `/model-switchboard/record-usage`
2. Report → `/model-switchboard/usage`
3. Summary → `/model-switchboard/usage/summary`

**Model Card Lifecycle**:
1. Create → `/model-switchboard/model-cards`
2. List → `/model-switchboard/model-cards`
3. Get → `/model-switchboard/model-cards/:modelId`
4. Update → `/model-switchboard/model-cards/:id`
5. Approve → `/model-switchboard/model-cards/:id/approve`
6. Deprecate → `/model-switchboard/model-cards/:id/deprecate`

**Governance**:
1. Validate → `/model-switchboard/governance/validate`
2. Report → `/model-switchboard/governance/report`

**Monitoring**:
1. Health → `/model-switchboard/health`
2. Circuit Breaker → `/model-switchboard/circuit-breaker/:modelKey`
3. A/B Test Report → `/model-switchboard/ab-test/:policyId/report`

**Permissions**:
- `switchboard:manage_models` - Manage models
- `switchboard:route` - Route and invoke models
- `switchboard:view_usage` - View usage and invocations
- `switchboard:manage_policies` - Manage route policies
- `switchboard:admin` - Delete route policies
- `switchboard:manage` - Manage model cards
- `switchboard:view` - View model cards, governance, circuit breaker, A/B tests

**Status Types**:
- ModelType: classification, regression, generative, embedding, custom
- ModelStatus: draft, active, deprecated, retired
- InvocationStatus: pending, success, failed, timeout
- RoutingStrategy: round_robin, priority, cost_optimized, quality_optimized, ab_test

**Authentication**:
- All endpoints except `/health` use JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard
