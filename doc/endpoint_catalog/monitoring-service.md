# Monitoring Service - Endpoint Catalog

**Service**: monitoring-service  
**Purpose**: System monitoring, metrics collection, SLO tracking, alerting, and OpenTelemetry integration  
**Base Path**: `/`

---

## Controllers Overview

1. **monitoring.controller.ts** - Monitoring operations (metrics, SLOs, alerts, dashboard)
2. **health.controller.ts** - Health check
3. **otel.controller.ts** - OpenTelemetry operations (spans, metrics, events, exceptions)

---

## 1. monitoring.controller.ts

**Base Path**: `/`  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard

## Health Endpoints

### GET /health
**Purpose**: Basic health check for monitoring-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok",
  "service": "monitoring-service"
}
```

---

## Metric Endpoints

### GET /metrics
**Purpose**: Get Prometheus metrics  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `monitoring:metrics:view`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)

**Response**: Prometheus metrics text format (Content-Type: `text/plain` or `application/openmetrics-text`)

---

### POST /metrics
**Purpose**: Record a custom metric  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `monitoring:metrics:view`

**Request Body**:
```json
{
  "name": "string",
  "type": "counter|gauge|histogram",
  "value": 0,
  "labels": {}
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
    "recorded": true
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to record metric

---

## SLO Endpoints

### GET /slos
**Purpose**: List SLOs (Service Level Objectives)  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `monitoring:slos:list`

**Query Params**:
- `serviceName` (optional, string)
- `status` (optional, string)

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
      "sloId": "string",
      "serviceName": "string",
      "name": "string",
      "target": 0.99,
      "current": 0.995,
      "status": "healthy|degraded|breached"
    }
  ],
  "correlationId": "string"
}
```

---

### POST /slos
**Purpose**: Create a new SLO  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `monitoring:slos:create`

**Request Body**:
```json
{
  "serviceName": "string",
  "name": "string",
  "target": 0.99,
  "window": "30d",
  "metricName": "string"
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
    "sloId": "string",
    "serviceName": "string",
    "name": "string",
    "target": 0.99
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to create SLO

---

## Alert Endpoints

### GET /alerts
**Purpose**: List alerts  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `monitoring:alerts:list`

**Query Params**:
- `status` (optional, string)
- `severity` (optional, string)
- `serviceName` (optional, string)

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
      "alertId": "string",
      "serviceName": "string",
      "severity": "critical|warning|info",
      "status": "open|acknowledged|resolved",
      "message": "string",
      "createdAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

### PATCH /alerts/:alertId/ack
**Purpose**: Acknowledge an alert  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `monitoring:alerts:ack`

**Path Params**: `alertId`

**Request Body**:
```json
{
  "acknowledgedBy": "string"
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
    "alertId": "string",
    "status": "acknowledged",
    "acknowledgedBy": "string",
    "acknowledgedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Alert not found
- `INTERNAL_ERROR` - Failed to acknowledge alert

---

## Dashboard Endpoints

### GET /dashboard
**Purpose**: Get monitoring dashboard data  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `monitoring:dashboard:view`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Tenant-Id` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "serviceName": "string",
        "status": "healthy|degraded|down",
        "uptime": 0.99,
        "errorRate": 0.01
      }
    ],
    "alerts": {
      "critical": 0,
      "warning": 0,
      "info": 0
    },
    "slos": {
      "healthy": 0,
      "degraded": 0,
      "breached": 0
    }
  },
  "correlationId": "string"
}
```

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for monitoring-service with database connectivity  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "monitoring-service",
  "timestamp": "ISO8601",
  "uptime": 0,
  "components": {
    "db": "ok|error"
  }
}
```

**Errors**:
- `degraded` status returned if database connection fails

---

## 3. otel.controller.ts

**Base Path**: `/otel`  
**Auth**: None (public)

## Health Endpoints

