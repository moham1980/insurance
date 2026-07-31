# Knowledge Layer Service - Endpoint Catalog

**Service**: knowledge-layer-service  
**Purpose**: Document indexing, search, and retrieval for knowledge layer  
**Base Path**: `/knowledge`

---

## Controllers Overview

1. **knowledge-layer.controller.ts** - Knowledge layer operations (index, search, documents, stats)
2. **health.controller.ts** - Health check

---

## 1. knowledge-layer.controller.ts

**Base Path**: `/knowledge`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (all endpoints except /health)

## Indexing Endpoints

### POST /knowledge/index
**Purpose**: Index document  
**Permission**: `knowledge:index`

**Request Body**:
```json
{
  "externalId": "string",
  "title": "string",
  "content": "string",
  "metadata": {},
  "tenantId": "string"
}
```

**Response**:
```json
{
  "id": "UUID",
  "externalId": "string",
  "title": "string",
  "content": "string",
  "metadata": {},
  "tenantId": "string",
  "indexedAt": "ISO8601"
}
```

---

### POST /knowledge/search
**Purpose**: Search documents  
**Permission**: `knowledge:search`

**Request Body**:
```json
{
  "query": "string",
  "tenantId": "string",
  "filters": {},
  "limit": 10,
  "offset": 0
}
```

**Response**:
```json
{
  "results": [...],
  "total": 0,
  "limit": 10,
  "offset": 0
}
```

---

## Document Endpoints

### GET /knowledge/documents/:id
**Purpose**: Get document by ID  
**Permission**: `knowledge:view`

**Path Params**: `id`

**Response**:
```json
{
  "id": "UUID",
  "externalId": "string",
  "title": "string",
  "content": "string",
  "metadata": {},
  "tenantId": "string",
  "indexedAt": "ISO8601"
}
```

---

### GET /knowledge/documents/external/:externalId
**Purpose**: Get document by external ID  
**Permission**: `knowledge:view`

**Path Params**: `externalId`

**Response**:
```json
{
  "id": "UUID",
  "externalId": "string",
  "title": "string",
  "content": "string",
  "metadata": {},
  "tenantId": "string",
  "indexedAt": "ISO8601"
}
```

---

### GET /knowledge/documents
**Purpose**: List documents  
**Permission**: `knowledge:view`

**Query Params**:
- `tenantId` (optional, string)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response**:
```json
{
  "results": [...],
  "total": 0,
  "limit": 50,
  "offset": 0
}
```

---

### DELETE /knowledge/documents/:id
**Purpose**: Delete document  
**Permission**: `knowledge:delete`

**Path Params**: `id`

**Response**: 204 No Content

---

### POST /knowledge/documents/:id/reindex
**Purpose**: Reindex document  
**Permission**: `knowledge:reindex`

**Path Params**: `id`

**Response**:
```json
{
  "id": "UUID",
  "externalId": "string",
  "title": "string",
  "content": "string",
  "metadata": {},
  "tenantId": "string",
  "indexedAt": "ISO8601"
}
```

---

## Stats Endpoints

### GET /knowledge/stats
**Purpose**: Get knowledge layer statistics  
**Permission**: `knowledge:view`

**Response**:
```json
{
  "totalDocuments": 0,
  "indexedDocuments": 0,
  "tenants": 0,
  "lastIndexedAt": "ISO8601"
}
```

---

## Health Endpoints

### GET /knowledge/health
**Purpose**: Health check for knowledge-layer-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok",
  "service": "knowledge-layer-service",
  "timestamp": "ISO8601"
}
```

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for knowledge-layer-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|error",
  "service": "knowledge-layer-service",
  "timestamp": "ISO8601",
  "message": "string (only if error)"
}
```

---

## Summary

**Total Endpoints**: 9

**By Controller**:
- knowledge-layer.controller.ts: 8
- health.controller.ts: 1

**Document Lifecycle**:
1. Index → `/knowledge/index`
2. Search → `/knowledge/search`
3. Get by ID → `/knowledge/documents/:id`
4. Get by External ID → `/knowledge/documents/external/:externalId`
5. List → `/knowledge/documents`
6. Delete → `/knowledge/documents/:id`
7. Reindex → `/knowledge/documents/:id/reindex`

**Stats**:
1. Get Stats → `/knowledge/stats`

**Permissions**:
- `knowledge:index` - Index documents
- `knowledge:search` - Search documents
- `knowledge:view` - View documents and stats
- `knowledge:delete` - Delete documents
- `knowledge:reindex` - Reindex documents

**Authentication**:
- All endpoints except `/health` and `/knowledge/health` use JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard
