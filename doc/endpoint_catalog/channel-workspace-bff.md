# Channel Workspace BFF - Endpoint Catalog

**Service**: channel-workspace-bff  
**Purpose**: Backend for Frontend for channel workspace operations (workspaces, offerings, submissions, commissions, customers, broker operations)  
**Base Path**: `/channel` and `/broker`

---

## Controllers Overview

1. **channel.controller.ts** - Channel workspace operations (workspaces, offerings, submissions, commissions, customers)
2. **broker.controller.ts** - Broker operations (carrier agreements, product offerings, placements, settlements, claim advocacy)
3. **health.controller.ts** - Health check

---

## 1. channel.controller.ts

**Base Path**: `/channel`  
**Auth**: Bearer token forwarded to downstream services

## Workspace Endpoints

### GET /channel/workspaces
**Purpose**: List workspaces  
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
      "workspaceId": "string",
      "name": "string",
      "type": "broker|agent|insurer",
      "status": "active|inactive"
    }
  ],
  "correlationId": "string"
}
```

---

### GET /channel/workspaces/:workspaceId
**Purpose**: Get workspace by ID  
**Auth**: Bearer token (forwarded to downstream)

**Path Params**: `workspaceId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "workspaceId": "string",
    "name": "string",
    "type": "broker|agent|insurer",
    "status": "active|inactive",
    "config": {}
  },
  "correlationId": "string"
}
```

---

### GET /channel/workspaces/mine
**Purpose**: Get workspaces for current user  
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
      "workspaceId": "string",
      "name": "string",
      "type": "broker|agent|insurer",
      "role": "owner|member"
    }
  ],
  "correlationId": "string"
}
```

---

## Offering Endpoints

### GET /channel/offerings
**Purpose**: List offerings  
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

### GET /channel/submissions
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

### POST /channel/submissions
**Purpose**: Create submission  
**Auth**: Bearer token (forwarded to downstream)

**Request Body**:
```json
{
  "customerId": "string",
  "offeringId": "string",
  "details": {}
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
    "submissionId": "string",
    "status": "draft",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

## Commission Endpoints

### GET /channel/commissions
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

## Customer Endpoints

### GET /channel/customers
**Purpose**: List customers  
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
      "customerId": "string",
      "name": "string",
      "email": "string",
      "status": "active|inactive"
    }
  ],
  "correlationId": "string"
}
```

---

## 2. broker.controller.ts

**Base Path**: `/broker`  
**Auth**: Bearer token forwarded to downstream services

## Carrier Agreement Endpoints

### GET /broker/carrier-agreements
**Purpose**: List carrier agreements  
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
      "carrierId": "string",
      "status": "active|expired",
      "effectiveFrom": "ISO8601",
      "effectiveTo": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

## Product Offering Endpoints

### GET /broker/product-offerings
**Purpose**: List broker product offerings  
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

## Placement Endpoints

### GET /broker/placements
**Purpose**: List placements  
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
      "placementId": "string",
      "policyId": "string",
      "status": "bound",
      "boundAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

## Settlement Endpoints

### GET /broker/settlements
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
      "placementId": "string",
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

## Claim Advocacy Endpoints

### GET /broker/claim-advocacy-cases
**Purpose**: List claim advocacy cases  
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
      "caseId": "string",
      "claimId": "string",
      "status": "open|in_progress|closed",
      "openedAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

## 3. health.controller.ts

### GET /health
**Purpose**: Health check for channel-workspace-bff  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok",
  "service": "channel-workspace-bff",
  "timestamp": "ISO8601"
}
```

---

## Summary

**Total Endpoints**: 13

**By Controller**:
- channel.controller.ts: 8
- broker.controller.ts: 5
- health.controller.ts: 1

**Authentication**:
- All endpoints except `/health` require Bearer token which is forwarded to downstream services
- No local auth guards - acts as a proxy BFF

**Workspace Operations**:
1. List Workspaces → `/channel/workspaces`
2. Get Workspace → `/channel/workspaces/:workspaceId`
3. Get My Workspaces → `/channel/workspaces/mine`

**Offering Operations**:
1. List Offerings → `/channel/offerings`

**Submission Operations**:
1. List Submissions → `/channel/submissions`
2. Create Submission → `/channel/submissions`

**Commission Operations**:
1. List Commissions → `/channel/commissions`

**Customer Operations**:
1. List Customers → `/channel/customers`

**Carrier Agreement Operations**:
1. List Carrier Agreements → `/broker/carrier-agreements`

**Product Offering Operations**:
1. List Broker Product Offerings → `/broker/product-offerings`

**Placement Operations**:
1. List Placements → `/broker/placements`

**Settlement Operations**:
1. List Settlements → `/broker/settlements`

**Claim Advocacy Operations**:
1. List Claim Advocacy Cases → `/broker/claim-advocacy-cases`

**Downstream Services**:
- submission-placement-service (offerings, submissions, carrier agreements, product offerings, placements)
- sales-network-service (commissions)
- customer-360-service (customers)
- billing-service (settlements)
- claims-service (claim advocacy cases)

**Submission Status**:
- draft - Draft
- submitted - Submitted
- quoted - Quoted
- bound - Bound
- rejected - Rejected

**Commission Status**:
- pending - Pending
- paid - Paid

**Settlement Status**:
- pending - Pending
- paid - Paid

**Claim Advocacy Status**:
- open - Open
- in_progress - In Progress
- closed - Closed

**Workspace Type**:
- broker - Broker
- agent - Agent
- insurer - Insurer

**Workspace Status**:
- active - Active
- inactive - Inactive
