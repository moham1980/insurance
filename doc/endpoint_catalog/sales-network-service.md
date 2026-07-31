# Sales Network Service - Endpoint Catalog

**Service**: sales-network-service  
**Purpose**: Sales network management (partners, contracts, ledger, commissions, KPIs, agent portal)  
**Base Path**: `/`

---

## Controllers Overview

1. **sales-network.controller.ts** - Sales network operations (partners, contracts, ledger, KPIs, agents, commissions, performance)
2. **health.controller.ts** - Health check

---

## 1. sales-network.controller.ts

**Base Path**: `/`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (all endpoints except /health)

## Partner Endpoints

### GET /sales-network/partners
**Purpose**: List partners  
**Permission**: `sales_network:partners:view`

**Query Params**:
- `kind` (optional, string)
- `status` (optional, string)
- `organizationId` (optional, string) - Filter by organization ID
- `parentPartnerId` (optional, string) - Filter by parent partner (for sub-agents)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "orgUnitId": "string",
      "kind": "broker|agent|branch",
      "displayName": "string",
      "status": "active|inactive|suspended|terminated|pending|verified",
      "organizationId": "string",
      "parentPartnerId": "string",
      "legalNationalId": "string",
      "licenseCode": "string"
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

### POST /sales-network/partners
**Purpose**: Create or update partner  
**Permission**: `sales_network:partners:manage`

**Request Body**:
```json
{
  "orgUnitId": "string (required)",
  "kind": "string (required)",
  "displayName": "string (required)",
  "organizationId": "string (optional)",
  "parentPartnerId": "string (optional)",
  "legalNationalId": "string",
  "licenseCode": "string",
  "contactMobile": "string",
  "contactEmail": "string",
  "bankIban": "string",
  "metadata": {}
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "orgUnitId": "string",
    "kind": "broker|agent|branch",
    "displayName": "string",
    "status": "active",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - orgUnitId, kind, displayName are required

---

### POST /sales-network/partners/:orgUnitId/verify
**Purpose**: Verify partner  
**Permission**: `sales_network:partners:manage`

**Path Params**: `orgUnitId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "orgUnitId": "string",
    "verified": true,
    "verifiedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Partner not found

---

### POST /sales-network/partners/:orgUnitId/status
**Purpose**: Set partner status  
**Permission**: `sales_network:partners:manage`

**Path Params**: `orgUnitId`

