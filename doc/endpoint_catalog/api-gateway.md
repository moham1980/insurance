# API Gateway - Endpoint Catalog

**Service**: api-gateway  
**Purpose**: Reverse proxy with circuit breaker, rate limiting, JWT verification, and tenant routing  
**Base Path**: `/`

---

## Controllers Overview

1. **health.controller.ts** - Health checks and circuit breaker admin endpoints
2. **main.ts** - Proxy logic (no direct REST endpoints - transparent proxying)

---

## 1. health.controller.ts

**Base Path**: `/`  
**Auth**: AdminGuard for admin endpoints

## Health Endpoints

### GET /health
**Purpose**: Basic health check for api-gateway  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok",
  "service": "api-gateway",
  "timestamp": "ISO8601"
}
```

---

### GET /gateway/health
**Purpose**: Basic health check for api-gateway (alias)  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok",
  "service": "api-gateway",
  "timestamp": "ISO8601"
}
```

---

### GET /health/deep
**Purpose**: Deep health check with database, Kafka, and upstream service checks  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "api-gateway",
  "timestamp": "ISO8601",
  "checks": {
    "database": {
      "status": "ok|skipped|error",
      "message": "string"
    },
    "kafka": {
      "status": "ok|skipped|error",
      "message": "string"
    },
    "auth-service": {
      "status": "ok|skipped|error",
      "message": "string"
    },
    "policy-service": {
      "status": "ok|skipped|error",
      "message": "string"
    }
  }
}
```

---

### GET /gateway/health/deep
**Purpose**: Deep health check for api-gateway (alias)  
**Auth**: None (public)

**Response**: Same as `/health/deep`

---

## Admin Endpoints

### GET /admin/circuit-breakers
**Purpose**: Get circuit breaker status for all services  
**Auth**: AdminGuard (requires admin permissions)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "serviceName": "auth-service",
      "state": "CLOSED|OPEN|HALF_OPEN",
      "failureCount": 0
    }
  ]
}
```

---

### POST /admin/circuit-breakers/:serviceName/reset
**Purpose**: Reset circuit breaker for a specific service  
**Auth**: AdminGuard (requires admin permissions)

**Path Params**: `serviceName`

**Response**:
```json
{
  "success": true,
  "message": "Circuit breaker for service auth-service has been reset"
}
```

**Errors**:
- `NO_CIRCUIT_BREAKERS` - No circuit breakers initialized
- `NOT_FOUND` - Circuit breaker for service not found

---

## 2. Proxy Behavior (main.ts)

**Base Path**: `/`  
**Auth**: JWT verification (via Bearer token) for protected routes

The API Gateway acts as a transparent reverse proxy that routes requests to downstream services based on the `SERVICE_ROUTES` configuration. It does not expose business logic endpoints directly.

### Proxy Features

**JWT Verification**:
- Verifies JWT tokens from `Authorization: Bearer <token>` header
- Extracts tenantId, userId from verified token
- Rejects requests with invalid or expired tokens (401)
- Tenant mismatch protection (403)

**Tenant Resolution**:
- Tenant from JWT token (authoritative)
- Tenant from `X-Tenant-Id` header (for public routes with tenant selection)
- Tenant from host-based brand resolution
- Default tenant from `DEFAULT_TENANT_ID` environment variable

**Rate Limiting**:
- Per-tenant and per-endpoint rate limiting
- Identity derived from verified user/tenant/IP
- Configurable via `RATE_LIMIT_MAX_PER_TENANT` and `RATE_LIMIT_WINDOW_MS`
- Redis-backed with in-memory fallback
- Returns 429 when limit exceeded

**Circuit Breaker**:
- Per-service circuit breaker with states: CLOSED, OPEN, HALF_OPEN
- Configurable failure threshold, recovery timeout, success threshold
- Redis-backed distributed state with in-memory fallback
- Returns 503 when circuit is OPEN

**Upstream Health Checks**:
- Periodic health checks on all configured upstream services
- Configurable via `UPSTREAM_HEALTH_CHECK_INTERVAL_MS`, `UPSTREAM_HEALTH_CHECK_FAILURE_THRESHOLD`, `UPSTREAM_HEALTH_CHECK_RECOVERY_MS`
- Services marked unhealthy are not routed to

**Headers Forwarded to Downstream**:
- `X-Correlation-Id` - Request correlation ID
- `X-Tenant-Id` - Tenant ID
- `X-Tenant-Context-Signature` - HMAC signature of tenant context
- `X-User-Id` - User ID (if authenticated)
- `X-AI-Enabled` - AI feature flag
- `traceparent` - Distributed tracing
- `Authorization` - Original Bearer token

**Headers Added to Response**:
- `X-Correlation-Id` - Request correlation ID
- `X-Tenant-Id` - Tenant ID
- `X-Tenant-Context-Signature` - HMAC signature of tenant context
- `X-User-Id` - User ID (if authenticated)
- `X-Brand-Key` - Brand key (if resolved from host)
- `X-AI-Enabled` - AI feature flag
- `X-RateLimit-Limit` - Rate limit
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Rate limit reset time

**Public Routes** (no JWT required):
- `/health` - Health check
- `/gateway/health` - Health check
- `/health/deep` - Deep health check
- `/gateway/health/deep` - Deep health check
- `/auth/login` - Login endpoint
- `/auth/register` - Registration endpoint
- `/auth/refresh` - Token refresh
- `/auth/forgot-password` - Password reset
- `/auth/verify-otp` - OTP verification

**Protected Routes** (JWT required):
- All other routes require valid JWT token

**Error Responses**:
- `401 UNAUTHORIZED` - Missing or invalid JWT
- `403 UNKNOWN_HOST` - Tenant cannot be resolved for this Host
- `403 TENANT_MISMATCH` - Request tenant does not match authenticated identity tenant
- `403 TENANT_MISSING_FROM_TOKEN` - Authenticated identity has no tenant
- `413 PAYLOAD_TOO_LARGE` - Request body exceeds size limit
- `429 RATE_LIMIT_EXCEEDED` - Rate limit exceeded
- `503 SERVICE_UNAVAILABLE` - Upstream service is temporarily unavailable
- `502 INVALID_UPSTREAM_RESPONSE` - Upstream returned malformed JSON

---

## Summary

**Total Endpoints**: 5

**By Controller**:
- health.controller.ts: 5
- main.ts: 0 (proxy logic only)

**Authentication**:
- `/health`, `/gateway/health`, `/health/deep`, `/gateway/health/deep` - Public
- `/admin/circuit-breakers`, `/admin/circuit-breakers/:serviceName/reset` - AdminGuard

**Health Operations**:
1. Basic Health → `/health` or `/gateway/health`
2. Deep Health → `/health/deep` or `/gateway/health/deep`

**Admin Operations**:
1. Get Circuit Breakers → `/admin/circuit-breakers`
2. Reset Circuit Breaker → `/admin/circuit-breakers/:serviceName/reset`

**Circuit Breaker States**:
- CLOSED - Normal operation
- OPEN - Circuit is open, requests are rejected
- HALF_OPEN - Testing if service has recovered

**Environment Variables**:
- `RATE_LIMIT_MAX_PER_TENANT` - Max requests per tenant (default: 100)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in ms (default: 60000)
- `CIRCUIT_BREAKER_FAILURE_THRESHOLD` - Failure threshold (default: 5)
- `CIRCUIT_BREAKER_RECOVERY_TIMEOUT` - Recovery timeout in ms (default: 60000)
- `CIRCUIT_BREAKER_SUCCESS_THRESHOLD` - Success threshold (default: 2)
- `UPSTREAM_HEALTH_CHECK_INTERVAL_MS` - Health check interval (default: 30000)
- `UPSTREAM_HEALTH_CHECK_FAILURE_THRESHOLD` - Health check failure threshold (default: 3)
- `UPSTREAM_HEALTH_CHECK_RECOVERY_MS` - Health check recovery time (default: 60000)
- `UPSTREAM_TIMEOUT_MS` - Upstream request timeout (default: 30000)
- `BODY_LIMIT_BYTES` - Request body size limit (default: 10485760)
- `DEFAULT_TENANT_ID` - Default tenant ID
- `REQUIRE_EXPLICIT_TENANT` - Require explicit tenant (boolean)
- `GATEWAY_STRICT_STARTUP` - Fail startup if required routes missing (boolean)

**Note**: The API Gateway is a reverse proxy and does not expose business logic endpoints. All business requests are proxied to downstream services based on the `SERVICE_ROUTES` configuration in `gateway.config.ts`.
