# Document AI Service - Endpoint Catalog

**Service**: document-ai-service  
**Purpose**: Document AI processing (OCR, classification, redaction, evaluation)  
**Base Path**: `/`

---

## Controllers Overview

1. **document-ai.controller.ts** - Document AI operations (jobs, audit, usage, eval, OCR)
2. **health.controller.ts** - Health check

---

## 1. document-ai.controller.ts

**Base Path**: `/`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (all endpoints except /health)

## Job Management Endpoints

### GET /document-ai/jobs
**Purpose**: List document AI jobs  
**Permission**: `document_ai:jobs:list`

**Query Params**:
- `status` (optional, string)
- `documentId` (optional, string)
- `tenantId` (optional, string)
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
      "jobId": "UUID",
      "documentId": "string",
      "tenantId": "string",
      "status": "pending|processing|completed|failed",
      "operation": "string",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
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

### GET /document-ai/jobs/:jobId
**Purpose**: Get job by ID  
**Permission**: `document_ai:jobs:view`

**Path Params**: `jobId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "UUID",
    "documentId": "string",
    "tenantId": "string",
    "status": "pending|processing|completed|failed",
    "operation": "string",
    "result": {},
    "error": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Job not found

---

### PATCH /document-ai/jobs/:jobId/retry
**Purpose**: Retry failed job  
**Permission**: `document_ai:jobs:retry`

**Path Params**: `jobId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "UUID",
    "documentId": "string",
    "tenantId": "string",
    "status": "pending",
    "operation": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Job not found

---

## Audit Endpoints

### GET /document-ai/audit
**Purpose**: List audit logs  
**Permission**: `document_ai:audit:list`

**Query Params**:
- `documentId` (optional, string)
- `decision` (optional, string)
- `tenantId` (optional, string)
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
      "auditId": "UUID",
      "documentId": "string",
      "tenantId": "string",
      "decision": "string",
      "reason": "string",
      "actorUserId": "string",
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

## Usage Endpoints

### GET /document-ai/usage/daily
**Purpose**: List daily usage statistics  
**Permission**: `document_ai:usage:view`

**Query Params**:
- `tenantId` (optional, string)
- `usageDate` (optional, string - ISO8601 date)
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
      "tenantId": "string",
      "usageDate": "ISO8601",
      "operations": 0,
      "tokens": 0,
      "cost": 0
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

## Evaluation Case Endpoints

### GET /document-ai/eval/cases
**Purpose**: List evaluation cases  
**Permission**: `document_ai:eval:cases:list`

**Query Params**:
- `enabled` (optional, string - "true" or "false")
- `tag` (optional, string)
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
      "caseId": "UUID",
      "name": "string",
      "documentId": "string",
      "expected": {},
      "tags": [],
      "enabled": true,
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
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

### POST /document-ai/eval/cases
**Purpose**: Create evaluation case  
**Permission**: `document_ai:eval:cases:manage`

