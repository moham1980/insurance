# Agent Portal Service - Endpoint Catalog

**Service**: agent-portal-service  
**Purpose**: Agent portal session management, dashboard, policies, claims, commissions, KPIs, advocacy  
**Base Path**: `/agent-portal`

---

## Controllers Overview

1. **agent-portal.controller.ts** - Agent portal business logic (sessions, dashboard, policies, claims, advocacy)
2. **health.controller.ts** - Health check

---

## 1. agent-portal.controller.ts

**Base Path**: `/agent-portal`  
**Auth**: JWT + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### POST /agent-portal/session
**Purpose**: Create agent portal session  
**Permission**: `agent_portal:session`

**Headers**:
- `X-Correlation-Id` (optional)

**Request Body**:
```json
{
  "tenantId": "string",
  "agentId": "string",
  "jwtToken": "string",
  "expiresIn": "8h"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "UUID",
    "agentId": "string",
    "expiresAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /agent-portal/session/:sessionId/validate
**Purpose**: Validate session  
**Permission**: `agent_portal:session`

**Path Params**: `sessionId`

**Response**:
```json
{
  "success": true,
  "data": {
    "agentId": "string"
  }
}
```

---

### POST /agent-portal/session/:sessionId/revoke
**Purpose**: Revoke session  
**Permission**: `agent_portal:session`

**Path Params**: `sessionId`

**Response**:
```json
{
  "success": true,
  "data": {
    "revoked": true
  }
}
```

---

### POST /agent-portal/agent/:agentId/revoke-all
**Purpose**: Revoke all sessions for agent  
**Permission**: `agent_portal:session`

**Path Params**: `agentId`

**Response**:
```json
{
  "success": true,
  "data": {
    "revokedCount": 0
  }
}
```

---

## Agent Portal Business Logic Endpoints

### GET /agent-portal/agent/:agentId/dashboard
**Purpose**: Get dashboard stats for agent  
**Permission**: `agent_portal:dashboard`

**Path Params**: `agentId`

**Query Params**:
- `partnerId` (optional, string)

**Response**:
```json
{
  "success": true,
  "data": {
    "totalPolicies": 0,
    "activePolicies": 0,
    "totalClaims": 0,
    "openClaims": 0,
    "totalPremium": 0,
    "totalCommission": 0
  }
}
```

---

### GET /agent-portal/agent/:agentId/policies
**Purpose**: Get agent policies  
**Permission**: `agent_portal:policies`

**Path Params**: `agentId`

**Query Params**:
- `partnerId` (optional, string)
- `status` (optional, string)
- `fromDate` (optional, ISO8601)
- `toDate` (optional, ISO8601)

**Response**:
```json
{
  "success": true,
  "data": [...]
}
```

---

### GET /agent-portal/agent/:agentId/claims
**Purpose**: Get agent claims  
**Permission**: `agent_portal:claims`

**Path Params**: `agentId`

**Query Params**:
- `partnerId` (optional, string)
- `status` (optional, string)
- `fromDate` (optional, ISO8601)
- `toDate` (optional, ISO8601)

**Response**:
```json
{
  "success": true,
  "data": [...]
}
```

---

### GET /agent-portal/agent/:agentId/customers
**Purpose**: Get agent customers  
**Permission**: `agent_portal:customers`

**Path Params**: `agentId`

**Query Params**:
- `partnerId` (optional, string)
- `search` (optional, string)

**Response**:
```json
{
  "success": true,
  "data": [...]
}
```

---

### GET /agent-portal/agent/:agentId/commissions
**Purpose**: Get agent commissions  
**Permission**: `agent_portal:commissions`

**Path Params**: `agentId`

**Query Params**:
- `partnerId` (optional, string)
- `status` (optional, string)
- `fromDate` (optional, ISO8601)
- `toDate` (optional, ISO8601)

**Response**:
```json
{
  "success": true,
  "data": [...]
}
```

---

### GET /agent-portal/agent/:agentId/kpi
**Purpose**: Get agent KPI  
**Permission**: `agent_portal:kpi`

**Path Params**: `agentId`

**Query Params**:
- `partnerId` (optional, string)
- `period` (default: "daily", options: "daily" | "weekly" | "monthly")

**Response**:
```json
{
  "success": true,
  "data": {
    "policiesSold": 0,
    "premiumWritten": 0,
    "claimsProcessed": 0,
    "customerSatisfaction": 0
  }
}
```

---

## Dashboard Sub-Endpoints

### GET /agent-portal/dashboard/premium-trends
**Purpose**: Get premium trends  
**Permission**: `agent_portal:dashboard`

**Query Params**:
- `agentId` (required, string)
- `partnerId` (optional, string)
- `months` (default: 12, number)

**Response**:
```json
{
  "success": true,
  "data": [...]
}
```

---

### GET /agent-portal/dashboard/commission-history
**Purpose**: Get commission history  
**Permission**: `agent_portal:commissions`

**Query Params**:
- `agentId` (required, string)
- `partnerId` (optional, string)
- `months` (default: 12, number)

**Response**:
```json
{
  "success": true,
  "data": [...]
}
```

---

### GET /agent-portal/dashboard/policy-portfolio
**Purpose**: Get policy portfolio  
**Permission**: `agent_portal:policies`

**Query Params**:
- `agentId` (required, string)
- `partnerId` (optional, string)

**Response**:
```json
{
  "success": true,
  "data": {
    "byLineOfBusiness": {},
    "byStatus": {},
    "totalPolicies": 0,
    "totalPremium": 0
  }
}
```

---

### GET /agent-portal/leads
**Purpose**: Get leads  
**Permission**: `agent_portal:leads`

**Query Params**:
- `agentId` (required, string)
- `partnerId` (optional, string)

**Response**:
```json
{
  "success": true,
  "data": [...]
}
```

---

### GET /agent-portal/health
**Purpose**: Health check for agent-portal-service  
**Auth**: None (public)

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "db": "ok"
  }
}
```

---

## Advocacy Endpoints

### GET /agent-portal/claims/:claimId/advocacy
**Purpose**: Get claim advocacy  
**Permission**: `agent_portal:claims`

**Path Params**: `claimId`

**Response**:
```json
{
  "success": true,
  "data": {
    "advocacyCases": [],
    "adjusterReferrals": []
  },
  "correlationId": "string"
}
```

---

### POST /agent-portal/claims/:claimId/advocacy-cases
**Purpose**: Open advocacy case  
**Permission**: `agent_portal:claims`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "brokerOrganizationId": "string",
  "customerPartyId": "string",
  "carrierOrganizationId": "string",
  "priority": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "caseId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

---

### POST /agent-portal/advocacy-cases/:caseId/tasks
**Purpose**: Add advocacy task  
**Permission**: `agent_portal:claims`

**Path Params**: `caseId`

**Request Body**:
```json
{
  "title": "string",
  "description": "string",
  "assignedToPartyId": "string",
  "dueDate": "ISO8601"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "taskId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

---

### POST /agent-portal/claims/:claimId/adjuster-referrals
**Purpose**: Create adjuster referral  
**Permission**: `agent_portal:claims`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "caseId": "string",
  "adjusterOrganizationId": "string",
  "adjusterPartyId": "string",
  "estimatedFeeAmount": 123.45,
  "estimatedFeeCurrency": "IRR"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "referralId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

---

### POST /agent-portal/claims/:claimId/projections
**Purpose**: Add claim projection  
**Permission**: `agent_portal:claims`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "brokerOrganizationId": "string",
  "carrierOrganizationId": "string",
  "externalClaimId": "string",
  "sourceSystemId": "string",
  "payload": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "projectionId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

---

### POST /agent-portal/claims/:claimId/recovery
**Purpose**: Create recovery case  
**Permission**: `agent_portal:claims`

**Path Params**: `claimId`

**Request Body**:
```json
{
  "responsiblePartyId": "string",
  "expectedRecoveryAmount": 123.45,
  "expectedRecoveryCurrency": "IRR"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "recoveryId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

---

### POST /agent-portal/advocacy-cases/:caseId/escalate
**Purpose**: Escalate case  
**Permission**: `agent_portal:claims`

**Path Params**: `caseId`

**Request Body**:
```json
{
  "reason": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "caseId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

---

### POST /agent-portal/advocacy-cases/:caseId/communications
**Purpose**: Add advocacy communication  
**Permission**: `agent_portal:claims`

**Path Params**: `caseId`

**Request Body**:
```json
{
  "channel": "string",
  "direction": "inbound|outbound",
  "contentRef": "string",
  "partyId": "string",
  "subject": "string",
  "summary": "string",
  "isPii": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "communicationId": "UUID"
  },
  "correlationId": "string"
}
```

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for agent-portal-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "agent-portal-service",
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

**Total Endpoints**: 21

**By Controller**:
- agent-portal.controller.ts: 20
- health.controller.ts: 1

**Session Management**:
1. Create → `/agent-portal/session`
2. Validate → `/agent-portal/session/:sessionId/validate`
3. Revoke → `/agent-portal/session/:sessionId/revoke`
4. Revoke All → `/agent-portal/agent/:agentId/revoke-all`

**Agent Dashboard**:
1. Dashboard Stats → `/agent-portal/agent/:agentId/dashboard`
2. Policies → `/agent-portal/agent/:agentId/policies`
3. Claims → `/agent-portal/agent/:agentId/claims`
4. Customers → `/agent-portal/agent/:agentId/customers`
5. Commissions → `/agent-portal/agent/:agentId/commissions`
6. KPI → `/agent-portal/agent/:agentId/kpi`

**Dashboard Sub-Endpoints**:
1. Premium Trends → `/agent-portal/dashboard/premium-trends`
2. Commission History → `/agent-portal/dashboard/commission-history`
3. Policy Portfolio → `/agent-portal/dashboard/policy-portfolio`
4. Leads → `/agent-portal/leads`

**Advocacy**:
1. Get Advocacy → `/agent-portal/claims/:claimId/advocacy`
2. Open Case → `/agent-portal/claims/:claimId/advocacy-cases`
3. Add Task → `/agent-portal/advocacy-cases/:caseId/tasks`
4. Create Referral → `/agent-portal/claims/:claimId/adjuster-referrals`
5. Add Projection → `/agent-portal/claims/:claimId/projections`
6. Create Recovery → `/agent-portal/claims/:claimId/recovery`
7. Escalate → `/agent-portal/advocacy-cases/:caseId/escalate`
8. Add Communication → `/agent-portal/advocacy-cases/:caseId/communications`

**Permissions**:
- `agent_portal:session` - Session management
- `agent_portal:dashboard` - Dashboard access
- `agent_portal:policies` - Policy access
- `agent_portal:claims` - Claim access
- `agent_portal:customers` - Customer access
- `agent_portal:commissions` - Commission access
- `agent_portal:kpi` - KPI access
- `agent_portal:leads` - Leads access

**Authentication**:
- All endpoints use JWT + PermissionsGuard + AbacGuard + TenantGuard
- Dashboard endpoints forward Authorization header to downstream services