### GET /otel/health
**Purpose**: OpenTelemetry health check  
**Auth**: None (public)

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "exporter": "jaeger|otlp"
  }
}
```

---

## Span Endpoints

### POST /otel/span
**Purpose**: Create and end a span  
**Auth**: None (public)

**Request Body**:
```json
{
  "name": "string",
  "kind": "server|client|producer|consumer",
  "attributes": {}
}
```

**Response**:
```json
{
  "success": true,
  "message": "Span created and ended"
}
```

---

## Metric Endpoints

### POST /otel/metric
**Purpose**: Record an OpenTelemetry metric  
**Auth**: None (public)

**Request Body**:
```json
{
  "name": "string",
  "value": 0,
  "type": "counter|histogram|gauge",
  "attributes": {}
}
```

**Response**:
```json
{
  "success": true,
  "message": "Metric recorded"
}
```

---

## Attribute Endpoints

### POST /otel/attributes
**Purpose**: Add attributes to active span  
**Auth**: None (public)

**Request Body**:
```json
{
  "attributes": {}
}
```

**Response**:
```json
{
  "success": true,
  "message": "Attributes added to active span"
}
```

---

## Event Endpoints

### POST /otel/event
**Purpose**: Add event to active span  
**Auth**: None (public)

**Request Body**:
```json
{
  "name": "string",
  "attributes": {}
}
```

**Response**:
```json
{
  "success": true,
  "message": "Event added to active span"
}
```

---

## Exception Endpoints

### POST /otel/exception
**Purpose**: Record exception  
**Auth**: None (public)

**Request Body**:
```json
{
  "error": "string",
  "stack": "string"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Exception recorded"
}
```

---

## Summary

**Total Endpoints**: 12

**By Controller**:
- monitoring.controller.ts: 7
- health.controller.ts: 1
- otel.controller.ts: 5

**Authentication**:
- `/health` - Public
- `/otel/*` - Public
- All other endpoints use JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard

**Health Operations**:
1. Health → `/health`

**Metric Operations**:
1. Get Prometheus Metrics → `/metrics` (permission: `monitoring:metrics:view`)
2. Record Metric → `/metrics` (permission: `monitoring:metrics:view`)

**SLO Operations**:
1. List SLOs → `/slos` (permission: `monitoring:slos:list`)
2. Create SLO → `/slos` (permission: `monitoring:slos:create`)

**Alert Operations**:
1. List Alerts → `/alerts` (permission: `monitoring:alerts:list`)
2. Acknowledge Alert → `/alerts/:alertId/ack` (permission: `monitoring:alerts:ack`)

**Dashboard Operations**:
1. Get Dashboard → `/dashboard` (permission: `monitoring:dashboard:view`)

**OpenTelemetry Operations**:
1. Health Check → `/otel/health`
2. Create Span → `/otel/span`
3. Record Metric → `/otel/metric`
4. Add Attributes → `/otel/attributes`
5. Add Event → `/otel/event`
6. Record Exception → `/otel/exception`

**Permissions**:
- `monitoring:metrics:view` - View and record metrics
- `monitoring:slos:list` - List SLOs
- `monitoring:slos:create` - Create SLOs
- `monitoring:alerts:list` - List alerts
- `monitoring:alerts:ack` - Acknowledge alerts
- `monitoring:dashboard:view` - View dashboard

**Alert Severity**:
- critical - Critical
- warning - Warning
- info - Info

**Alert Status**:
- open - Open
- acknowledged - Acknowledged
- resolved - Resolved

**SLO Status**:
- healthy - Healthy
- degraded - Degraded
- breached - Breached

**Service Status**:
- healthy - Healthy
- degraded - Degraded
- down - Down

**Metric Types**:
- counter - Counter
- gauge - Gauge
- histogram - Histogram

**Span Kinds**:
- server - Server
- client - Client
- producer - Producer
- consumer - Consumer

**Note**: OpenTelemetry endpoints are public and intended for internal instrumentation use. Monitoring endpoints require appropriate permissions.
