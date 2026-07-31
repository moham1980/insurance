# Reporting Service - Endpoint Catalog

**Service**: reporting-service  
**Purpose**: Reporting, KPI management, governance policies, external system sync, financial/market/satisfaction KPIs  
**Base Path**: `/`

---

## Controllers Overview

1. **reporting.controller.ts** - Reporting operations (KPIs, RI, claims, fraud, complaints, policies, payments, sales partners, AML, underwriting, external systems, financial/market/satisfaction KPIs)
2. **health.controller.ts** - Health check with database connectivity

---

## 1. reporting.controller.ts

**Base Path**: `/reporting`  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard

## KPI Endpoints

### GET /reporting/kpis/ready
**Purpose**: Get ready KPIs  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "readyKpis": ["string"],
    "now": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /reporting/kpis/governance
**Purpose**: List governance policies  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:projections:admin`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "kpiKey": "string",
      "allowedPeriodGranularities": ["day", "week", "month", "quarter", "year"],
      "allowedSourceSystems": ["string"],
      "expectedUnit": "string",
      "minValue": 0,
      "maxValue": 100,
      "enforced": true
    }
  ],
  "correlationId": "string"
}
```

---

### GET /reporting/kpis/governance/:kpiKey
**Purpose**: Get governance policy by KPI key  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:projections:admin`

**Path Params**: `kpiKey`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "kpiKey": "string",
    "allowedPeriodGranularities": ["day", "week", "month", "quarter", "year"],
    "allowedSourceSystems": ["string"],
    "expectedUnit": "string",
    "minValue": 0,
    "maxValue": 100,
    "enforced": true
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Governance policy not found

---

### PUT /reporting/kpis/governance/:kpiKey
**Purpose**: Upsert governance policy  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:projections:admin`

**Path Params**: `kpiKey`

**Request Body**:
```json
{
  "allowedPeriodGranularities": ["day", "week", "month", "quarter", "year"],
  "allowedSourceSystems": ["string"],
  "expectedUnit": "string",
  "minValue": 0,
  "maxValue": 100,
  "enforced": true
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
    "kpiKey": "string",
    "allowedPeriodGranularities": ["day", "week", "month", "quarter", "year"],
    "allowedSourceSystems": ["string"],
    "expectedUnit": "string",
    "minValue": 0,
    "maxValue": 100,
    "enforced": true
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Invalid governance policy (kpiKey required, allowedPeriodGranularities required, allowedSourceSystems required, minValue must be number or null, maxValue must be number or null, minValue must be <= maxValue, enforced required)

---

### POST /reporting/kpis/snapshots
**Purpose**: Ingest KPI snapshot  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:ingest`

**Request Body**:
```json
{
  "kpiKey": "string",
  "value": 100,
  "periodStart": "ISO8601",
  "periodEnd": "ISO8601",
  "unit": "string",
  "periodGranularity": "day|week|month|quarter|year",
  "sourceSystem": "string",
  "officialSourceSystem": "string",
  "metadata": {}
}
```

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)
- `Idempotency-Key` (required, min length 8)

**Response**:
```json
{
  "success": true,
  "data": {
    "snapshotId": "string",
    "kpiKey": "string",
    "value": 100,
    "periodStart": "ISO8601",
    "periodEnd": "ISO8601",
    "unit": "string",
    "periodGranularity": "day|week|month|quarter|year",
    "sourceSystem": "string",
    "officialSourceSystem": "string",
    "ingestedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Invalid KPI snapshot (Idempotency-Key header required, kpiKey required, value required, periodStart required, periodEnd required, governance policy validation errors)

**Governed Gap KPIs**:
- customer_satisfaction_rate
- financial_solvency_ratio
- market_share_percent

**Governance Validation**:
- For governed KPIs, governance policy must be configured
- periodGranularity and officialSourceSystem required for governed KPIs
- If enforced: periodGranularity must be in allowedPeriodGranularities, sourceSystem must be in allowedSourceSystems, officialSourceSystem must be in allowedSourceSystems, unit must match expectedUnit, value must be within minValue and maxValue
- Period boundary validation for enforced policies (day: start of UTC day, week: start of ISO week, month: start of UTC month, quarter: start of UTC quarter, year: start of UTC year)

---

### GET /reporting/kpis/snapshots
**Purpose**: List KPI snapshots  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Query Params**:
- `kpiKey` (optional, string)
- `periodStart` (optional, ISO8601)
- `periodEnd` (optional, ISO8601)
- `limit` (default: 50, max: 200)
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
      "snapshotId": "string",
      "kpiKey": "string",
      "value": 100,
      "periodStart": "ISO8601",
      "periodEnd": "ISO8601",
      "unit": "string",
      "periodGranularity": "day|week|month|quarter|year",
      "sourceSystem": "string",
      "officialSourceSystem": "string",
      "ingestedAt": "ISO8601"
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
- `VALIDATION_ERROR` - Invalid query (periodStart must be valid date, periodEnd must be valid date)

---

### GET /reporting/kpis/financial
**Purpose**: Get financial KPIs  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Query Params**:
- `startDate` (required, ISO8601)
- `endDate` (required, ISO8601)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "totalPremium": 0,
    "totalClaims": 0,
    "lossRatio": 0,
    "combinedRatio": 0,
    "grossWrittenPremium": 0,
    "netWrittenPremium": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - startDate and endDate must be valid dates
- `INTERNAL_ERROR` - Failed to get financial KPIs

---

### GET /reporting/kpis/market-share
**Purpose**: Get market share KPIs  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Query Params**:
- `startDate` (required, ISO8601)
- `endDate` (required, ISO8601)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "marketSharePercent": 0,
    "totalPolicies": 0,
    "newPolicies": 0,
    "renewedPolicies": 0,
    "lapsedPolicies": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - startDate and endDate must be valid dates
- `INTERNAL_ERROR` - Failed to get market share KPIs

---

### GET /reporting/kpis/satisfaction
**Purpose**: Get satisfaction KPIs  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Query Params**:
- `startDate` (required, ISO8601)
- `endDate` (required, ISO8601)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "customerSatisfactionRate": 0,
    "npsScore": 0,
    "complaintRate": 0,
    "resolutionTimeAvg": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - startDate and endDate must be valid dates
- `INTERNAL_ERROR` - Failed to get satisfaction KPIs

---

## Reinsurance Reporting Endpoints

### GET /reporting/ri/ceded
**Purpose**: List RI ceded  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Query Params**:
- `contractId` (optional, string)
- `policyId` (optional, string)
- `claimId` (optional, string)
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
      "cededId": "string",
      "contractId": "string",
      "policyId": "string",
      "claimId": "string",
      "cededAmount": 0,
      "cededAt": "ISO8601"
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

### GET /reporting/ri/borderaux
**Purpose**: List RI borderaux  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Query Params**:
- `contractId` (optional, string)
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
      "borderauxId": "string",
      "contractId": "string",
      "periodStart": "ISO8601",
      "periodEnd": "ISO8601",
      "totalCeded": 0,
      "status": "draft|submitted|accepted|rejected"
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

### GET /reporting/ri/recoveries
**Purpose**: List RI recoveries  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Query Params**:
- `contractId` (optional, string)
- `claimId` (optional, string)
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
      "recoveryId": "string",
      "contractId": "string",
      "claimId": "string",
      "recoveryAmount": 0,
      "recoveredAt": "ISO8601"
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

## Claims Reporting Endpoints

### GET /reporting/claims/payments
**Purpose**: List claim payments  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Query Params**:
- `claimId` (optional, string)
- `policyId` (optional, string)
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
      "paymentId": "string",
      "claimId": "string",
      "policyId": "string",
      "amount": 0,
      "paidAt": "ISO8601"
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

### GET /reporting/claims/documents-attached
**Purpose**: List claim documents attached  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Query Params**:
- `claimId` (optional, string)
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
      "documentId": "string",
      "claimId": "string",
      "documentType": "string",
      "attachedAt": "ISO8601"
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

## Fraud Reporting Endpoints

### GET /reporting/fraud/case-escalations
**Purpose**: List fraud case escalations  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Query Params**:
- `claimId` (optional, string)
- `fraudCaseId` (optional, string)
- `toUnit` (optional, string)
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
      "escalationId": "string",
      "fraudCaseId": "string",
      "claimId": "string",
      "toUnit": "string",
      "escalatedAt": "ISO8601"
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

## Complaints Reporting Endpoints

### GET /reporting/complaints/sla-breaches
**Purpose**: List complaint SLA breaches  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Query Params**:
- `complaintId` (optional, string)
- `claimId` (optional, string)
- `policyId` (optional, string)
- `status` (optional, string)
- `assignedTo` (optional, string)
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
      "complaintId": "string",
      "claimId": "string",
      "policyId": "string",
      "status": "string",
      "assignedTo": "string",
      "slaBreachedAt": "ISO8601"
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

## Dashboard Endpoints

### GET /reporting/dashboard/executive
**Purpose**: Get executive dashboard  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

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
    "totalClaims": 0,
    "openClaims": 0,
    "totalPremium": 0,
    "totalPayments": 0,
    "lossRatio": 0,
    "combinedRatio": 0
  },
  "correlationId": "string"
}
```

