# Feature Flags Service - Endpoint Catalog

**Service**: feature-flags-service  
**Purpose**: Feature flag management for gradual rollouts and A/B testing  
**Base Path**: `/`

---

## Controllers Overview

1. **feature-flags.controller.ts** - Feature flag operations (list, get, upsert)
2. **health.controller.ts** - Health check

---

## 1. feature-flags.controller.ts

**Base Path**: `/`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (all endpoints except /health)

### GET /health
**Purpose**: Health check for feature-flags-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok",
  "service": "feature-flags-service"
}
```

---

### GET /feature-flags
**Purpose**: List all feature flags  
**Permission**: `feature_flags:view`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "name": "string",
      "isEnabled": true,
      "description": "string",
      "rolloutPercentage": 0,
      "targetAudience": "string",
      "updatedAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

### GET /feature-flags/:key
**Purpose**: Get feature flag by key  
**Permission**: `feature_flags:view`

**Path Params**: `key`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "name": "string",
    "isEnabled": true,
    "description": "string",
    "rolloutPercentage": 0,
    "targetAudience": "string",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Feature flag not found

---

### PUT /feature-flags/:key
**Purpose**: Create or update feature flag  
**Permission**: `feature_flags:manage`

**Path Params**: `key`

**Request Body**:
```json
{
  "isEnabled": true,
  "description": "string",
  "rolloutPercentage": 0,
  "targetAudience": "string"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "name": "string",
    "isEnabled": true,
    "description": "string",
    "rolloutPercentage": 0,
    "targetAudience": "string",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - isEnabled is required (boolean)

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for feature-flags-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "feature-flags-service",
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

**Total Endpoints**: 4

**By Controller**:
- feature-flags.controller.ts: 3
- health.controller.ts: 1

**Feature Flag Lifecycle**:
1. List → `/feature-flags`
2. Get → `/feature-flags/:key`
3. Upsert → `/feature-flags/:key`

**Permissions**:
- `feature_flags:view` - View feature flags
- `feature_flags:manage` - Create/update feature flags

**Authentication**:
- All endpoints except `/health` use JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**Feature Flag Properties**:
- `name` - Unique key for the flag
- `isEnabled` - Whether the flag is enabled
- `description` - Human-readable description
- `rolloutPercentage` - Percentage of users who should see the feature (0-100)
- `targetAudience` - Target audience segment
- `updatedAt` - Last update timestamp
