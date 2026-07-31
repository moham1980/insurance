# Insurer Operations BFF - Endpoint Catalog

**Service**: insurer-operations-bff  
**Purpose**: Backend for Frontend for insurer operations (products, RFQs, claims, settlements, reports)  
**Base Path**: `/insurer`

---

## Controllers Overview

1. **insurer.controller.ts** - Insurer operations (products, rate tables, distribution agreements, RFQs, claims, settlements, broker performance, regulatory reports)
2. **health.controller.ts** - Health check

---

## 1. insurer.controller.ts

**Base Path**: `/insurer`  
**Auth**: Bearer token forwarded to downstream services

## Product Endpoints

### GET /insurer/products
**Purpose**: List insurance products  
**Auth**: Bearer token (forwarded to downstream)

**Query Params**:
- `limit` (default: 50)
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
      "productId": "string",
      "name": "string",
      "lineOfBusiness": "string",
      "status": "active|inactive"
    }
  ],
  "correlationId": "string"
}
```

---

### GET /insurer/rate-tables
**Purpose**: List rate tables  
**Auth**: Bearer token (forwarded to downstream)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "rateTableId": "string",
      "productId": "string",
      "name": "string",
      "effectiveFrom": "ISO8601",
      "effectiveTo": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

## Distribution Agreement Endpoints

### GET /insurer/distribution-agreements
**Purpose**: List distribution agreements  
**Auth**: Bearer token (forwarded to downstream)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "agreementId": "string",
      "partnerId": "string",
      "status": "active|expired",
      "effectiveFrom": "ISO8601",
      "effectiveTo": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

## RFQ Endpoints

### GET /insurer/rfqs
**Purpose**: List request for quotes (RFQs)  
**Auth**: Bearer token (forwarded to downstream)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "rfqId": "string",
      "brokerId": "string",
      "status": "pending|quoted|rejected",
      "createdAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

### POST /insurer/rfqs/:rfqId/process
**Purpose**: Process RFQ (create quote)  
**Auth**: Bearer token (forwarded to downstream)

**Path Params**: `rfqId`

**Request Body**:
```json
{
  "quoteAmount": 0,
  "currency": "string",
  "validUntil": "ISO8601",
  "notes": "string"
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
    "rfqId": "string",
    "quoteId": "string",
    "status": "quoted",
    "quotedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

## Claims Endpoints

### GET /insurer/claims
**Purpose**: List claims  
**Auth**: Bearer token (forwarded to downstream)

**Query Params**:
- `limit` (default: 50)
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
      "claimId": "string",
      "policyId": "string",
      "status": "submitted|approved|rejected|settled",
      "incidentDate": "ISO8601",
      "submittedAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

### POST /insurer/claims/:claimId/assign-loss-adjuster
**Purpose**: Assign loss adjuster to claim  
**Auth**: Bearer token (forwarded to downstream)

**Path Params**: `claimId`

**Request Body**:
```json
{
  "lossAdjusterId": "string"
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
    "claimId": "string",
    "lossAdjusterId": "string",
    "assignedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

## Settlement Endpoints

### GET /insurer/settlements
**Purpose**: List settlements  
**Auth**: Bearer token (forwarded to downstream)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "settlementId": "string",
      "claimId": "string",
      "amount": 0,
      "currency": "string",
      "status": "pending|paid",
      "settledAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

## Broker Performance Endpoints

### GET /insurer/broker-performance
**Purpose**: List broker performance metrics  
**Auth**: Bearer token (forwarded to downstream)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "brokerId": "string",
      "name": "string",
      "policiesIssued": 0,
      "premiumCollected": 0,
      "claimsRatio": 0,
      "commissionPaid": 0
    }
  ],
  "correlationId": "string"
}
```

---

## Regulatory Report Endpoints

### GET /insurer/regulatory-reports
**Purpose**: List regulatory reports  
**Auth**: Bearer token (forwarded to downstream)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "reportId": "string",
      "reportType": "string",
      "period": "string",
      "status": "draft|submitted|approved",
      "generatedAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for insurer-operations-bff  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok",
  "service": "insurer-operations-bff",
  "timestamp": "ISO8601"
}
```

---

## Summary

**Total Endpoints**: 10

**By Controller**:
- insurer.controller.ts: 9
- health.controller.ts: 1

**Authentication**:
- All endpoints except `/health` require Bearer token which is forwarded to downstream services
- No local auth guards - acts as a proxy BFF

**Product Operations**:
1. List Products → `/insurer/products`
2. List Rate Tables → `/insurer/rate-tables`

**Distribution Agreement Operations**:
1. List → `/insurer/distribution-agreements`

**RFQ Operations**:
1. List → `/insurer/rfqs`
2. Process → `/insurer/rfqs/:rfqId/process`

**Claims Operations**:
1. List → `/insurer/claims`
2. Assign Loss Adjuster → `/insurer/claims/:claimId/assign-loss-adjuster`

**Settlement Operations**:
1. List → `/insurer/settlements`

**Broker Performance Operations**:
1. List → `/insurer/broker-performance`

**Regulatory Report Operations**:
1. List → `/insurer/regulatory-reports`

**Downstream Services**:
- product-service (products, rate tables)
- submission-placement-service (distribution agreements, RFQs)
- claims-service (claims)
- billing-service (settlements)
- sales-network-service (broker performance)
- reporting-service (regulatory reports)

**RFQ Status**:
- pending - Pending quote
- quoted - Quoted
- rejected - Rejected

**Claim Status**:
- submitted - Submitted
- approved - Approved
- rejected - Rejected
- settled - Settled

**Settlement Status**:
- pending - Pending payment
- paid - Paid

**Report Status**:
- draft - Draft
- submitted - Submitted
- approved - Approved