---

## Policy Reporting Endpoints

### GET /reporting/policies
**Purpose**: List policies  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Query Params**:
- `policyId` (optional, string)
- `policyNumber` (optional, string)
- `status` (optional, string)
- `holderPartyId` (optional, string)
- `insuredPartyId` (optional, string)
- `lineOfBusiness` (optional, string)
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
      "policyId": "string",
      "policyNumber": "string",
      "status": "string",
      "holderPartyId": "string",
      "insuredPartyId": "string",
      "lineOfBusiness": "string",
      "premium": 0,
      "inceptionDate": "ISO8601"
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

### GET /reporting/policies/:policyId
**Purpose**: Get policy by ID  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Path Params**: `policyId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "policyId": "string",
    "policyNumber": "string",
    "status": "string",
    "holderPartyId": "string",
    "insuredPartyId": "string",
    "lineOfBusiness": "string",
    "premium": 0,
    "inceptionDate": "ISO8601",
    "expiryDate": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Policy not found

---

## Payment Reporting Endpoints

### GET /reporting/payments
**Purpose**: List payments  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Query Params**:
- `paymentId` (optional, string)
- `paymentNumber` (optional, string)
- `policyId` (optional, string)
- `claimId` (optional, string)
- `status` (optional, string)
- `paymentType` (optional, string)
- `partyId` (optional, string)
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
      "paymentId": "string",
      "paymentNumber": "string",
      "policyId": "string",
      "claimId": "string",
      "status": "string",
      "paymentType": "string",
      "partyId": "string",
      "amount": 0,
      "paidAt": "ISO8601"
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

### GET /reporting/payments/:paymentId
**Purpose**: Get payment by ID  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Path Params**: `paymentId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentId": "string",
    "paymentNumber": "string",
    "policyId": "string",
    "claimId": "string",
    "status": "string",
    "paymentType": "string",
    "partyId": "string",
    "amount": 0,
    "paidAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Payment not found

---

## Sales Partner Reporting Endpoints

### GET /reporting/sales-partners
**Purpose**: List sales partners  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Query Params**:
- `partnerId` (optional, string)
- `orgUnitId` (optional, string)
- `status` (optional, string)
- `partnerType` (optional, string)
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
      "partnerId": "string",
      "orgUnitId": "string",
      "status": "string",
      "partnerType": "string",
      "name": "string",
      "commissionRate": 0
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