**Request Body**:
```json
{
  "status": "string (required)"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "orgUnitId": "string",
    "status": "active|inactive|suspended",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - status is required
- `NOT_FOUND` - Partner not found

---

## Contract Endpoints

### GET /sales-network/contracts
**Purpose**: List contracts  
**Permission**: `sales_network:contracts:view`

**Query Params**:
- `orgUnitId` (optional, string)
- `status` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "contractId": "UUID",
      "orgUnitId": "string",
      "lineOfBusiness": "string",
      "base": "percentage|fixed",
      "rateBps": 0,
      "fixedFeeAmount": "string",
      "status": "draft|active|expired",
      "effectiveFrom": "ISO8601",
      "effectiveTo": "ISO8601"
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

### POST /sales-network/contracts
**Purpose**: Create contract  
**Permission**: `sales_network:contracts:manage`

**Request Body**:
```json
{
  "orgUnitId": "string (required)",
  "base": "string (required)",
  "effectiveFrom": "string (ISO8601, required)",
  "distributionAgreementId": "string (optional)",
  "lineOfBusiness": "string",
  "rateBps": 0,
  "fixedFeeAmount": 0,
  "splitPercentBps": 0,
  "capAmountMinor": 0,
  "floorAmountMinor": 0,
  "currency": "string",
  "effectiveTo": "ISO8601",
  "rules": {},
  "notes": "string"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "contractId": "UUID",
    "orgUnitId": "string",
    "status": "draft",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - orgUnitId, base, effectiveFrom are required

---

### POST /sales-network/contracts/:contractId/activate
**Purpose**: Activate contract  
**Permission**: `sales_network:contracts:manage`

**Path Params**: `contractId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "contractId": "UUID",
    "status": "active",
    "activatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Contract not found

---

## Ledger Endpoints

### GET /sales-network/ledger
**Purpose**: List ledger entries  
**Permission**: `sales_network:ledger:view`

**Query Params**:
- `orgUnitId` (optional, string)
- `status` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "ledgerEntryId": "UUID",
      "orgUnitId": "string",
      "policyId": "string",
      "amount": 0,
      "currency": "string",
      "status": "pending|paid|void",
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

### POST /sales-network/ledger/:ledgerEntryId/void
**Purpose**: Void ledger entry  
**Permission**: `sales_network:ledger:manage`

**Path Params**: `ledgerEntryId`

**Request Body**:
```json
{
  "reason": "string (required)"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "ledgerEntryId": "UUID",
    "status": "void",
    "voidedAt": "ISO8601",
    "voidReason": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - reason is required
- `NOT_FOUND` - Ledger entry not found

---

### POST /sales-network/ledger/:ledgerEntryId/pay
**Purpose**: Mark ledger entry as paid  
**Permission**: `sales_network:ledger:manage`

**Path Params**: `ledgerEntryId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "ledgerEntryId": "UUID",
    "status": "paid",
    "paidAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Ledger entry not found

---

## KPI Endpoints

### GET /sales-network/kpi/daily
**Purpose**: List daily KPIs  
**Permission**: `sales_network:kpi:view`

**Query Params**:
- `orgUnitId` (optional, string)
- `dayFrom` (optional, ISO8601)
- `dayTo` (optional, ISO8601)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "orgUnitId": "string",
      "day": "ISO8601",
      "policiesIssued": 0,
      "policiesRenewed": 0,
      "premiumIssued": 0,
      "commissionAccrued": 0
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

## Agent Endpoints

### GET /sales-network/agent/summary
**Purpose**: Get agent summary  
**Permission**: `sales_network:agent:view`

**Query Params**:
- `orgUnitId` (required, string)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "orgUnitId": "string",
    "displayName": "string",
    "totalPolicies": 0,
    "activePolicies": 0,
    "totalPremium": 0,
    "totalCommission": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - orgUnitId is required
- `NOT_FOUND` - Agent not found or access denied

---

### GET /sales-network/agent/policies
**Purpose**: Get agent policies  
**Permission**: `sales_network:agent:view`

**Query Params**:
- `orgUnitId` (required, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "policyId": "string",
      "orgUnitId": "string",
      "premium": 0,
      "status": "active|expired",
      "issuedAt": "ISO8601"
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

**Errors**:
- `VALIDATION_ERROR` - orgUnitId is required

---

## Commission Endpoints

### POST /sales-network/commission/calculate
**Purpose**: Calculate commission for policy  
**Permission**: `sales_network:ledger:view`

**Request Body**:
```json
{
  "policyId": "string (required)",
  "orgUnitId": "string (required)",
  "premiumAmount": 0 (required, number),
  "lineOfBusiness": "string",
  "currency": "string",
  "occurredAt": "ISO8601"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "policyId": "string",
    "orgUnitId": "string",
    "commissionAmount": 0,
    "currency": "string",
    "calculatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - policyId, orgUnitId, premiumAmount are required
- `INTERNAL_ERROR` - Failed to calculate commission

---

### POST /sales-network/commission/recalculate
**Purpose**: Recalculate commission for policy  
**Permission**: `sales_network:ledger:manage`

**Request Body**:
```json
{
  "policyId": "string (required)"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "policyId": "string",
    "ledgerEntry": {
      "ledgerEntryId": "UUID",
      "amount": 0,
      "recalculatedAt": "ISO8601"
    }
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - policyId is required
- `NOT_FOUND` - Policy attribution or ledger entry not found
- `INTERNAL_ERROR` - Failed to recalculate commission

---

## Performance Endpoints

### GET /sales-network/performance/trend
**Purpose**: Get performance trend  
**Permission**: `sales_network:kpi:view`

**Query Params**:
- `orgUnitId` (required, string)
- `startDate` (required, ISO8601)
- `endDate` (required, ISO8601)
- `metric` (required, string) - Valid: policiesIssued, policiesRenewed, policiesCancelled, complaintsCreated, premiumIssued, commissionAccrued
- `granularity` (optional, string)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "orgUnitId": "string",
    "metric": "string",
    "trend": [
      {
        "date": "ISO8601",
        "value": 0
      }
    ],
    "period": {
      "startDate": "ISO8601",
      "endDate": "ISO8601"
    }
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - orgUnitId, startDate, endDate, and valid metric are required
- `INTERNAL_ERROR` - Failed to get performance trend

---

### GET /sales-network/performance/compare-periods
**Purpose**: Compare performance between periods  
**Permission**: `sales_network:kpi:view`

**Query Params**:
- `orgUnitId` (required, string)
- `currentPeriodStart` (required, ISO8601)
- `currentPeriodEnd` (required, ISO8601)
- `previousPeriodStart` (required, ISO8601)
- `previousPeriodEnd` (required, ISO8601)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "orgUnitId": "string",
    "currentPeriod": {
      "startDate": "ISO8601",
      "endDate": "ISO8601",
      "policiesIssued": 0,
      "premiumIssued": 0
    },
    "previousPeriod": {
      "startDate": "ISO8601",
      "endDate": "ISO8601",
      "policiesIssued": 0,
      "premiumIssued": 0
    },
    "change": {
      "policiesIssued": 0,
      "premiumIssued": 0
    }
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - All period parameters are required
- `INTERNAL_ERROR` - Failed to compare periods

---

### GET /sales-network/performance/top-performers
**Purpose**: Get top performers  
**Permission**: `sales_network:kpi:view`

**Query Params**:
- `startDate` (required, ISO8601)
- `endDate` (required, ISO8601)
- `metric` (required, string) - Valid: policiesIssued, policiesRenewed, premiumIssued, commissionAccrued
- `limit` (optional, integer)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "performers": [
      {
        "orgUnitId": "string",
        "displayName": "string",
        "metricValue": 0,
        "rank": 1
      }
    ],
    "period": {
      "startDate": "ISO8601",
      "endDate": "ISO8601"
    }
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - startDate, endDate, and valid metric are required
- `INTERNAL_ERROR` - Failed to get top performers

---

## Agent Portal Endpoints

### GET /sales-network/agents/:agentId/stats
**Purpose**: Get agent stats (Agent Portal)  
**Permission**: `sales_network:agents:view`

**Path Params**: `agentId`

**Headers**:
- `X-Correlation-Id` (optional)
- `X-Partner-Id` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "agentId": "string",
    "partnerId": "string",
    "totalPolicies": 0,
    "activePolicies": 0,
    "totalClaims": 0,
    "totalCommission": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - x-partner-id header is required
- `INTERNAL_ERROR` - Failed to get agent stats

---

### GET /sales-network/agents/:agentId/policies
**Purpose**: Get agent policies (Agent Portal)  
**Permission**: `sales_network:agents:view`

**Path Params**: `agentId`

**Query Params**:
- `status` (optional, string)
- `fromDate` (optional, ISO8601)
- `toDate` (optional, ISO8601)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)
- `X-Partner-Id` (required)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "policyId": "string",
      "agentId": "string",
      "status": "active|expired",
      "premium": 0,
      "issuedAt": "ISO8601"
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

**Errors**:
- `VALIDATION_ERROR` - x-partner-id header is required
- `INTERNAL_ERROR` - Failed to get agent policies

---

### GET /sales-network/agents/:agentId/claims
**Purpose**: Get agent claims (Agent Portal)  
**Permission**: `sales_network:agents:view`

**Path Params**: `agentId`

**Query Params**:
- `status` (optional, string)
- `fromDate` (optional, ISO8601)
- `toDate` (optional, ISO8601)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)
- `X-Partner-Id` (required)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "claimId": "string",
      "agentId": "string",
      "status": "submitted|approved|rejected",
      "incidentDate": "ISO8601",
      "submittedAt": "ISO8601"
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

**Errors**:
- `VALIDATION_ERROR` - x-partner-id header is required
- `INTERNAL_ERROR` - Failed to get agent claims

---

### GET /sales-network/agents/:agentId/customers
**Purpose**: Get agent customers (Agent Portal)  
**Permission**: `sales_network:agents:view`

**Path Params**: `agentId`

**Query Params**:
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)
- `X-Partner-Id` (required)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "customerId": "string",
      "agentId": "string",
      "name": "string",
      "totalPolicies": 0,
      "totalPremium": 0
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

**Errors**:
- `VALIDATION_ERROR` - x-partner-id header is required
- `INTERNAL_ERROR` - Failed to get agent customers

---

### GET /sales-network/agents/:agentId/commissions
**Purpose**: Get agent commissions (Agent Portal)  
**Permission**: `sales_network:agents:view`

**Path Params**: `agentId`

**Query Params**:
- `status` (optional, string)
- `fromDate` (optional, ISO8601)
- `toDate` (optional, ISO8601)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)
- `X-Partner-Id` (required)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "ledgerEntryId": "UUID",
      "agentId": "string",
      "policyId": "string",
      "amount": 0,
      "status": "pending|paid",
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

**Errors**:
- `VALIDATION_ERROR` - x-partner-id header is required
- `INTERNAL_ERROR` - Failed to get agent commissions

---

### GET /sales-network/agents/:agentId/kpis
**Purpose**: Get agent KPIs (Agent Portal)  
**Permission**: `sales_network:agents:view`

**Path Params**: `agentId`

**Query Params**:
- `fromDate` (optional, ISO8601)
- `toDate` (optional, ISO8601)
- `granularity` (optional, string) - daily, monthly

**Headers**:
- `X-Correlation-Id` (optional)
- `X-Partner-Id` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "agentId": "string",
    "kpis": [
      {
        "date": "ISO8601",
        "policiesIssued": 0,
        "premiumIssued": 0,
        "commissionAccrued": 0
      }
    ],
    "period": {
      "fromDate": "ISO8601",
      "toDate": "ISO8601"
    }
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - x-partner-id header is required
- `INTERNAL_ERROR` - Failed to get agent kpis

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for sales-network-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "sales-network-service",
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

**Total Endpoints**: 29

**By Controller**:
- sales-network.controller.ts: 28
- health.controller.ts: 1

**Authentication**:
- All endpoints except `/health` use JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard
- Agent Portal endpoints require `X-Partner-Id` header

**Partner Operations**:
1. List → `/sales-network/partners`
2. Upsert → `/sales-network/partners`
3. Verify → `/sales-network/partners/:orgUnitId/verify`
4. Set Status → `/sales-network/partners/:orgUnitId/status`

**Contract Operations**:
1. List → `/sales-network/contracts`
2. Create → `/sales-network/contracts`
3. Activate → `/sales-network/contracts/:contractId/activate`
4. Terminate → `/sales-network/contracts/:contractId/terminate`

**Ledger Operations**:
1. List → `/sales-network/ledger`
2. Void → `/sales-network/ledger/:ledgerEntryId/void`
3. Pay → `/sales-network/ledger/:ledgerEntryId/pay`
4. Reconciliation → `/sales-network/ledger/reconciliation`

**KPI Operations**:
1. Daily KPIs → `/sales-network/kpi/daily`

**Agent Operations**:
1. Summary → `/sales-network/agent/summary`
2. Policies → `/sales-network/agent/policies`

**Commission Operations**:
1. Calculate → `/sales-network/commission/calculate`
2. Recalculate → `/sales-network/commission/recalculate`

**Performance Operations**:
1. Trend → `/sales-network/performance/trend`
2. Compare Periods → `/sales-network/performance/compare-periods`
3. Top Performers → `/sales-network/performance/top-performers`

**Agent Portal Operations** (requires X-Partner-Id):
1. Stats → `/sales-network/agents/:agentId/stats`
2. Policies → `/sales-network/agents/:agentId/policies`
3. Claims → `/sales-network/agents/:agentId/claims`
4. Customers → `/sales-network/agents/:agentId/customers`
5. Commissions → `/sales-network/agents/:agentId/commissions`
6. KPIs → `/sales-network/agents/:agentId/kpis`

**Broker Sub-Agent Management**:
1. List Sub-Agents → `/sales-network/broker/:brokerPartnerId/sub-agents`
2. Create Sub-Agent → `/sales-network/broker/:brokerPartnerId/sub-agents`
3. Suspend Sub-Agent → `/sales-network/broker/:brokerPartnerId/sub-agents/:subAgentPartnerId/suspend`
4. Terminate Sub-Agent → `/sales-network/broker/:brokerPartnerId/sub-agents/:subAgentPartnerId/terminate`

**Broker Dashboard**:
1. Dashboard → `/sales-network/broker/:brokerPartnerId/dashboard`

**Permissions**:
- `sales_network:partners:view` - View partners
- `sales_network:partners:manage` - Manage partners
- `sales_network:contracts:view` - View contracts
- `sales_network:contracts:manage` - Manage contracts
- `sales_network:ledger:view` - View ledger
- `sales_network:ledger:manage` - Manage ledger
- `sales_network:kpi:view` - View KPIs
- `sales_network:agent:view` - View agent data
- `sales_network:agents:view` - View agent portal data
- `sales_network:broker:sub_agents:view` - View broker sub-agents
- `sales_network:broker:sub_agents:manage` - Manage broker sub-agents
- `sales_network:broker:dashboard:view` - View broker dashboard

**Partner Status**:
- active - Active partner
- inactive - Inactive partner
- suspended - Suspended partner
- terminated - Terminated partner
- pending - Pending verification
- verified - Verified partner

**Contract Status**:
- draft - Draft contract
- active - Active contract
- expired - Expired contract
- terminated - Terminated contract

**Ledger Status**:
- accrued - Commission accrued
- paid - Paid
- settled - Settled via billing
- void - Voided
- clawback - Clawback applied

**Partner Kind**:
- broker - Broker
- agent - Agent
- branch - Branch

**Contract Base**:
- percentage - Percentage-based commission
- fixed - Fixed fee commission

**Valid Metrics**:
- policiesIssued
- policiesRenewed
- policiesCancelled
- complaintsCreated
- premiumIssued
- commissionAccrued