**Request Body**:
```json
{
  "name": "string (required, min 3 chars)",
  "documentId": "string (required, min 10 chars)",
  "expected": {} (required),
  "tags": [],
  "enabled": true
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "caseId": "UUID",
    "name": "string",
    "documentId": "string",
    "expected": {},
    "tags": [],
    "enabled": true,
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - name is required (min 3 chars), documentId is required, expected must be an object
- `INTERNAL_ERROR` - Failed to create eval case

---

### PATCH /document-ai/eval/cases/:caseId
**Purpose**: Update evaluation case  
**Permission**: `document_ai:eval:cases:manage`

**Path Params**: `caseId`

**Request Body**:
```json
{
  "name": "string",
  "expected": {},
  "tags": [],
  "enabled": true
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "caseId": "UUID",
    "name": "string",
    "documentId": "string",
    "expected": {},
    "tags": [],
    "enabled": true,
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Eval case not found
- `INTERNAL_ERROR` - Failed to update eval case

---

## Evaluation Run Endpoints

### GET /document-ai/eval/runs
**Purpose**: List evaluation runs  
**Permission**: `document_ai:eval:runs:list`

**Query Params**:
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
      "runId": "UUID",
      "status": "pending|running|completed|failed",
      "totalCases": 0,
      "passedCases": 0,
      "failedCases": 0,
      "startedAt": "ISO8601",
      "completedAt": "ISO8601"
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

### POST /document-ai/eval/runs
**Purpose**: Start evaluation run  
**Permission**: `document_ai:eval:runs:start`

**Request Body**:
```json
{
  "caseIds": [],
  "tags": []
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "runId": "UUID",
    "status": "pending",
    "totalCases": 0,
    "passedCases": 0,
    "failedCases": 0,
    "startedAt": "ISO8601",
    "completedAt": null
  },
  "correlationId": "string"
}
```

**Errors**:
- `INTERNAL_ERROR` - Failed to start eval run

---

### GET /document-ai/eval/runs/:runId
**Purpose**: Get evaluation run by ID  
**Permission**: `document_ai:eval:runs:view`

**Path Params**: `runId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "runId": "UUID",
    "status": "pending|running|completed|failed",
    "totalCases": 0,
    "passedCases": 0,
    "failedCases": 0,
    "startedAt": "ISO8601",
    "completedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Eval run not found

---

### GET /document-ai/eval/runs/:runId/results
**Purpose**: List evaluation run results  
**Permission**: `document_ai:eval:runs:view`

**Path Params**: `runId`

**Query Params**:
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
      "resultId": "UUID",
      "runId": "UUID",
      "caseId": "UUID",
      "passed": true,
      "actual": {},
      "expected": {},
      "error": "string",
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

## Document Processing Endpoints

### POST /document-ai/documents/:documentId/redact
**Purpose**: Redact PII from document  
**Permission**: `document_ai:ocr:redact`

**Path Params**: `documentId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "documentId": "string",
    "redactedFields": [],
    "redactedText": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Document not found
- `INTERNAL_ERROR` - Internal server error

---

### POST /document-ai/documents/:documentId/classify
**Purpose**: Classify document type  
**Permission**: `document_ai:ocr:classify`

**Path Params**: `documentId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "documentId": "string",
    "documentType": "string",
    "confidence": 0.95
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Document not found
- `INTERNAL_ERROR` - Internal server error

---

### POST /document-ai/documents/:documentId/confirm
**Purpose**: Confirm extracted document fields  
**Permission**: `document_ai:ocr:confirm`

**Path Params**: `documentId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "documentId": "string",
    "fields": {},
    "confirmedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Document not found
- `INTERNAL_ERROR` - Internal server error

---

## OCR Endpoints

### POST /api/v1/ocr/extract
**Purpose**: Extract text from image (inline OCR)  
**Permission**: `document_ai:ocr:extract`

**Request Body**:
```json
{
  "fileBase64": "string (required)",
  "mimeType": "string (default: image/png)",
  "provider": "TESSERACT|GEMINI|DEEPSEEK (default: TESSERACT)",
  "language": "string (default: fas+eng)"
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "text": "string",
    "confidence": 0.95,
    "provider": "TESSERACT",
    "language": "fas+eng"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - fileBase64 is required
- `OCR_ERROR` - OCR extraction failed

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for document-ai-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "document-ai-service",
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

**Total Endpoints**: 13

**By Controller**:
- document-ai.controller.ts: 12
- health.controller.ts: 1

**Job Lifecycle**:
1. List → `/document-ai/jobs`
2. Get → `/document-ai/jobs/:jobId`
3. Retry → `/document-ai/jobs/:jobId/retry`

**Audit**:
1. List → `/document-ai/audit`

**Usage**:
1. Daily → `/document-ai/usage/daily`

**Eval Case Lifecycle**:
1. List → `/document-ai/eval/cases`
2. Create → `/document-ai/eval/cases`
3. Update → `/document-ai/eval/cases/:caseId`

**Eval Run Lifecycle**:
1. List → `/document-ai/eval/runs`
2. Start → `/document-ai/eval/runs`
3. Get → `/document-ai/eval/runs/:runId`
4. Results → `/document-ai/eval/runs/:runId/results`

**Document Processing**:
1. Redact → `/document-ai/documents/:documentId/redact`
2. Classify → `/document-ai/documents/:documentId/classify`
3. Confirm → `/document-ai/documents/:documentId/confirm`

**OCR**:
1. Extract → `/api/v1/ocr/extract`

**Permissions**:
- `document_ai:jobs:list` - List jobs
- `document_ai:jobs:view` - View job details
- `document_ai:jobs:retry` - Retry failed jobs
- `document_ai:audit:list` - List audit logs
- `document_ai:usage:view` - View usage statistics
- `document_ai:eval:cases:list` - List evaluation cases
- `document_ai:eval:cases:manage` - Create/update evaluation cases
- `document_ai:eval:runs:list` - List evaluation runs
- `document_ai:eval:runs:start` - Start evaluation runs
- `document_ai:eval:runs:view` - View evaluation runs and results
- `document_ai:ocr:redact` - Redact PII from documents
- `document_ai:ocr:classify` - Classify documents
- `document_ai:ocr:confirm` - Confirm extracted fields
- `document_ai:ocr:extract` - Extract text via OCR

**Authentication**:
- All endpoints except `/health` use JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard

**OCR Providers**:
- TESSERACT - Local Tesseract OCR
- GEMINI - Google Gemini Vision
- DEEPSEEK - DeepSeek Vision

**Job Status**:
- pending, processing, completed, failed

**Eval Run Status**:
- pending, running, completed, failed
