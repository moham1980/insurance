# Regulatory Gateway Service - Endpoint Catalog

**Service**: regulatory-gateway-service  
**Purpose**: Regulatory compliance, Sanhab integration, warehouse fire inquiries, SMS inquiries, broker license validation  
**Base Path**: `/`

---

## Controllers Overview

1. **regulatory.controller.ts** - Regulatory operations (Sanhab webhook, simulate, inquiry, events, circuit breaker, warehouse fire, SMS inquiries, broker license validation)
2. **health.controller.ts** - Health check with database, Sanhab, and Kafka connectivity

---

## 1. regulatory.controller.ts

**Base Path**: `/reg`  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard (except public endpoints)

## Sanhab Integration Endpoints

### POST /reg/sanhab/webhook
**Purpose**: Handle Sanhab webhook callbacks  
**Auth**: None (public)  
**Permission**: None

**Request Body**:
```json
{
  "event": "string",
  "data": {}
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
- HTTP status varies based on webhook processing
- Response body depends on Sanhab webhook format

---

### POST /reg/sanhab/simulate
**Purpose**: Simulate Sanhab request (for testing)  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:retry`

**Request Body**:
```json
{
  "inquiryType": "string",
  "params": {}
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
- HTTP status varies based on simulation result
- Response body depends on inquiry type

---

### POST /reg/sanhab/inquiry
**Purpose**: Submit Sanhab inquiry  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:inquiry`

**Request Body**:
```json
{
  "inquiryType": "string",
  "params": {}
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
- HTTP status varies based on inquiry result
- Response body depends on inquiry type

---

### GET /reg/sanhab/events
**Purpose**: List Sanhab events  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:events:list`

**Query Params**:
- `limit` (default: 50, max: 200)
- `offset` (default: 0)
- `eventType` (optional, string)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "rows": [
      {
        "eventId": "string",
        "eventType": "string",
        "status": "pending|completed|failed",
        "createdAt": "ISO8601"
      }
    ],
    "total": 0,
    "limit": 50,
    "offset": 0
  },
  "correlationId": "string"
}
```

---

## Circuit Breaker Endpoints

### GET /reg/sanhab/circuit-breaker
**Purpose**: Get circuit breaker status  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:events:view`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "state": "closed|open|half_open",
    "failureCount": 0,
    "successCount": 0,
    "lastFailureTime": "ISO8601",
    "lastStateChangeTime": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### PUT /reg/sanhab/circuit-breaker/reset
**Purpose**: Reset circuit breaker  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:retry`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Circuit breaker reset successfully"
  },
  "correlationId": "string"
}
```

---

### GET /reg/sanhab/health-check
**Purpose**: Sanhab health check  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:events:view`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "healthy": true,
    "lastCheckTime": "ISO8601",
    "responseTimeMs": 0
  },
  "correlationId": "string"
}
```

---

## Warehouse Fire Inquiry Endpoints

### POST /reg/warehouse-fire/inquire
**Purpose**: Warehouse fire inquiry  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:inquiry`

**Request Body**:
```json
{
  "warehouseId": "string",
  "nationalId": "string",
  "licenseNumber": "string",
  "address": "string",
  "city": "string",
  "province": "string",
  "inquiryType": "FIRE_HISTORY|CURRENT_STATUS|INSPECTION_REPORT|COMPLIANCE_CHECK"
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
    "inquiryType": "FIRE_HISTORY|CURRENT_STATUS|INSPECTION_REPORT|COMPLIANCE_CHECK",
    "result": {},
    "queriedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /reg/warehouse-fire/national-id/:nationalId
**Purpose**: Warehouse fire inquiry by national ID  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:inquiry`

**Path Params**: `nationalId`

**Query Params**:
- `inquiryType` (default: FIRE_HISTORY)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "nationalId": "string",
    "inquiryType": "FIRE_HISTORY|CURRENT_STATUS|INSPECTION_REPORT|COMPLIANCE_CHECK",
    "result": {},
    "queriedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /reg/warehouse-fire/license/:licenseNumber
**Purpose**: Warehouse fire inquiry by license number  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:inquiry`

**Path Params**: `licenseNumber`

**Query Params**:
- `inquiryType` (default: FIRE_HISTORY)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "licenseNumber": "string",
    "inquiryType": "FIRE_HISTORY|CURRENT_STATUS|INSPECTION_REPORT|COMPLIANCE_CHECK",
    "result": {},
    "queriedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /reg/warehouse-fire/warehouse/:warehouseId
**Purpose**: Warehouse fire inquiry by warehouse ID  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:inquiry`

**Path Params**: `warehouseId`

**Query Params**:
- `inquiryType` (default: FIRE_HISTORY)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "warehouseId": "string",
    "inquiryType": "FIRE_HISTORY|CURRENT_STATUS|INSPECTION_REPORT|COMPLIANCE_CHECK",
    "result": {},
    "queriedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /reg/warehouse-fire/health-check
**Purpose**: Warehouse fire service health check  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:events:view`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "healthy": true,
    "lastCheckTime": "ISO8601",
    "responseTimeMs": 0
  },
  "correlationId": "string"
}
```

---

### GET /reg/warehouse-fire/config
**Purpose**: Get warehouse fire service configuration  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:events:view`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "apiUrl": "string",
    "enabled": true,
    "timeoutMs": 5000
  },
  "correlationId": "string"
}
```

---

### PUT /reg/warehouse-fire/config
**Purpose**: Update warehouse fire service configuration  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:retry`

**Request Body**:
```json
{
  "apiUrl": "string",
  "apiKey": "string",
  "timeoutMs": 5000,
  "enabled": true
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
    "apiUrl": "string",
    "enabled": true,
    "timeoutMs": 5000
  },
  "correlationId": "string"
}
```

---

## Sanhab SMS Inquiry Endpoints

