# Broker Portal BFF - Endpoint Catalog

**Service**: broker-portal-bff  
**Purpose**: Backend for Frontend for broker operations (dashboard, agreements, submissions, claims, commissions, reports)  
**Base Path**: `/broker`

---

## Controllers Overview

1. **broker.controller.ts** - Broker operations (dashboard, agreements, offerings, submissions, placements, claims, commissions, sub-agents, reports)
2. **health.controller.ts** - Health check

---

## 1. broker.controller.ts

**Base Path**: `/broker`  
**Auth**: Bearer token forwarded to downstream services

## Dashboard Endpoints

### GET /broker/dashboard
**Purpose**: Get broker dashboard data  
**Auth**: Bearer token (forwarded to downstream)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "totalPolicies": 0,
    "activePolicies": 0,
    "pendingSubmissions": 0,
    "totalPremium": 0,
    "totalCommission": 0,
    "recentClaims": []
  },
  "correlationId": "string"
}
```

---

## Agreement Endpoints

### GET /broker/agreements
**Purpose**: List distribution agreements  
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
      "agreementId": "string",
      "insurerId": "string",
      "status": "active|expired",
      "effectiveFrom": "ISO8601",
      "effectiveTo": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

## Offering Endpoints

### GET /broker/offerings
**Purpose**: List available product offerings  
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
      "offeringId": "string",
      "productId": "string",
      "insurerId": "string",
      "name": "string",
      "lineOfBusiness": "string"
    }
  ],
  "correlationId": "string"
}
```

---

## Submission Endpoints

### GET /broker/submissions
**Purpose**: List submissions  
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
      "submissionId": "string",
      "customerId": "string",
      "status": "draft|submitted|quoted|bound|rejected",
      "createdAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

### GET /broker/submissions/:submissionId
**Purpose**: Get submission by ID  
**Auth**: Bearer token (forwarded to downstream)

**Path Params**: `submissionId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "submissionId": "string",
    "customerId": "string",
    "status": "draft|submitted|quoted|bound|rejected",
    "details": {}
  },
  "correlationId": "string"
}
```

---

### GET /broker/quotes/:submissionId
**Purpose**: Get quotes for submission  
**Auth**: Bearer token (forwarded to downstream)

**Path Params**: `submissionId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "quoteId": "string",
      "submissionId": "string",
      "insurerId": "string",
      "premium": 0,
      "currency": "string",
      "validUntil": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

## Placement Endpoints

### POST /broker/placements
**Purpose**: Create placement (bind policy)  
**Auth**: Bearer token (forwarded to downstream)

**Request Body**:
```json
{
  "submissionId": "string",
  "quoteId": "string",
  "effectiveDate": "ISO8601"
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
    "placementId": "string",
    "policyId": "string",
    "status": "bound",
    "boundAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

## Claims Endpoints

### GET /broker/claims
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

### GET /broker/claims/:claimId
**Purpose**: Get claim by ID  
**Auth**: Bearer token (forwarded to downstream)

**Path Params**: `claimId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "claimId": "string",
    "policyId": "string",
    "status": "submitted|approved|rejected|settled",
    "details": {}
  },
  "correlationId": "string"
}
```

---

### POST /broker/claims/:claimId/communications
**Purpose**: Add communication to claim  
**Auth**: Bearer token (forwarded to downstream)

**Path Params**: `claimId`

**Request Body**:
```json
{
  "message": "string",
  "attachments": []
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
    "communicationId": "string",
    "claimId": "string",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

## Commission Endpoints

### GET /broker/commissions
**Purpose**: List commissions  
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
      "commissionId": "string",
      "policyId": "string",
      "amount": 0,
      "currency": "string",
      "status": "pending|paid",
      "earnedAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

## Sub-Agent Endpoints

### GET /broker/sub-agents
**Purpose**: List sub-agents  
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
      "agentId": "string",
      "name": "string",
      "status": "active|inactive",
      "totalPolicies": 0,
      "totalCommission": 0
    }
  ],
  "correlationId": "string"
}
```

---

## Report Endpoints

### GET /broker/reports/broker-transactions
**Purpose**: Get broker transaction report  
**Auth**: Bearer token (forwarded to downstream)

**Query Params**:
- `periodId` (required)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "periodId": "string",
    "startDate": "ISO8601",
    "endDate": "ISO8601",
    "totalTransactions": 0,
    "totalPremium": 0,
    "totalCommission": 0,
    "transactions": []
  },
  "correlationId": "string"
}
```

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for broker-portal-bff  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok",
  "service": "broker-portal-bff"
}
```

---

## Summary

**Total Endpoints**: 12

**By Controller**:
- broker.controller.ts: 11
- health.controller.ts: 1

**Authentication**:
- All endpoints except `/health` require Bearer token which is forwarded to downstream services
- No local auth guards - acts as a proxy BFF

**Dashboard Operations**:
1. Dashboard → `/broker/dashboard`

**Agreement Operations**:
1. List → `/broker/agreements`

**Offering Operations**:
1. List → `/broker/offerings`

**Submission Operations**:
1. List → `/broker/submissions`
2. Get → `/broker/submissions/:submissionId`
3. Get Quotes → `/broker/quotes/:submissionId`

**Placement Operations**:
1. Create → `/broker/placements`

**Claims Operations**:
1. List → `/broker/claims`
2. Get → `/broker/claims/:claimId`
3. Add Communication → `/broker/claims/:claimId/communications`

**Commission Operations**:
1. List → `/broker/commissions`

**Sub-Agent Operations**:
1. List → `/broker/sub-agents`

**Report Operations**:
1. Broker Transactions → `/broker/reports/broker-transactions`

**Downstream Services**:
- submission-placement-service (agreements, offerings, submissions, placements)
- claims-service (claims)
- sales-network-service (commissions, sub-agents)
- reporting-service (reports)

**Submission Status**:
- draft - Draft
- submitted - Submitted
- quoted - Quoted
- bound - Bound
- rejected - Rejected

**Claim Status**:
- submitted - Submitted
- approved - Approved
- rejected - Rejected
- settled - Settled

**Commission Status**:
- pending - Pending
- paid - Paid
