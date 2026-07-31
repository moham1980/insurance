# Submission Placement Service - Endpoint Catalog

**Service**: submission-placement-service  
**Purpose**: Submission management, RFQ, placement, and carrier connector configuration  
**Base Path**: `/api/v1`

---

## Controllers Overview

1. **submission.controller.ts** - Submission operations (create, list, get, update, submit, expire)
2. **placement.controller.ts** - Placement operations (select quote, create, bind, retry, cancel, list, get)
3. **rfq.controller.ts** - RFQ operations (request quote, list requests, get request)
4. **comparison.controller.ts** - Quote comparison operations
5. **connector-config.controller.ts** - Carrier connector configuration
6. **health.controller.ts** - Health check

---

## 1. submission.controller.ts

**Base Path**: `/api/v1`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### POST /api/v1/submissions
**Purpose**: Create submission  
**Permission**: `submission:submissions:create`

**Request Body**:
```json
{
  "productId": "string",
  "productVersion": 0,
  "lineOfBusiness": "string",
  "exposure": {},
  "effectiveFrom": "ISO8601",
  "effectiveTo": "ISO8601"
}
```

**Headers**:
- `X-Correlation-Id` (optional)
- `X-Idempotency-Key` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "submissionId": "UUID",
    "tenantId": "string",
    "status": "draft|submitted|expired",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /api/v1/submissions
**Purpose**: List submissions  
**Permission**: `submission:submissions:list`

**Query Params**:
- `status` (optional, string)
- `productId` (optional, string)
- `limit` (default: 50)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "submissionId": "UUID",
      "tenantId": "string",
      "status": "draft|submitted|expired",
      "createdAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

### GET /api/v1/submissions/:submissionId
**Purpose**: Get submission by ID  
**Permission**: `submission:submissions:view`