### POST /reg/sanhab/sms/initiate
**Purpose**: Initiate SMS inquiry  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:inquiry`

**Request Body**:
```json
{
  "phoneNumber": "string",
  "inquiryType": "NATIONAL_ID_UNIQUE_CODE|POLICY_NUMBER|VIN",
  "nationalId": "string",
  "uniqueCode": "string",
  "policyNumber": "string",
  "vin": "string"
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
    "inquiryId": "string",
    "phoneNumber": "string",
    "inquiryType": "NATIONAL_ID_UNIQUE_CODE|POLICY_NUMBER|VIN",
    "status": "pending",
    "initiatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /reg/sanhab/sms/reply
**Purpose**: Handle SMS reply (public endpoint for SMS provider callback)  
**Auth**: None (public)  
**Permission**: None

**Request Body**:
```json
{
  "from": "string",
  "message": "string"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "inquiryId": "string",
    "status": "completed",
    "result": {}
  },
  "correlationId": "string"
}
```

---

### GET /reg/sanhab/sms/inquiry/:inquiryId
**Purpose**: Get SMS inquiry by ID  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:events:view`

**Path Params**: `inquiryId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "inquiryId": "string",
    "phoneNumber": "string",
    "inquiryType": "NATIONAL_ID_UNIQUE_CODE|POLICY_NUMBER|VIN",
    "status": "pending|completed|cancelled|failed",
    "result": {},
    "initiatedAt": "ISO8601",
    "completedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Inquiry not found

---

### GET /reg/sanhab/sms/pending/:phoneNumber
**Purpose**: Get pending SMS inquiries by phone number  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:events:view`

**Path Params**: `phoneNumber`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "inquiryId": "string",
      "phoneNumber": "string",
      "inquiryType": "NATIONAL_ID_UNIQUE_CODE|POLICY_NUMBER|VIN",
      "status": "pending",
      "initiatedAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

### POST /reg/sanhab/sms/inquiry/:inquiryId/cancel
**Purpose**: Cancel SMS inquiry  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:retry`

**Path Params**: `inquiryId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Inquiry cancelled"
  },
  "correlationId": "string"
}
```

---

### GET /reg/sanhab/sms/health-check
**Purpose**: Sanhab SMS service health check  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:events:view`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "healthy": true,
    "lastCheckTime": "ISO8601",
    "responseTimeMs": 0
  },
  "correlationId": "string"
}
```

---

### GET /reg/sanhab/sms/config
**Purpose**: Get SMS inquiry service configuration  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:events:view`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "smsProvider": "KAVENEGAR|TWILIO|MELLIPAYAMAK",
    "shortCode": "string",
    "timeoutMs": 5000,
    "maxRetries": 3
  },
  "correlationId": "string"
}
```

---

### PUT /reg/sanhab/sms/config
**Purpose**: Update SMS inquiry service configuration  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:retry`

**Request Body**:
```json
{
  "enabled": true,
  "smsProvider": "KAVENEGAR|TWILIO|MELLIPAYAMAK",
  "shortCode": "string",
  "apiKey": "string",
  "timeoutMs": 5000,
  "maxRetries": 3
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
    "enabled": true,
    "smsProvider": "KAVENEGAR|TWILIO|MELLIPAYAMAK",
    "shortCode": "string",
    "timeoutMs": 5000,
    "maxRetries": 3
  },
  "correlationId": "string"
}
```

---

## Broker License Validation Endpoints

### POST /reg/broker-license/validate
**Purpose**: Validate broker license  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `regulatory:inquiry`

**Request Body**:
```json
{
  "brokerCentralCode": "string",
  "licenseNumber": "string",
  "licenseType": "life|non_life|both",
  "scope": ["string"]
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
    "valid": true,
    "brokerCentralCode": "string",
    "licenseNumber": "string",
    "licenseType": "life|non_life|both",
    "scope": ["string"],
    "expiryDate": "ISO8601",
    "validatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for regulatory-gateway-service with database, Sanhab, and Kafka connectivity  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "regulatory-gateway-service",
  "timestamp": "ISO8601",
  "uptime": 0,
  "components": {
    "db": "ok|error",
    "sanhab": "ok|degraded|error",
    "kafka": "ok|error|timeout|not_configured|invalid_config"
  }
}
```

**Errors**:
- `degraded` status returned if any component is in error or degraded state
- Kafka health check uses TCP connection to first broker with 2s timeout

---

## Summary

**Total Endpoints**: 24

**By Controller**:
- regulatory.controller.ts: 23
- health.controller.ts: 1

**Authentication**:
- `/health` - Public
- `/reg/sanhab/webhook` - Public (webhook endpoint)
- `/reg/sanhab/sms/reply` - Public (SMS provider callback)
- All other endpoints use JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard

**Sanhab Integration**:
1. Webhook → `/reg/sanhab/webhook` (public)
2. Simulate → `/reg/sanhab/simulate` (permission: `regulatory:retry`)
3. Inquiry → `/reg/sanhab/inquiry` (permission: `regulatory:inquiry`)
4. List Events → `/reg/sanhab/events` (permission: `regulatory:events:list`)

**Circuit Breaker**:
1. Get Status → `/reg/sanhab/circuit-breaker` (permission: `regulatory:events:view`)
2. Reset → `/reg/sanhab/circuit-breaker/reset` (permission: `regulatory:retry`)
3. Health Check → `/reg/sanhab/health-check` (permission: `regulatory:events:view`)

**Warehouse Fire Inquiry**:
1. Inquire → `/reg/warehouse-fire/inquire` (permission: `regulatory:inquiry`)
2. By National ID → `/reg/warehouse-fire/national-id/:nationalId` (permission: `regulatory:inquiry`)
3. By License → `/reg/warehouse-fire/license/:licenseNumber` (permission: `regulatory:inquiry`)
4. By Warehouse ID → `/reg/warehouse-fire/warehouse/:warehouseId` (permission: `regulatory:inquiry`)
5. Health Check → `/reg/warehouse-fire/health-check` (permission: `regulatory:events:view`)
6. Get Config → `/reg/warehouse-fire/config` (permission: `regulatory:events:view`)
7. Update Config → `/reg/warehouse-fire/config` (permission: `regulatory:retry`)

**Sanhab SMS Inquiry**:
1. Initiate → `/reg/sanhab/sms/initiate` (permission: `regulatory:inquiry`)
2. Handle Reply → `/reg/sanhab/sms/reply` (public)
3. Get Inquiry → `/reg/sanhab/sms/inquiry/:inquiryId` (permission: `regulatory:events:view`)
4. Pending by Phone → `/reg/sanhab/sms/pending/:phoneNumber` (permission: `regulatory:events:view`)
5. Cancel → `/reg/sanhab/sms/inquiry/:inquiryId/cancel` (permission: `regulatory:retry`)
6. Health Check → `/reg/sanhab/sms/health-check` (permission: `regulatory:events:view`)
7. Get Config → `/reg/sanhab/sms/config` (permission: `regulatory:events:view`)
8. Update Config → `/reg/sanhab/sms/config` (permission: `regulatory:retry`)

**Broker License Validation**:
1. Validate → `/reg/broker-license/validate` (permission: `regulatory:inquiry`)

**Permissions**:
- `regulatory:retry` - Retry operations, reset circuit breaker, update configurations
- `regulatory:inquiry` - Submit inquiries (Sanhab, warehouse fire, SMS, broker license)
- `regulatory:events:list` - List Sanhab events
- `regulatory:events:view` - View circuit breaker status, health checks, configurations

**Circuit Breaker States**:
- closed - Normal operation
- open - Circuit is open after failures
- half_open - Testing if service has recovered

**Warehouse Fire Inquiry Types**:
- FIRE_HISTORY - Fire history
- CURRENT_STATUS - Current status
- INSPECTION_REPORT - Inspection report
- COMPLIANCE_CHECK - Compliance check

**SMS Inquiry Types**:
- NATIONAL_ID_UNIQUE_CODE - National ID unique code
- POLICY_NUMBER - Policy number
- VIN - Vehicle identification number

**SMS Providers**:
- KAVENEGAR - Kavenegar
- TWILIO - Twilio
- MELLIPAYAMAK - Mellipayamak

**SMS Inquiry Status**:
- pending - Pending
- completed - Completed
- cancelled - Cancelled
- failed - Failed

**Broker License Types**:
- life - Life insurance
- non_life - Non-life insurance
- both - Both

**Pagination**:
- Default limit: 50
- Maximum limit: 200
- Default offset: 0

**Circuit Breaker**:
- Protects against cascading failures
- Tracks failure and success counts
- Can be reset manually via API
- State transitions: closed → open → half_open → closed

**Health Checks**:
- Database connectivity check
- Sanhab API health check
- Warehouse fire service health check
- SMS service health check
- Kafka broker reachability (TCP connection)

**Configuration Management**:
- Warehouse fire service: apiUrl, apiKey, timeoutMs, enabled
- SMS service: enabled, smsProvider, shortCode, apiKey, timeoutMs, maxRetries
- Runtime configuration updates via PUT endpoints

**Webhook Handling**:
- Sanhab webhook endpoint is public
- Normalizes headers (array to string)
- Returns HTTP status based on webhook processing

**SMS Inquiry Flow**:
1. Initiate inquiry with phone number and inquiry type
2. SMS sent to user requesting information
3. User replies via SMS
4. SMS reply handled by public endpoint
5. Inquiry marked as completed with result
6. Can cancel pending inquiries

**Correlation IDs**:
- All endpoints support X-Correlation-Id header
- Auto-generated if not provided
- Used for tracing across services
