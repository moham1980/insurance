# Copilot Service - Endpoint Catalog

**Service**: copilot-service  
**Purpose**: AI-powered copilot for claims, documents, QA, model governance, incident management, NBA, RAG  
**Base Path**: `/`

---

## Controllers Overview

1. **copilot.controller.ts** - Copilot operations (summary, QA, NBA, model governance, incidents, RAG)
2. **health.controller.ts** - Health check

---

## 1. copilot.controller.ts

**Base Path**: `/`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (all endpoints except /health)

### GET /health
**Purpose**: Health check for copilot-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "copilot-service",
  "timestamp": "ISO8601",
  "uptime": 123.45,
  "components": {
    "db": "ok|error"
  },
  "error": "string (only if degraded)"
}
```

---

## Summary Endpoints

### POST /copilot/claims/:claimId/summary
**Purpose**: Generate claim summary  
**Permission**: `copilot:claims:summary`

**Path Params**: `claimId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

### POST /copilot/documents/:documentId/summary
**Purpose**: Generate document summary  
**Permission**: `copilot:documents:summary`

**Path Params**: `documentId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

## QA & Assistant Endpoints

### POST /copilot/qa
**Purpose**: Ask question with context  
**Permission**: `copilot:qa`

**Request Body**:
```json
{
  "contextType": "string",
  "resourceId": "string",
  "question": "string",
  "provider": "string"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

### POST /copilot/next-best-action
**Purpose**: Get next best action  
**Permission**: `copilot:next-best-action`

**Request Body**:
```json
{
  "contextType": "string",
  "resourceId": "string",
  "provider": "string"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

### POST /copilot/underwriting/assist
**Purpose**: Assist underwriting decision  
**Permission**: `copilot:qa`

**Request Body**:
```json
{
  "policyId": "string",
  "customerId": "string",
  "productType": "string",
  "coverageAmount": 0,
  "riskFactors": [],
  "provider": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to assist underwriting

---

### POST /copilot/complaints/triage
**Purpose**: Triage complaint  
**Permission**: `copilot:qa`

**Request Body**:
```json
{
  "complaintId": "string",
  "customerId": "string",
  "description": "string",
  "category": "string",
  "severity": "string",
  "provider": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to triage complaint

---

### POST /copilot/recovery/discover
**Purpose**: Discover recovery opportunities  
**Permission**: `copilot:qa`

**Request Body**:
```json
{
  "claimId": "string",
  "customerId": "string",
  "policyId": "string",
  "lossAmount": 0,
  "coverageType": "string",
  "provider": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to discover recovery

---

### POST /copilot/pricing/assist
**Purpose**: Assist pricing decision  
**Permission**: `copilot:qa`

**Request Body**:
```json
{
  "customerId": "string",
  "productType": "string",
  "coverageAmount": 0,
  "riskProfile": {},
  "marketData": {},
  "provider": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to assist pricing

---

### POST /copilot/selfservice/assist
**Purpose**: Assist self-service  
**Permission**: `copilot:view`

**Request Body**:
```json
{
  "customerId": "string",
  "query": "string",
  "intent": "string",
  "context": {},
  "provider": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to assist self-service

---

### POST /copilot/ecosystem/consult
**Purpose**: Consult ecosystem AI gateway  
**Permission**: `copilot:qa`

**Request Body**:
```json
{
  "query": "string (required)",
  "context": "string",
  "contextType": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - query is required
- `ECOSYSTEM_AI_ERROR` - Ecosystem AI error

---

### POST /copilot/recommend-product
**Purpose**: Recommend product  
**Permission**: `copilot:qa`

**Request Body**:
```json
{
  "customerId": "string",
  "customerProfile": {},
  "productType": "string",
  "budget": 0,
  "riskFactors": []
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to recommend product

---

### POST /copilot/draft-communication
**Purpose**: Draft communication  
**Permission**: `copilot:qa`

**Request Body**:
```json
{
  "type": "email",
  "recipient": "string",
  "subject": "string",
  "context": {},
  "contextType": "string",
  "tone": "string",
  "language": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to draft communication

---

## Provider Endpoints

### GET /copilot/providers
**Purpose**: Get available AI providers  
**Permission**: `copilot:view`

**Response**:
```json
{
  "success": true,
  "data": {
    "providers": ["string"]
  }
}
```

---

## Model Inventory Endpoints

### POST /copilot/models/register
**Purpose**: Register AI model  
**Permission**: `copilot:manage`

**Request Body**:
```json
{
  "modelName": "string",
  "modelType": "string",
  "version": "string",
  "provider": "string",
  "description": "string",
  "parameters": {},
  "riskLevel": "string",
  "trainingDataSummary": {},
  "performanceMetrics": {},
  "tags": []
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "modelId": "UUID"
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to register model

---

### PUT /copilot/models/:modelId/status
**Purpose**: Update model status  
**Permission**: `copilot:manage`

**Path Params**: `modelId`

**Request Body**:
```json
{
  "status": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "modelId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Model not found
- `INTERNAL_ERROR` - Failed to update model status

---

### GET /copilot/models/:modelId
**Purpose**: Get model by ID  
**Permission**: `copilot:view`

**Path Params**: `modelId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Model not found

---

### GET /copilot/models
**Purpose**: List models  
**Permission**: `copilot:view`

**Query Params**:
- `modelType` (optional, string)
- `status` (optional, string)
- `riskLevel` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

### DELETE /copilot/models/:modelId
**Purpose**: Delete model  
**Permission**: `copilot:manage`

**Path Params**: `modelId`

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

**Errors**:
- `NOT_FOUND` - Model not found

---

## Risk Assessment Endpoints

### POST /copilot/models/:modelId/risk-assessment
**Purpose**: Create risk assessment  
**Permission**: `copilot:manage`

**Path Params**: `modelId`

**Request Body**:
```json
{
  "assessmentVersion": "string",
  "riskScore": 0,
  "riskFactors": [],
  "mitigationPlan": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "assessmentId": "UUID"
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to create risk assessment

---

### PUT /copilot/risk-assessment/:assessmentId/approve
**Purpose**: Approve risk assessment  
**Permission**: `copilot:manage`

**Path Params**: `assessmentId`

**Request Body**:
```json
{
  "notes": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "assessmentId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Risk assessment not found

---

### PUT /copilot/risk-assessment/:assessmentId/reject
**Purpose**: Reject risk assessment  
**Permission**: `copilot:manage`

**Path Params**: `assessmentId`

**Request Body**:
```json
{
  "notes": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "assessmentId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Risk assessment not found

---

### GET /copilot/risk-assessment/:assessmentId
**Purpose**: Get risk assessment by ID  
**Permission**: `copilot:view`

**Path Params**: `assessmentId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Risk assessment not found

---

### GET /copilot/models/:modelId/risk-assessments
**Purpose**: List risk assessments for model  
**Permission**: `copilot:view`

**Path Params**: `modelId`

**Response**:
```json
{
  "success": true,
  "data": [...],
  "correlationId": "string"
}
```

---

## AI Incident Endpoints

### POST /copilot/incidents
**Purpose**: Create AI incident report  
**Permission**: `copilot:manage`

**Request Body**:
```json
{
  "modelId": "string",
  "incidentType": "string",
  "description": "string",
  "severity": "string",
  "affectedSystems": [],
  "impactSummary": "string",
  "occurredAt": "ISO8601",
  "reportedBy": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "incidentId": "UUID"
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to create incident report

---

### PUT /copilot/incidents/:incidentId/status
**Purpose**: Update incident status  
**Permission**: `copilot:manage`

**Path Params**: `incidentId`

**Request Body**:
```json
{
  "status": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "incidentId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Incident not found

---

### PUT /copilot/incidents/:incidentId/resolve
**Purpose**: Resolve incident  
**Permission**: `copilot:manage`

**Path Params**: `incidentId`

**Request Body**:
```json
{
  "resolution": "string",
  "rootCause": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "incidentId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Incident not found

---

### GET /copilot/incidents/:incidentId
**Purpose**: Get incident by ID  
**Permission**: `copilot:view`

**Path Params**: `incidentId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Incident not found

---

### GET /copilot/incidents
**Purpose**: List incidents  
**Permission**: `copilot:view`

**Query Params**:
- `modelId` (optional, string)
- `severity` (optional, string)
- `status` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

## Model Card Endpoints

### POST /copilot/models/:modelId/model-card
**Purpose**: Create model card  
**Permission**: `copilot:manage`

**Path Params**: `modelId`

**Request Body**:
```json
{
  "version": "string",
  "modelDetails": {},
  "intendedUse": "string",
  "limitations": "string",
  "trainingData": {},
  "evaluationMetrics": {},
  "ethicalConsiderations": "string",
  "citations": []
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "cardId": "UUID"
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to create model card

---

### PUT /copilot/model-card/:cardId
**Purpose**: Update model card  
**Permission**: `copilot:manage`

**Path Params**: `cardId`

**Request Body**:
```json
{
  "modelDetails": {},
  "intendedUse": "string",
  "limitations": "string",
  "trainingData": {},
  "evaluationMetrics": {},
  "ethicalConsiderations": "string",
  "citations": []
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "cardId": "UUID"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Model card not found

---

### GET /copilot/model-card/:cardId
**Purpose**: Get model card by ID  
**Permission**: `copilot:view`

**Path Params**: `cardId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Model card not found

---

### GET /copilot/models/:modelId/model-card
**Purpose**: Get model card by version  
**Permission**: `copilot:view`

**Path Params**: `modelId`

**Query Params**:
- `version` (required, string)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Model card not found

---

### GET /copilot/models/:modelId/model-cards
**Purpose**: List model cards for model  
**Permission**: `copilot:view`

**Path Params**: `modelId`

**Response**:
```json
{
  "success": true,
  "data": [...],
  "correlationId": "string"
}
```

---

## Validation Report Endpoints

### POST /copilot/models/:modelId/validation-report
**Purpose**: Create validation report  
**Permission**: `copilot:manage`

**Path Params**: `modelId`

**Request Body**:
```json
{
  "version": "string",
  "validationType": "string",
  "testResults": {},
  "performanceMetrics": {},
  "dataQualityMetrics": {},
  "biasFairnessMetrics": {},
  "complianceCheck": {},
  "recommendations": []
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "reportId": "UUID"
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to create validation report

---

### PUT /copilot/validation-report/:reportId/status
**Purpose**: Update validation report status  
**Permission**: `copilot:manage`

**Path Params**: `reportId`

**Request Body**:
```json
{
  "status": "string",
  "testResults": {},
  "performanceMetrics": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "reportId": "UUID",
    "status": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Validation report not found

---

### GET /copilot/validation-report/:reportId
**Purpose**: Get validation report by ID  
**Permission**: `copilot:view`

**Path Params**: `reportId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Validation report not found

---

### GET /copilot/models/:modelId/validation-reports
**Purpose**: List validation reports for model  
**Permission**: `copilot:view`

**Path Params**: `modelId`

**Response**:
```json
{
  "success": true,
  "data": [...],
  "correlationId": "string"
}
```

---

## NBA (Next Best Action) Endpoints

### POST /copilot/nba/:contextType/:resourceId/actions
**Purpose**: Generate NBA actions  
**Permission**: `copilot:next-best-action`

**Path Params**: `contextType` (claim|policy|complaint), `resourceId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Unsupported contextType

---

### POST /copilot/nba/:logId/execute
**Purpose**: Execute NBA action  
**Permission**: `copilot:next-best-action`

**Path Params**: `logId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

---

### POST /copilot/nba/:logId/opt-out
**Purpose**: Opt out of NBA action  
**Permission**: `copilot:next-best-action`

**Path Params**: `logId`

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
  "data": { ... },
  "correlationId": "string"
}
```

---

### GET /copilot/nba/actions
**Purpose**: List NBA action logs  
**Permission**: `copilot:view`

**Query Params**:
- `contextType` (required, string)
- `resourceId` (required, string)
- `limit` (default: 50)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 0,
    "limit": 50,
    "offset": 0
  },
  "correlationId": "string"
}
```

---

## Summary

**Total Endpoints**: 41

**By Controller**:
- copilot.controller.ts: 40
- health.controller.ts: 1

**Key Functional Areas**:
- **Summary**: Claims, documents
- **QA & Assistants**: QA, underwriting, complaint triage, recovery discovery, pricing, self-service, ecosystem consult, product recommendation, communication drafting
- **Model Governance**: Model inventory, risk assessment, model cards, validation reports
- **Incident Management**: Create, update status, resolve, list
- **NBA**: Generate, execute, opt-out, list logs

**Permissions**:
- `copilot:claims:summary` - Claim summary
- `copilot:documents:summary` - Document summary
- `copilot:qa` - QA and assistant endpoints
- `copilot:next-best-action` - NBA operations
- `copilot:view` - View models, incidents, risk assessments, model cards, validation reports, NBA logs
- `copilot:manage` - Manage models, risk assessments, incidents, model cards, validation reports

**Authentication**:
- All endpoints except `/health` use JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard
