# Knowledge Service - Endpoint Catalog

**Service**: knowledge-service  
**Purpose**: Knowledge articles, search, and Next Best Action (NBA) recommendations  
**Base Path**: `/knowledge`

---

## Controllers Overview

1. **knowledge.controller.ts** - Knowledge operations (articles, search, NBA)
2. **health.controller.ts** - Health check

---

## 1. knowledge.controller.ts

**Base Path**: `/knowledge`  
**Auth**: JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard (all endpoints except /health)

## Article Endpoints

### POST /knowledge/articles
**Purpose**: Create knowledge article  
**Permission**: (implicit from guards)

**Request Body**:
```json
{
  "tenantId": "string (required)",
  "title": "string (required)",
  "content": "string (required)",
  "summary": "string",
  "category": "ArticleCategory (required)",
  "tags": [],
  "authorId": "string",
  "metadata": {}
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

### PUT /knowledge/articles/:id/publish
**Purpose**: Publish article  
**Permission**: (implicit from guards)

**Path Params**: `id`

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

### GET /knowledge/articles/search
**Purpose**: Search articles  
**Permission**: (implicit from guards)

**Query Params**:
- `tenantId` (optional, string)
- `q` (optional, string - search query)
- `category` (optional, ArticleCategory)
- `tags` (optional, comma-separated string)
- `status` (optional, ArticleStatus)
- `limit` (default: 20, max: 200)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 0,
    "limit": 20,
    "offset": 0
  },
  "correlationId": "string"
}
```

---

### GET /knowledge/articles/:id
**Purpose**: Get article by ID  
**Permission**: (implicit from guards)

**Path Params**: `id`

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- `NOT_FOUND` - Article not found

**Note**: Automatically increments view count

---

### PUT /knowledge/articles/:id
**Purpose**: Update article  
**Permission**: (implicit from guards)

**Path Params**: `id`

**Request Body**:
```json
{
  "title": "string",
  "content": "string",
  "summary": "string",
  "category": "ArticleCategory",
  "tags": [],
  "metadata": {}
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

### DELETE /knowledge/articles/:id
**Purpose**: Delete article  
**Permission**: (implicit from guards)

**Path Params**: `id`

**Response**:
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

---

### GET /knowledge/articles
**Purpose**: List articles  
**Permission**: (implicit from guards)

**Query Params**:
- `tenantId` (optional, string)
- `category` (optional, ArticleCategory)
- `status` (optional, ArticleStatus)
- `limit` (default: 20, max: 200)
- `offset` (default: 0)

**Headers**:
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 0,
    "limit": 20,
    "offset": 0
  },
  "correlationId": "string"
}
```

---

## NBA (Next Best Action) Endpoints

### POST /knowledge/nba
**Purpose**: Create NBA recommendation  
**Permission**: (implicit from guards)

**Request Body**:
```json
{
  "customerId": "string",
  "contextType": "string",
  "contextId": "string",
  "actionType": "string",
  "priority": 0,
  "metadata": {}
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

### GET /knowledge/nba/recommendations
**Purpose**: Get NBA recommendations  
**Permission**: (implicit from guards)

**Query Params**:
- `tenantId` (optional, string)
- `customerId` (optional, string)
- `limit` (default: 20, max: 200)

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

### POST /knowledge/nba/:id/execute
**Purpose**: Execute NBA action  
**Permission**: (implicit from guards)

**Path Params**: `id`

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- `NOT_FOUND` - NBA not found

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for knowledge-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "knowledge-service",
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

**Total Endpoints**: 10

**By Controller**:
- knowledge.controller.ts: 9
- health.controller.ts: 1

**Article Lifecycle**:
1. Create → `/knowledge/articles`
2. Publish → `/knowledge/articles/:id/publish`
3. Search → `/knowledge/articles/search`
4. Get → `/knowledge/articles/:id`
5. Update → `/knowledge/articles/:id`
6. Delete → `/knowledge/articles/:id`
7. List → `/knowledge/articles`

**NBA Lifecycle**:
1. Create → `/knowledge/nba`
2. Get Recommendations → `/knowledge/nba/recommendations`
3. Execute → `/knowledge/nba/:id/execute`

**Status Types**:
- ArticleStatus: draft, published, archived
- ArticleCategory: policy, claims, billing, underwriting, fraud, aml, general

**Authentication**:
- All endpoints except `/health` use JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard
