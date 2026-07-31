# Document Service - Endpoint Catalog

**Service**: document-service  
**Purpose**: Document upload, storage, retrieval, validation, classification, and extraction  
**Base Path**: `/`

---

## Controllers Overview

1. **documents.controller.ts** - Document operations (upload, link, get, download, list, validate, classify, extract, reinsurance)
2. **health.controller.ts** - Health check

---

## 1. documents.controller.ts

**Base Path**: `/`  
**Auth**: JwtAuthGuard + PermissionsGuard + TenantGuard (all endpoints except /download)

## Document Upload Endpoints

### POST /documents/upload
**Purpose**: Upload document (multipart/form-data)  
**Permission**: `documents:upload`

**Request Body** (multipart/form-data):
- `file` (required) - File to upload
- `claimId` (optional, string)
- `documentType` (required, string) - Must be one of: policy, claim, invoice, identity, medical, other

**Headers**:
- `Content-Type: multipart/form-data` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "documentId": "UUID",
    "tenantId": "string",
    "claimId": "string",
    "documentType": "string",
    "fileName": "string",
    "mimeType": "string",
    "fileSize": 0,
    "downloadUrl": "string",
    "downloadUrlExpiresAt": "ISO8601",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId is required
- `VALIDATION_ERROR` - multipart/form-data required, invalid documentType, unsupported file type, file size exceeds limit
- `UPLOAD_ERROR` - Failed to read or stage uploaded file
- `INTERNAL_ERROR` - Internal server error

**Constraints**:
- Allowed MIME types: application/pdf, image/jpeg, image/png, image/tiff, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
- Max file size: 10MB (configurable via MAX_FILE_SIZE env var)

---

### POST /documents/link
**Purpose**: Link external document by storage reference  
**Permission**: `documents:link`

**Request Body**:
```json
{
  "documentType": "string (required)",
  "fileName": "string (required)",
  "storageRef": "string (required)",
  "claimId": "string",
  "mimeType": "string",
  "fileSize": 0
}
```

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "documentId": "UUID",
    "tenantId": "string",
    "claimId": "string",
    "documentType": "string",
    "fileName": "string",
    "mimeType": "string",
    "fileSize": 0,
    "downloadUrl": "string",
    "downloadUrlExpiresAt": "ISO8601",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId is required
- `VALIDATION_ERROR` - documentType, fileName, storageRef are required; invalid documentType
- `INTERNAL_ERROR` - Internal server error

---

## Document Retrieval Endpoints

### GET /documents/:documentId
**Purpose**: Get document metadata  
**Permission**: `documents:view`

**Path Params**: `documentId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "documentId": "UUID",
    "tenantId": "string",
    "claimId": "string",
    "documentType": "string",
    "fileName": "string",
    "mimeType": "string",
    "fileSize": 0,
    "downloadUrl": "string",
    "downloadUrlExpiresAt": "ISO8601",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId is required
- `NOT_FOUND` - Document not found

---

### GET /documents/:documentId/signed-url
**Purpose**: Get signed download URL  
**Permission**: `documents:view`

**Path Params**: `documentId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "downloadUrl": "string",
    "expiresAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId is required
- `NOT_FOUND` - Document not found

---

### GET /documents/:documentId/download
**Purpose**: Download document file  
**Auth**: None (public, but requires valid token)

**Path Params**: `documentId`

**Query Params**:
- `token` (required) - Signed download token

**Response**: File stream with Content-Type header

**Errors**:
- `TOKEN_REQUIRED` - Download token is required
- `INVALID_TOKEN` - Invalid or expired token
- `NOT_FOUND` - Document not found
- `DOWNLOAD_ERROR` - Failed to retrieve file

---

### GET /documents
**Purpose**: List documents  
**Permission**: `documents:list`

**Query Params**:
- `claimId` (optional, string)
- `reconciliationId` (optional, string)
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
      "documentId": "UUID",
      "tenantId": "string",
      "claimId": "string",
      "documentType": "string",
      "fileName": "string",
      "mimeType": "string",
      "fileSize": 0,
      "downloadUrl": "string",
      "downloadUrlExpiresAt": "ISO8601",
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
- `TENANT_REQUIRED` - tenantId is required

---

## Document Processing Endpoints

### POST /documents/:documentId/validate
**Purpose**: Validate document  
**Permission**: `documents:view`

**Path Params**: `documentId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": []
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId is required

---

### POST /documents/:documentId/classify
**Purpose**: Classify document type  
**Permission**: `documents:view`

**Path Params**: `documentId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "documentType": "string",
    "confidence": 0.95
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId is required