### GET /reporting/sales-partners/:partnerId
**Purpose**: Get sales partner by ID  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Path Params**: `partnerId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "partnerId": "string",
    "orgUnitId": "string",
    "status": "string",
    "partnerType": "string",
    "name": "string",
    "commissionRate": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Sales partner not found

---

## AML Reporting Endpoints

### GET /reporting/aml-transactions
**Purpose**: List AML transactions  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Query Params**:
- `transactionId` (optional, string)
- `partyId` (optional, string)
- `status` (optional, string)
- `riskLevel` (optional, string)
- `transactionType` (optional, string)
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
      "transactionId": "string",
      "partyId": "string",
      "status": "string",
      "riskLevel": "string",
      "transactionType": "string",
      "amount": 0,
      "transactionDate": "ISO8601"
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

### GET /reporting/aml-transactions/:transactionId
**Purpose**: Get AML transaction by ID  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Path Params**: `transactionId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "transactionId": "string",
    "partyId": "string",
    "status": "string",
    "riskLevel": "string",
    "transactionType": "string",
    "amount": 0,
    "transactionDate": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - AML transaction not found

---

## Underwriting Reporting Endpoints

### GET /reporting/underwriting-requests
**Purpose**: List underwriting requests  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Query Params**:
- `requestId` (optional, string)
- `policyId` (optional, string)
- `status` (optional, string)
- `riskLevel` (optional, string)
- `underwriterId` (optional, string)
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
      "requestId": "string",
      "policyId": "string",
      "status": "string",
      "riskLevel": "string",
      "underwriterId": "string",
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

---

### GET /reporting/underwriting-requests/:requestId
**Purpose**: Get underwriting request by ID  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Path Params**: `requestId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "requestId": "string",
    "policyId": "string",
    "status": "string",
    "riskLevel": "string",
    "underwriterId": "string",
    "submittedAt": "ISO8601",
    "decision": "string",
    "decisionAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Underwriting request not found

---

## External System Connection Endpoints

### POST /reporting/external-systems
**Purpose**: Create external system connection  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:manage`

**Request Body**:
```json
{
  "systemName": "string",
  "systemType": "string",
  "connectionConfig": {},
  "syncFrequencyMinutes": 60,
  "enabledDataTypes": ["string"]
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
    "connectionId": "string",
    "systemName": "string",
    "systemType": "string",
    "connectionConfig": {},
    "syncFrequencyMinutes": 60,
    "enabledDataTypes": ["string"],
    "status": "active|inactive",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - systemName, systemType, and connectionConfig are required
- `INTERNAL_ERROR` - Failed to create connection

---

### PUT /reporting/external-systems/:connectionId
**Purpose**: Update external system connection  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:manage`

**Path Params**: `connectionId`

**Request Body**:
```json
{
  "systemName": "string",
  "connectionConfig": {},
  "syncFrequencyMinutes": 60,
  "enabledDataTypes": ["string"],
  "status": "active|inactive"
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
    "connectionId": "string",
    "systemName": "string",
    "systemType": "string",
    "connectionConfig": {},
    "syncFrequencyMinutes": 60,
    "enabledDataTypes": ["string"],
    "status": "active|inactive",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Connection not found
- `INTERNAL_ERROR` - Failed to update connection

---

### GET /reporting/external-systems/:connectionId
**Purpose**: Get external system connection by ID  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Path Params**: `connectionId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "connectionId": "string",
    "systemName": "string",
    "systemType": "string",
    "connectionConfig": {},
    "syncFrequencyMinutes": 60,
    "enabledDataTypes": ["string"],
    "status": "active|inactive",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Connection not found

---

### GET /reporting/external-systems
**Purpose**: List external system connections  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Query Params**:
- `systemType` (optional, string)
- `status` (optional, string)
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
      "connectionId": "string",
      "systemName": "string",
      "systemType": "string",
      "status": "active|inactive",
      "syncFrequencyMinutes": 60,
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

### POST /reporting/external-systems/:connectionId/sync
**Purpose**: Sync to external system  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:manage`

**Path Params**: `connectionId`

**Request Body**:
```json
{
  "dataType": "string",
  "startDate": "ISO8601",
  "endDate": "ISO8601"
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
    "syncId": "string",
    "connectionId": "string",
    "dataType": "string",
    "startDate": "ISO8601",
    "endDate": "ISO8601",
    "syncedRecords": 0,
    "syncedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to sync

---

### GET /reporting/external-systems/:connectionId/sync-status
**Purpose**: Get external system sync status  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:view`

**Path Params**: `connectionId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "connectionId": "string",
    "lastSyncAt": "ISO8601",
    "lastSyncStatus": "success|failed|in_progress",
    "lastSyncRecords": 0,
    "nextSyncAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Connection not found

---

### POST /reporting/external-systems/:connectionId/delete
**Purpose**: Delete external system connection  
**Auth**: JwtAuthGuard, TenantGuard, PermissionsGuard  
**Permission**: `reporting:manage`

**Path Params**: `connectionId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "deleted": true
  },
  "correlationId": "string"
}
```

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for reporting-service with database connectivity  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "reporting-service",
  "timestamp": "ISO8601",
  "uptime": 0,
  "components": {
    "db": "ok|error"
  }
}
```

**Errors**:
- `degraded` status returned if database connection fails
- Error message included in response

---

## Summary

**Total Endpoints**: 35

**By Controller**:
- reporting.controller.ts: 34
- health.controller.ts: 1

**Authentication**:
- `/health` - Public
- All other endpoints use JwtAuthGuard, TenantGuard, PermissionsGuard

**KPI Operations**:
1. Ready KPIs → `/reporting/kpis/ready` (permission: `reporting:view`)
2. List Governance Policies → `/reporting/kpis/governance` (permission: `reporting:projections:admin`)
3. Get Governance Policy → `/reporting/kpis/governance/:kpiKey` (permission: `reporting:projections:admin`)
4. Upsert Governance Policy → `/reporting/kpis/governance/:kpiKey` (permission: `reporting:projections:admin`)
5. Ingest Snapshot → `/reporting/kpis/snapshots` (permission: `reporting:ingest`)
6. List Snapshots → `/reporting/kpis/snapshots` (permission: `reporting:view`)
7. Financial KPIs → `/reporting/kpis/financial` (permission: `reporting:view`)
8. Market Share KPIs → `/reporting/kpis/market-share` (permission: `reporting:view`)
9. Satisfaction KPIs → `/reporting/kpis/satisfaction` (permission: `reporting:view`)

**Reinsurance Reporting**:
1. List RI Ceded → `/reporting/ri/ceded` (permission: `reporting:view`)
2. List RI Borderaux → `/reporting/ri/borderaux` (permission: `reporting:view`)
3. List RI Recoveries → `/reporting/ri/recoveries` (permission: `reporting:view`)

**Claims Reporting**:
1. List Claim Payments → `/reporting/claims/payments` (permission: `reporting:view`)
2. List Claim Documents → `/reporting/claims/documents-attached` (permission: `reporting:view`)

**Fraud Reporting**:
1. List Fraud Escalations → `/reporting/fraud/case-escalations` (permission: `reporting:view`)

**Complaints Reporting**:
1. List SLA Breaches → `/reporting/complaints/sla-breaches` (permission: `reporting:view`)

**Dashboard**:
1. Executive Dashboard → `/reporting/dashboard/executive` (permission: `reporting:view`)

**Policy Reporting**:
1. List Policies → `/reporting/policies` (permission: `reporting:view`)
2. Get Policy → `/reporting/policies/:policyId` (permission: `reporting:view`)

**Payment Reporting**:
1. List Payments → `/reporting/payments` (permission: `reporting:view`)
2. Get Payment → `/reporting/payments/:paymentId` (permission: `reporting:view`)

**Sales Partner Reporting**:
1. List Sales Partners → `/reporting/sales-partners` (permission: `reporting:view`)
2. Get Sales Partner → `/reporting/sales-partners/:partnerId` (permission: `reporting:view`)

**AML Reporting**:
1. List AML Transactions → `/reporting/aml-transactions` (permission: `reporting:view`)
2. Get AML Transaction → `/reporting/aml-transactions/:transactionId` (permission: `reporting:view`)

**Underwriting Reporting**:
1. List Underwriting Requests → `/reporting/underwriting-requests` (permission: `reporting:view`)
2. Get Underwriting Request → `/reporting/underwriting-requests/:requestId` (permission: `reporting:view`)

**External System Connections**:
1. Create Connection → `/reporting/external-systems` (permission: `reporting:manage`)
2. Update Connection → `/reporting/external-systems/:connectionId` (permission: `reporting:manage`)
3. Get Connection → `/reporting/external-systems/:connectionId` (permission: `reporting:view`)
4. List Connections → `/reporting/external-systems` (permission: `reporting:view`)
5. Sync to System → `/reporting/external-systems/:connectionId/sync` (permission: `reporting:manage`)
6. Sync Status → `/reporting/external-systems/:connectionId/sync-status` (permission: `reporting:view`)
7. Delete Connection → `/reporting/external-systems/:connectionId/delete` (permission: `reporting:manage`)

**Permissions**:
- `reporting:view` - View reports and data
- `reporting:ingest` - Ingest KPI snapshots
- `reporting:projections:admin` - Manage governance policies
- `reporting:manage` - Manage external system connections

**Governed Gap KPIs**:
- customer_satisfaction_rate
- financial_solvency_ratio
- market_share_percent

**Period Granularities**:
- day - Day
- week - Week (ISO week starting Monday)
- month - Month
- quarter - Quarter
- year - Year

**Period Boundary Validation**:
- day: periodStart must be start of UTC day (00:00:00.000), periodEnd must be start of next UTC day
- week: periodStart must be start of ISO week (Monday 00:00 UTC), periodEnd must be start of next ISO week
- month: periodStart must be start of UTC month (1st 00:00 UTC), periodEnd must be start of next UTC month
- quarter: periodStart must be start of UTC quarter (Jan/Apr/Jul/Oct 1st 00:00 UTC), periodEnd must be start of next UTC quarter
- year: periodStart must be start of UTC year (Jan 1 00:00 UTC), periodEnd must be start of next UTC year

**External System Connection Status**:
- active - Active
- inactive - Inactive

**Sync Status**:
- success - Success
- failed - Failed
- in_progress - In progress

**Pagination**:
- Default limit: 50
- Maximum limit: 200 (snapshots list)
- Default offset: 0

**Idempotency**:
- KPI snapshot ingestion requires Idempotency-Key header (min length 8)
- Prevents duplicate ingestion of same snapshot

**Governance Policy Enforcement**:
- If enforced = true, all validation rules are applied
- If enforced = false, governance policy exists but validation is not enforced
- Allows gradual rollout of governance policies

**Financial KPIs**:
- totalPremium - Total premium
- totalClaims - Total claims
- lossRatio - Loss ratio
- combinedRatio - Combined ratio
- grossWrittenPremium - Gross written premium
- netWrittenPremium - Net written premium

**Market Share KPIs**:
- marketSharePercent - Market share percentage
- totalPolicies - Total policies
- newPolicies - New policies
- renewedPolicies - Renewed policies
- lapsedPolicies - Lapsed policies

**Satisfaction KPIs**:
- customerSatisfactionRate - Customer satisfaction rate
- npsScore - NPS score
- complaintRate - Complaint rate
- resolutionTimeAvg - Average resolution time

**Audit Logging**:
- All operations are logged with correlationId, tenantId, actorUserId, and action
- Create/update/delete operations logged with success/error status
- External system sync operations logged with syncedRecords count

**External System Sync**:
- Supports configurable sync frequency (in minutes)
- Can sync specific data types
- Supports date range filtering for sync
- Tracks last sync status and next scheduled sync