**Path Params**: `submissionId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "submissionId": "UUID",
    "tenantId": "string",
    "status": "draft|submitted|expired",
    "productId": "string",
    "exposure": {},
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### PATCH /api/v1/submissions/:submissionId
**Purpose**: Update submission  
**Permission**: `submission:submissions:update`

**Path Params**: `submissionId`

**Request Body**:
```json
{
  "exposure": {},
  "effectiveFrom": "ISO8601",
  "effectiveTo": "ISO8601"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "submissionId": "UUID",
    "tenantId": "string",
    "status": "draft",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /api/v1/submissions/:submissionId/submit
**Purpose**: Submit submission  
**Permission**: `submission:submissions:submit`

**Path Params**: `submissionId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "submissionId": "UUID",
    "status": "submitted",
    "submittedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /api/v1/submissions/:submissionId/expire
**Purpose**: Expire submission  
**Permission**: `submission:submissions:expire`

**Path Params**: `submissionId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "submissionId": "UUID",
    "status": "expired",
    "expiredAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

## 2. placement.controller.ts

**Base Path**: `/api/v1`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### POST /api/v1/quote-responses/:quoteResponseId/select
**Purpose**: Select quote response  
**Permission**: `submission:quotes:select`

**Path Params**: `quoteResponseId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "quoteResponseId": "string",
    "selected": true,
    "selectedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /api/v1/quote-responses/:quoteResponseId/placement
**Purpose**: Create placement from selected quote  
**Permission**: `submission:placement:create`

**Path Params**: `quoteResponseId`

**Headers**:
- `X-Correlation-Id` (optional)
- `X-Idempotency-Key` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "placementId": "UUID",
    "quoteResponseId": "string",
    "status": "pending",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /api/v1/placements/:placementId/bind
**Purpose**: Bind placement (execute with carrier)  
**Permission**: `submission:placement:create`

**Path Params**: `placementId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "placementId": "UUID",
    "status": "bound",
    "policyNumber": "string",
    "boundAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `BIND_FAILED` - Failed to bind with carrier
- `INVALID_STATE` - Placement not in bindable state

---

### POST /api/v1/placements/:placementId/retry
**Purpose**: Retry failed placement  
**Permission**: `submission:placement:retry`

**Path Params**: `placementId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "placementId": "UUID",
    "status": "pending",
    "retryCount": 1,
    "retriedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /api/v1/placements/:placementId/cancel
**Purpose**: Cancel placement  
**Permission**: `submission:placement:cancel`

**Path Params**: `placementId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "placementId": "UUID",
    "status": "cancelled",
    "cancelledAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /api/v1/placements
**Purpose**: List placements  
**Permission**: `submission:placement:view`

**Query Params**:
- `status` (optional, string)
- `submissionId` (optional, string)
- `limit` (default: 50)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "placementId": "UUID",
      "submissionId": "string",
      "status": "pending|bound|failed|cancelled",
      "createdAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

### GET /api/v1/placements/:placementId
**Purpose**: Get placement by ID  
**Permission**: `submission:placement:view`

**Path Params**: `placementId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "placementId": "UUID",
    "submissionId": "string",
    "status": "pending|bound|failed|cancelled",
    "policyNumber": "string",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

## 3. rfq.controller.ts

**Base Path**: `/api/v1`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### POST /api/v1/submissions/:submissionId/quotes/request
**Purpose**: Request quotes from carriers  
**Permission**: `submission:quotes:request`

**Path Params**: `submissionId`

**Request Body**:
```json
{
  "carrierOrganizationIds": [],
  "priority": "normal|high"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "quoteRequestId": "UUID",
    "submissionId": "string",
    "status": "pending",
    "requestedCarriers": [],
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /api/v1/submissions/:submissionId/quotes
**Purpose**: List quote requests for submission  
**Permission**: `submission:quotes:view`

**Path Params**: `submissionId`

**Query Params**:
- `status` (optional, string)
- `limit` (default: 50)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "quoteRequestId": "UUID",
      "submissionId": "string",
      "status": "pending|completed|failed",
      "createdAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

### GET /api/v1/quote-requests/:quoteRequestId
**Purpose**: Get quote request by ID  
**Permission**: `submission:quotes:view`

**Path Params**: `quoteRequestId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "quoteRequestId": "UUID",
    "submissionId": "string",
    "status": "pending|completed|failed",
    "quoteResponses": [],
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

## 4. comparison.controller.ts

**Base Path**: `/api/v1`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### POST /api/v1/quote-requests/:quoteRequestId/compare
**Purpose**: Compare quote responses  
**Permission**: `submission:quotes:compare`

**Path Params**: `quoteRequestId`

**Request Body**:
```json
{
  "weights": {
    "price": 0.5,
    "coverage": 0.3,
    "carrier": 0.2
  }
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "quoteRequestId": "string",
    "comparisons": [
      {
        "quoteResponseId": "string",
        "score": 0.95,
        "rank": 1,
        "price": 0,
        "coverage": {},
        "carrier": "string"
      }
    ],
    "correlationId": "string"
  }
}
```

---

### GET /api/v1/quote-requests/:quoteRequestId/compare
**Purpose**: Get comparison (default weights)  
**Permission**: `submission:quotes:compare`

**Path Params**: `quoteRequestId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "quoteRequestId": "string",
    "comparisons": [],
    "correlationId": "string"
  }
}
```

---

## 5. connector-config.controller.ts

**Base Path**: `/api/v1`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### POST /api/v1/carrier-connectors
**Purpose**: Create carrier connector configuration  
**Permission**: `submission:connectors:configure`

**Request Body**:
```json
{
  "carrierOrganizationId": "string (required)",
  "connectorType": "sanhab|manual|api (required)",
  "config": {},
  "enabled": true
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "connectorId": "UUID",
    "tenantId": "string",
    "carrierOrganizationId": "string",
    "connectorType": "sanhab",
    "enabled": true,
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /api/v1/carrier-connectors
**Purpose**: List carrier connectors  
**Permission**: `submission:connectors:view`

**Query Params**:
- `carrierOrganizationId` (optional, string)
- `connectorType` (optional, string)
- `enabled` (optional, boolean)
- `limit` (default: 50)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "connectorId": "UUID",
      "tenantId": "string",
      "carrierOrganizationId": "string",
      "connectorType": "sanhab",
      "enabled": true,
      "createdAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

### GET /api/v1/carrier-connectors/:connectorId
**Purpose**: Get connector by ID  
**Permission**: `submission:connectors:view`

**Path Params**: `connectorId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "connectorId": "UUID",
    "tenantId": "string",
    "carrierOrganizationId": "string",
    "connectorType": "sanhab",
    "config": {},
    "enabled": true,
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### PUT /api/v1/carrier-connectors/:connectorId
**Purpose**: Update connector configuration  
**Permission**: `submission:connectors:configure`

**Path Params**: `connectorId`

**Request Body**:
```json
{
  "config": {},
  "enabled": true
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "connectorId": "UUID",
    "tenantId": "string",
    "carrierOrganizationId": "string",
    "connectorType": "sanhab",
    "config": {},
    "enabled": true,
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /api/v1/carrier-connectors/:carrierOrganizationId/health
**Purpose**: Check connector health  
**Permission**: `submission:connectors:view`

**Path Params**: `carrierOrganizationId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "healthy": true,
    "connectorType": "sanhab",
    "connectorId": "UUID"
  },
  "correlationId": "string"
}
```

**Errors**:
- No active connector → `success: false`, `healthy: false`, `reason: "No active connector"`

---

### POST /api/v1/carrier-connectors/:carrierOrganizationId/test
**Purpose**: Test connector with carrier  
**Permission**: `submission:connectors:configure`

**Path Params**: `carrierOrganizationId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "connectorType": "sanhab",
    "status": "success",
    "testedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NO_CONNECTOR` - No active connector for carrier
- `TEST_FAILED` - Test failed with error message

---

## 6. health.controller.ts

### GET /health
**Purpose**: Health check for submission-placement-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok",
  "service": "submission-placement-service",
  "version": "1.0.0"
}
```

---

### GET /ready
**Purpose**: Readiness check  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ready"
}
```

---

## Summary

**Total Endpoints**: 25

**By Controller**:
- submission.controller.ts: 6
- placement.controller.ts: 7
- rfq.controller.ts: 3
- comparison.controller.ts: 2
- connector-config.controller.ts: 6
- health.controller.ts: 2

**Submission Lifecycle**:
1. Create → `/api/v1/submissions`
2. List → `/api/v1/submissions`
3. Get → `/api/v1/submissions/:submissionId`
4. Update → `/api/v1/submissions/:submissionId`
5. Submit → `/api/v1/submissions/:submissionId/submit`
6. Expire → `/api/v1/submissions/:submissionId/expire`

**RFQ Lifecycle**:
1. Request → `/api/v1/submissions/:submissionId/quotes/request`
2. List → `/api/v1/submissions/:submissionId/quotes`
3. Get → `/api/v1/quote-requests/:quoteRequestId`

**Placement Lifecycle**:
1. Select Quote → `/api/v1/quote-responses/:quoteResponseId/select`
2. Create → `/api/v1/quote-responses/:quoteResponseId/placement`
3. Bind → `/api/v1/placements/:placementId/bind`
4. Retry → `/api/v1/placements/:placementId/retry`
5. Cancel → `/api/v1/placements/:placementId/cancel`
6. List → `/api/v1/placements`
7. Get → `/api/v1/placements/:placementId`

**Comparison**:
1. Compare (POST) → `/api/v1/quote-requests/:quoteRequestId/compare`
2. Compare (GET) → `/api/v1/quote-requests/:quoteRequestId/compare`

**Connector Configuration**:
1. Create → `/api/v1/carrier-connectors`
2. List → `/api/v1/carrier-connectors`
3. Get → `/api/v1/carrier-connectors/:connectorId`
4. Update → `/api/v1/carrier-connectors/:connectorId`
5. Health → `/api/v1/carrier-connectors/:carrierOrganizationId/health`
6. Test → `/api/v1/carrier-connectors/:carrierOrganizationId/test`

**Permissions**:
- `submission:submissions:create` - Create submissions
- `submission:submissions:list` - List submissions
- `submission:submissions:view` - View submissions
- `submission:submissions:update` - Update submissions
- `submission:submissions:submit` - Submit submissions
- `submission:submissions:expire` - Expire submissions
- `submission:quotes:select` - Select quotes
- `submission:quotes:request` - Request quotes
- `submission:quotes:view` - View quotes
- `submission:quotes:compare` - Compare quotes
- `submission:placement:create` - Create/bind placements
- `submission:placement:retry` - Retry placements
- `submission:placement:cancel` - Cancel placements
- `submission:placement:view` - View placements
- `submission:connectors:configure` - Configure connectors
- `submission:connectors:view` - View connectors

**Authentication**:
- All endpoints except `/health` and `/ready` use JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**Connector Types**:
- sanhab - Sanhab integration
- manual - Manual processing
- api - Generic API connector

**Status Types**:
- Submission: draft, submitted, expired
- Placement: pending, bound, failed, cancelled
- Quote Request: pending, completed, failed