---

### POST /documents/:documentId/extract
**Purpose**: Start text extraction from document  
**Permission**: `documents:upload`

**Path Params**: `documentId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "documentId": "UUID",
    "tenantId": "string",
    "claimId": "string",
    "documentType": "string",
    "fileName": "string",
    "mimeType": "string",
    "fileSize": 0,
    "downloadUrl": "string",
    "downloadUrlExpiresAt": "ISO8601",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId is required

---

## Reinsurance Invoice Endpoints

### POST /documents/reinsurance-invoice/upload
**Purpose**: Upload reinsurance invoice artifact  
**Permission**: `documents:upload`

**Request Body** (multipart/form-data):
- `file` (required) - File to upload
- `reconciliationId` (required, string)
- `metadata` (optional, JSON string)

**Headers**:
- `Content-Type: multipart/form-data` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "documentId": "UUID",
    "tenantId": "string",
    "reconciliationId": "string",
    "documentType": "reinsurance_invoice",
    "fileName": "string",
    "mimeType": "string",
    "fileSize": 0,
    "downloadUrl": "string",
    "downloadUrlExpiresAt": "ISO8601",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId is required
- `VALIDATION_ERROR` - multipart/form-data required, reconciliationId required, unsupported file type, file size exceeds limit
- `UPLOAD_ERROR` - Failed to read or stage uploaded file
- `INTERNAL_ERROR` - Internal server error

---

### POST /documents/reinsurance-invoice/link
**Purpose**: Link external reinsurance invoice artifact  
**Permission**: `documents:link`

**Request Body**:
```json
{
  "reconciliationId": "string (required)",
  "fileName": "string (required)",
  "storageRef": "string (required)",
  "mimeType": "string",
  "fileSize": 0,
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
    "documentId": "UUID",
    "tenantId": "string",
    "reconciliationId": "string",
    "documentType": "reinsurance_invoice",
    "fileName": "string",
    "mimeType": "string",
    "fileSize": 0,
    "downloadUrl": "string",
    "downloadUrlExpiresAt": "ISO8601",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId is required
- `VALIDATION_ERROR` - reconciliationId, fileName, storageRef are required
- `INTERNAL_ERROR` - Internal server error

---

### GET /documents/reconciliation/:reconciliationId
**Purpose**: Get reconciliation artifacts  
**Permission**: `documents:view`

**Path Params**: `reconciliationId`

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "documentId": "UUID",
      "tenantId": "string",
      "reconciliationId": "string",
      "documentType": "reinsurance_invoice",
      "fileName": "string",
      "mimeType": "string",
      "fileSize": 0,
      "downloadUrl": "string",
      "downloadUrlExpiresAt": "ISO8601",
      "createdAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - tenantId is required

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for document-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "document-service",
  "timestamp": "ISO8601",
  "uptime": 123.45,
  "components": {
    "db": "ok|error",
    "storage": "ok|error",
    "kafka": "ok|error|unreachable|not_configured"
  },
  "error": "string (only if degraded)"
}
```

---

## Summary

**Total Endpoints**: 13

**By Controller**:
- documents.controller.ts: 12
- health.controller.ts: 1

**Document Lifecycle**:
1. Upload → `/documents/upload`
2. Link → `/documents/link`
3. Get → `/documents/:documentId`
4. Get Signed URL → `/documents/:documentId/signed-url`
5. Download → `/documents/:documentId/download`
6. List → `/documents`
7. Validate → `/documents/:documentId/validate`
8. Classify → `/documents/:documentId/classify`
9. Extract → `/documents/:documentId/extract`

**Reconciliation Artifact Lifecycle**:
1. Upload Invoice → `/documents/reinsurance-invoice/upload`
2. Link Invoice → `/documents/reinsurance-invoice/link`
3. Get Artifacts → `/documents/reconciliation/:reconciliationId`

**Permissions**:
- `documents:upload` - Upload documents
- `documents:link` - Link external documents
- `documents:view` - View documents, get signed URLs, validate, classify
- `documents:list` - List documents

**Authentication**:
- All endpoints except `/documents/:documentId/download` and `/health` use JwtAuthGuard + PermissionsGuard + TenantGuard
- Download endpoint uses signed token for public access

**Document Types**:
- policy, claim, invoice, identity, medical, other, reinsurance_invoice

**Constraints**:
- Max file size: 10MB (configurable)
- Allowed MIME types: PDF, JPEG, PNG, TIFF, DOC, DOCX
