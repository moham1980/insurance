# Product Service - Endpoint Catalog

**Service**: product-service  
**Purpose**: Product management, coverages, deductibles, pricing rules, brokerage offerings, product visibility, versioning  
**Base Path**: `/`

---

## Controllers Overview

1. **product.controller.ts** - Core product management (products, coverages, deductibles, pricing rules, export, quote, versioning, pricing rule evaluation)
2. **brokerage-product.controller.ts** - Brokerage-specific operations (product versioning, visibility, broker offerings)
3. **health.controller.ts** - Health check with database and outbox monitoring

---

## 1. product.controller.ts

**Base Path**: `/product`  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard

## Product Endpoints

### POST /product/products
**Purpose**: Create a new product  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:products:create`

**Request Body**:
```json
{
  "code": "string",
  "nameFa": "string",
  "nameEn": "string",
  "lineOfBusiness": "motor|property|health|life|liability",
  "metadata": {}
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
    "productId": "string",
    "code": "string",
    "nameFa": "string",
    "nameEn": "string",
    "lineOfBusiness": "motor|property|health|life|liability",
    "status": "draft|active|archived",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

### GET /product/products/:productId
**Purpose**: Get product by ID  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:products:view`

**Path Params**: `productId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "productId": "string",
    "code": "string",
    "nameFa": "string",
    "nameEn": "string",
    "lineOfBusiness": "motor|property|health|life|liability",
    "status": "draft|active|archived",
    "metadata": {},
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required
- `NOT_FOUND` - Product not found

---

### GET /product/products
**Purpose**: List products  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:products:list`

**Query Params**:
- `status` (optional, ProductStatus)
- `lineOfBusiness` (optional, string)
- `q` (optional, string - search query)
- `limit` (optional, string)
- `offset` (optional, string)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "rows": [
      {
        "productId": "string",
        "code": "string",
        "nameFa": "string",
        "nameEn": "string",
        "lineOfBusiness": "motor|property|health|life|liability",
        "status": "draft|active|archived"
      }
    ],
    "total": 0,
    "limit": 50,
    "offset": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

### PATCH /product/products/:productId
**Purpose**: Update product  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:products:update`

**Path Params**: `productId`

**Request Body**:
```json
{
  "nameFa": "string",
  "nameEn": "string",
  "lineOfBusiness": "motor|property|health|life|liability",
  "metadata": {},
  "status": "draft|active|archived"
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
    "productId": "string",
    "nameFa": "string",
    "nameEn": "string",
    "lineOfBusiness": "motor|property|health|life|liability",
    "status": "draft|active|archived",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

### POST /product/products/:productId/archive
**Purpose**: Archive a product  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:products:archive`

**Path Params**: `productId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "productId": "string",
    "status": "archived",
    "archivedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

## Coverage Endpoints

### POST /product/coverages
**Purpose**: Create a coverage  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:coverages:create`

**Request Body**:
```json
{
  "productId": "string",
  "code": "string",
  "nameFa": "string",
  "terms": {}
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
    "coverageId": "string",
    "productId": "string",
    "code": "string",
    "nameFa": "string",
    "terms": {},
    "status": "active|archived",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

### GET /product/coverages/:coverageId
**Purpose**: Get coverage by ID  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:coverages:view`

**Path Params**: `coverageId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "coverageId": "string",
    "productId": "string",
    "code": "string",
    "nameFa": "string",
    "terms": {},
    "status": "active|archived"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required
- `NOT_FOUND` - Coverage not found

---

### GET /product/coverages
**Purpose**: List coverages  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:coverages:list`

**Query Params**:
- `productId` (optional, string)
- `status` (optional, CoverageStatus)
- `q` (optional, string)
- `limit` (optional, string)
- `offset` (optional, string)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "rows": [
      {
        "coverageId": "string",
        "productId": "string",
        "code": "string",
        "nameFa": "string",
        "status": "active|archived"
      }
    ],
    "total": 0,
    "limit": 50,
    "offset": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

### PATCH /product/coverages/:coverageId
**Purpose**: Update coverage  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:coverages:update`

**Path Params**: `coverageId`

**Request Body**:
```json
{
  "nameFa": "string",
  "terms": {},
  "status": "active|archived",
  "changeReason": "string"
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
    "coverageId": "string",
    "nameFa": "string",
    "terms": {},
    "status": "active|archived",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

### POST /product/coverages/:coverageId/archive
**Purpose**: Archive a coverage  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:coverages:archive`

**Path Params**: `coverageId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "coverageId": "string",
    "status": "archived",
    "archivedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

## Deductible Endpoints

### POST /product/deductibles
**Purpose**: Create a deductible  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:deductibles:create`

**Request Body**:
```json
{
  "productId": "string",
  "code": "string",
  "nameFa": "string",
  "kind": "fixed|percentage",
  "value": 1000
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
    "deductibleId": "string",
    "productId": "string",
    "code": "string",
    "nameFa": "string",
    "kind": "fixed|percentage",
    "value": 1000,
    "status": "active|archived",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

### GET /product/deductibles/:deductibleId
**Purpose**: Get deductible by ID  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:deductibles:view`

**Path Params**: `deductibleId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "deductibleId": "string",
    "productId": "string",
    "code": "string",
    "nameFa": "string",
    "kind": "fixed|percentage",
    "value": 1000,
    "status": "active|archived"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required
- `NOT_FOUND` - Deductible not found

---

### GET /product/deductibles
**Purpose**: List deductibles  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:deductibles:list`

**Query Params**:
- `productId` (optional, string)
- `status` (optional, DeductibleStatus)
- `kind` (optional, string)
- `q` (optional, string)
- `limit` (optional, string)
- `offset` (optional, string)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "rows": [
      {
        "deductibleId": "string",
        "productId": "string",
        "code": "string",
        "nameFa": "string",
        "kind": "fixed|percentage",
        "value": 1000,
        "status": "active|archived"
      }
    ],
    "total": 0,
    "limit": 50,
    "offset": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

### PATCH /product/deductibles/:deductibleId
**Purpose**: Update deductible  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:deductibles:update`

**Path Params**: `deductibleId`

**Request Body**:
```json
{
  "nameFa": "string",
  "kind": "fixed|percentage",
  "value": 1000,
  "status": "active|archived",
  "changeReason": "string"
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
    "deductibleId": "string",
    "nameFa": "string",
    "kind": "fixed|percentage",
    "value": 1000,
    "status": "active|archived",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

### POST /product/deductibles/:deductibleId/archive
**Purpose**: Archive a deductible  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:deductibles:archive`

**Path Params**: `deductibleId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "deductibleId": "string",
    "status": "archived",
    "archivedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

## Pricing Rule Endpoints

### POST /product/pricing-rules
**Purpose**: Create a pricing rule  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:pricing_rules:create`

**Request Body**:
```json
{
  "productId": "string",
  "code": "string",
  "nameFa": "string",
  "ruleType": "base|discount|surcharge|adjustment",
  "priority": 0,
  "rule": {},
  "conditions": [],
  "validFrom": "ISO8601",
  "validTo": "ISO8601",
  "regions": ["string"]
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
    "pricingRuleId": "string",
    "productId": "string",
    "code": "string",
    "nameFa": "string",
    "ruleType": "base|discount|surcharge|adjustment",
    "priority": 0,
    "status": "active|archived",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

### GET /product/pricing-rules/:pricingRuleId
**Purpose**: Get pricing rule by ID  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:pricing_rules:view`

**Path Params**: `pricingRuleId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "pricingRuleId": "string",
    "productId": "string",
    "code": "string",
    "nameFa": "string",
    "ruleType": "base|discount|surcharge|adjustment",
    "priority": 0,
    "status": "active|archived"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required
- `NOT_FOUND` - Pricing rule not found

---

### GET /product/pricing-rules
**Purpose**: List pricing rules  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:pricing_rules:list`

**Query Params**:
- `productId` (optional, string)
- `status` (optional, PricingRuleStatus)
- `q` (optional, string)
- `limit` (optional, string)
- `offset` (optional, string)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "rows": [
      {
        "pricingRuleId": "string",
        "productId": "string",
        "code": "string",
        "nameFa": "string",
        "ruleType": "base|discount|surcharge|adjustment",
        "priority": 0,
        "status": "active|archived"
      }
    ],
    "total": 0,
    "limit": 50,
    "offset": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

### PATCH /product/pricing-rules/:pricingRuleId
**Purpose**: Update pricing rule  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:pricing_rules:update`

**Path Params**: `pricingRuleId`

**Request Body**:
```json
{
  "nameFa": "string",
  "ruleType": "base|discount|surcharge|adjustment",
  "priority": 0,
  "rule": {},
  "conditions": [],
  "validFrom": "ISO8601",
  "validTo": "ISO8601",
  "regions": ["string"],
  "status": "active|archived",
  "changeReason": "string"
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
    "pricingRuleId": "string",
    "nameFa": "string",
    "ruleType": "base|discount|surcharge|adjustment",
    "priority": 0,
    "status": "active|archived",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

### POST /product/pricing-rules/:pricingRuleId/archive
**Purpose**: Archive a pricing rule  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:pricing_rules:archive`

**Path Params**: `pricingRuleId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "pricingRuleId": "string",
    "status": "archived",
    "archivedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

## Export and Quote Endpoints

### GET /product/export
**Purpose**: Export product snapshot  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:export`

**Query Params**:
- `productId` (optional, string)
- `status` (optional, ProductStatus)
- `includeVersions` (optional, string - "true" or "1")
- `limit` (default: 200)
- `offset` (default: 0)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "products": [],
    "coverages": [],
    "deductibles": [],
    "pricingRules": [],
    "productVersions": []
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

### POST /product/quote
**Purpose**: Compute product quote  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:quote`

**Request Body**:
```json
{
  "productId": "string",
  "currency": "IRR",
  "exposure": {},
  "region": "string",
  "effectiveDate": "ISO8601",
  "version": 1
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
    "productId": "string",
    "totalPremium": 1000,
    "basePremium": 1000,
    "discounts": [],
    "surcharges": [],
    "currency": "IRR",
    "quotedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

## Product Versioning Endpoints

### GET /product/products/:productId/versions
**Purpose**: List product versions  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:products:view`

**Path Params**: `productId`

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
  "data": {
    "rows": [
      {
        "version": 1,
        "productId": "string",
        "status": "draft|active|retired",
        "createdAt": "ISO8601"
      }
    ],
    "total": 0,
    "limit": 50,
    "offset": 0
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required

---

### GET /product/products/:productId/versions/:version
**Purpose**: Get specific product version  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:products:view`

**Path Params**: `productId`, `version`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "version": 1,
    "productId": "string",
    "status": "draft|active|retired",
    "snapshot": {},
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required
- `NOT_FOUND` - Version not found

---

## Advanced Pricing Endpoints

### POST /product/products/:productId/pricing-rules/evaluate
**Purpose**: Evaluate pricing rules for a product  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:products:view`

**Path Params**: `productId`

**Request Body**:
```json
{
  "currency": "IRR",
  "exposure": {},
  "region": "string",
  "effectiveDate": "ISO8601",
  "version": 1
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
    "productId": "string",
    "appliedRules": [],
    "totalAdjustment": 0,
    "currency": "IRR"
  },
  "correlationId": "string"
}
```

**Errors**:
- `TENANT_REQUIRED` - Tenant context is required
- `VALIDATION_ERROR` - exposure is required

---

## 2. brokerage-product.controller.ts

**Base Path**: `/api/v1`  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard

## Brokerage Product Versioning Endpoints

### POST /api/v1/products
**Purpose**: Create a brokerage product  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:products:create`

**Request Body**:
```json
{
  "code": "string",
  "nameFa": "string",
  "nameEn": "string",
  "lineOfBusiness": "motor|property|health|life|liability",
  "ownerOrganizationId": "string"
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
    "productId": "string",
    "code": "string",
    "nameFa": "string",
    "ownerOrganizationId": "string",
    "lineOfBusiness": "motor|property|health|life|liability"
  },
  "correlationId": "string"
}
```

---

### GET /api/v1/products
**Purpose**: List brokerage products  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:products:list`

**Query Params**:
- `ownerOrganizationId` (optional, string)
- `lineOfBusiness` (optional, string)
- `status` (optional, string)
- `q` (optional, string)
- `limit` (optional, string)
- `offset` (optional, string)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "productId": "string",
      "code": "string",
      "nameFa": "string",
      "ownerOrganizationId": "string",
      "lineOfBusiness": "motor|property|health|life|liability"
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

### GET /api/v1/products/:productId
**Purpose**: Get brokerage product by ID  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:products:view`

**Path Params**: `productId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "productId": "string",
    "code": "string",
    "nameFa": "string",
    "ownerOrganizationId": "string",
    "lineOfBusiness": "motor|property|health|life|liability"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Product not found

---

### POST /api/v1/products/:productId/versions
**Purpose**: Create product version  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:versions:create`

**Path Params**: `productId`

**Request Body**:
```json
{
  "changeDescription": "string"
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
    "version": 1,
    "productId": "string",
    "status": "draft",
    "changeDescription": "string",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /api/v1/products/:productId/versions
**Purpose**: List product versions  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:products:view`

**Path Params**: `productId`

**Query Params**:
- `status` (optional, string)
- `limit` (optional, string)
- `offset` (optional, string)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "version": 1,
      "productId": "string",
      "status": "draft|active|retired",
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

### GET /api/v1/products/:productId/versions/:version
**Purpose**: Get product version  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:products:view`

**Path Params**: `productId`, `version`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "version": 1,
    "productId": "string",
    "status": "draft|active|retired",
    "snapshot": {},
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Version not found

---

### POST /api/v1/products/:productId/versions/:version/activate
**Purpose**: Activate product version  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:versions:activate`

**Path Params**: `productId`, `version`

**Request Body**:
```json
{
  "notes": "string"
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
    "version": 1,
    "productId": "string",
    "status": "active",
    "activatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /api/v1/products/:productId/versions/:version/retire
**Purpose**: Retire product version  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:versions:retire`

**Path Params**: `productId`, `version`

**Request Body**:
```json
{
  "notes": "string"
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
    "version": 1,
    "productId": "string",
    "status": "retired",
    "retiredAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /api/v1/products/:productId/versions/:version/clone
**Purpose**: Clone product version  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:versions:create`

**Path Params**: `productId`, `version`

**Request Body**:
```json
{
  "changeDescription": "string"
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
    "version": 2,
    "productId": "string",
    "status": "draft",
    "clonedFrom": 1,
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

## Product Visibility Endpoints

### POST /api/v1/products/:productId/visibility
**Purpose**: Create product visibility  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:visibility:create`

**Path Params**: `productId`

**Request Body**:
```json
{
  "distributorOrganizationId": "string",
  "productVersion": 1,
  "status": "active"
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
    "visibilityId": "string",
    "productId": "string",
    "distributorOrganizationId": "string",
    "productVersion": 1,
    "status": "active",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /api/v1/products/:productId/visibility
**Purpose**: List product visibilities  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:visibility:view`

**Path Params**: `productId`

**Query Params**:
- `status` (optional, string)
- `distributorOrganizationId` (optional, string)
- `limit` (optional, string)
- `offset` (optional, string)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "visibilityId": "string",
      "productId": "string",
      "distributorOrganizationId": "string",
      "productVersion": 1,
      "status": "active"
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

### GET /api/v1/products/:productId/visibility/:visibilityId
**Purpose**: Get product visibility  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:visibility:view`

**Path Params**: `productId`, `visibilityId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "visibilityId": "string",
    "productId": "string",
    "distributorOrganizationId": "string",
    "productVersion": 1,
    "status": "active"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Visibility not found

---

### PATCH /api/v1/products/:productId/visibility/:visibilityId
**Purpose**: Update product visibility  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:visibility:create`

**Path Params**: `productId`, `visibilityId`

**Request Body**:
```json
{
  "status": "active|revoked",
  "productVersion": 1
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
    "visibilityId": "string",
    "status": "active|revoked",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /api/v1/products/:productId/visibility/:visibilityId/revoke
**Purpose**: Revoke product visibility  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:visibility:revoke`

**Path Params**: `productId`, `visibilityId`

**Request Body**:
```json
{
  "reason": "string"
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
    "visibilityId": "string",
    "status": "revoked",
    "revokedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /api/v1/distributors/:distributorOrganizationId/visible-products
**Purpose**: List visible products for distributor  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:visibility:view`

**Path Params**: `distributorOrganizationId`

**Query Params**:
- `productVersion` (optional, string)
- `limit` (optional, string)
- `offset` (optional, string)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "productId": "string",
      "productVersion": 1,
      "nameFa": "string",
      "lineOfBusiness": "motor|property|health|life|liability"
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

## Broker Product Offering Endpoints

### POST /api/v1/broker-offerings
**Purpose**: Create broker product offering  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:offerings:create`

**Request Body**:
```json
{
  "brokerOrganizationId": "string",
  "productId": "string",
  "productVersion": 1,
  "commissionRate": 0.1,
  "status": "draft"
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
    "offeringId": "string",
    "brokerOrganizationId": "string",
    "productId": "string",
    "productVersion": 1,
    "commissionRate": 0.1,
    "status": "draft"
  },
  "correlationId": "string"
}
```

---

### GET /api/v1/broker-offerings
**Purpose**: List broker product offerings  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:offerings:view`

**Query Params**:
- `brokerOrganizationId` (optional, string)
- `status` (optional, string)
- `lineOfBusiness` (optional, string)
- `limit` (optional, string)
- `offset` (optional, string)

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
      "brokerOrganizationId": "string",
      "productId": "string",
      "productVersion": 1,
      "commissionRate": 0.1,
      "status": "draft|active|inactive"
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

### GET /api/v1/broker-offerings/:offeringId
**Purpose**: Get broker product offering  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:offerings:view`

**Path Params**: `offeringId`

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "offeringId": "string",
    "brokerOrganizationId": "string",
    "productId": "string",
    "productVersion": 1,
    "commissionRate": 0.1,
    "status": "draft|active|inactive"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Offering not found

---

### PATCH /api/v1/broker-offerings/:offeringId
**Purpose**: Update broker product offering  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:offerings:create`

**Path Params**: `offeringId`

**Request Body**:
```json
{
  "commissionRate": 0.1,
  "status": "draft|active|inactive"
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
    "offeringId": "string",
    "commissionRate": 0.1,
    "status": "draft|active|inactive",
    "updatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /api/v1/broker-offerings/:offeringId/activate
**Purpose**: Activate broker product offering  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:offerings:activate`

**Path Params**: `offeringId`

**Request Body**:
```json
{
  "notes": "string"
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
    "offeringId": "string",
    "status": "active",
    "activatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /api/v1/broker-offerings/:offeringId/inactivate
**Purpose**: Inactivate broker product offering  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:offerings:activate`

**Path Params**: `offeringId`

**Request Body**:
```json
{
  "notes": "string"
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
    "offeringId": "string",
    "status": "inactive",
    "inactivatedAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### GET /api/v1/customers/offerings
**Purpose**: List customer offerings  
**Auth**: JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard  
**Permission**: `product:offerings:view`

**Query Params**:
- `brokerOrganizationId` (optional, string)
- `lineOfBusiness` (optional, string)
- `limit` (optional, string)
- `offset` (optional, string)

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
      "nameFa": "string",
      "lineOfBusiness": "motor|property|health|life|liability",
      "commissionRate": 0.1
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

## 3. health.controller.ts

### GET /health
**Purpose**: Health check for product-service with database and outbox monitoring  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "product-service",
  "timestamp": "ISO8601",
  "uptime": 0,
  "components": {
    "db": "ok|error",
    "outbox": "ok|backlog|unknown"
  }
}
```

**Errors**:
- `degraded` status returned if database connection fails or outbox backlog exceeds 100
- `outboxPending` field included when outbox backlog is detected

---

## Summary

**Total Endpoints**: 38

**By Controller**:
- product.controller.ts: 19
- brokerage-product.controller.ts: 18
- health.controller.ts: 1

**Authentication**:
- `/health` - Public
- All other endpoints use JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard

**Product Operations**:
1. Create Product → `/product/products` (permission: `product:products:create`)
2. Get Product → `/product/products/:productId` (permission: `product:products:view`)
3. List Products → `/product/products` (permission: `product:products:list`)
4. Update Product → `/product/products/:productId` (permission: `product:products:update`)
5. Archive Product → `/product/products/:productId/archive` (permission: `product:products:archive`)

**Coverage Operations**:
1. Create Coverage → `/product/coverages` (permission: `product:coverages:create`)
2. Get Coverage → `/product/coverages/:coverageId` (permission: `product:coverages:view`)
3. List Coverages → `/product/coverages` (permission: `product:coverages:list`)
4. Update Coverage → `/product/coverages/:coverageId` (permission: `product:coverages:update`)
5. Archive Coverage → `/product/coverages/:coverageId/archive` (permission: `product:coverages:archive`)

**Deductible Operations**:
1. Create Deductible → `/product/deductibles` (permission: `product:deductibles:create`)
2. Get Deductible → `/product/deductibles/:deductibleId` (permission: `product:deductibles:view`)
3. List Deductibles → `/product/deductibles` (permission: `product:deductibles:list`)
4. Update Deductible → `/product/deductibles/:deductibleId` (permission: `product:deductibles:update`)
5. Archive Deductible → `/product/deductibles/:deductibleId/archive` (permission: `product:deductibles:archive`)

**Pricing Rule Operations**:
1. Create Pricing Rule → `/product/pricing-rules` (permission: `product:pricing_rules:create`)
2. Get Pricing Rule → `/product/pricing-rules/:pricingRuleId` (permission: `product:pricing_rules:view`)
3. List Pricing Rules → `/product/pricing-rules` (permission: `product:pricing_rules:list`)
4. Update Pricing Rule → `/product/pricing-rules/:pricingRuleId` (permission: `product:pricing_rules:update`)
5. Archive Pricing Rule → `/product/pricing-rules/:pricingRuleId/archive` (permission: `product:pricing_rules:archive`)

**Export and Quote**:
1. Export Snapshot → `/product/export` (permission: `product:export`)
2. Compute Quote → `/product/quote` (permission: `product:quote`)

**Product Versioning**:
1. List Versions → `/product/products/:productId/versions` (permission: `product:products:view`)
2. Get Version → `/product/products/:productId/versions/:version` (permission: `product:products:view`)
3. Evaluate Pricing Rules → `/product/products/:productId/pricing-rules/evaluate` (permission: `product:products:view`)

**Brokerage Product Versioning**:
1. Create Product → `/api/v1/products` (permission: `product:products:create`)
2. List Products → `/api/v1/products` (permission: `product:products:list`)
3. Get Product → `/api/v1/products/:productId` (permission: `product:products:view`)
4. Create Version → `/api/v1/products/:productId/versions` (permission: `product:versions:create`)
5. List Versions → `/api/v1/products/:productId/versions` (permission: `product:products:view`)
6. Get Version → `/api/v1/products/:productId/versions/:version` (permission: `product:products:view`)
7. Activate Version → `/api/v1/products/:productId/versions/:version/activate` (permission: `product:versions:activate`)
8. Retire Version → `/api/v1/products/:productId/versions/:version/retire` (permission: `product:versions:retire`)
9. Clone Version → `/api/v1/products/:productId/versions/:version/clone` (permission: `product:versions:create`)

**Product Visibility**:
1. Create Visibility → `/api/v1/products/:productId/visibility` (permission: `product:visibility:create`)
2. List Visibilities → `/api/v1/products/:productId/visibility` (permission: `product:visibility:view`)
3. Get Visibility → `/api/v1/products/:productId/visibility/:visibilityId` (permission: `product:visibility:view`)
4. Update Visibility → `/api/v1/products/:productId/visibility/:visibilityId` (permission: `product:visibility:create`)
5. Revoke Visibility → `/api/v1/products/:productId/visibility/:visibilityId/revoke` (permission: `product:visibility:revoke`)
6. List Visible Products → `/api/v1/distributors/:distributorOrganizationId/visible-products` (permission: `product:visibility:view`)

**Broker Product Offerings**:
1. Create Offering → `/api/v1/broker-offerings` (permission: `product:offerings:create`)
2. List Offerings → `/api/v1/broker-offerings` (permission: `product:offerings:view`)
3. Get Offering → `/api/v1/broker-offerings/:offeringId` (permission: `product:offerings:view`)
4. Update Offering → `/api/v1/broker-offerings/:offeringId` (permission: `product:offerings:create`)
5. Activate Offering → `/api/v1/broker-offerings/:offeringId/activate` (permission: `product:offerings:activate`)
6. Inactivate Offering → `/api/v1/broker-offerings/:offeringId/inactivate` (permission: `product:offerings:activate`)
7. List Customer Offerings → `/api/v1/customers/offerings` (permission: `product:offerings:view`)

**Permissions**:
- `product:products:create` - Create products
- `product:products:view` - View products
- `product:products:list` - List products
- `product:products:update` - Update products
- `product:products:archive` - Archive products
- `product:coverages:create` - Create coverages
- `product:coverages:view` - View coverages
- `product:coverages:list` - List coverages
- `product:coverages:update` - Update coverages
- `product:coverages:archive` - Archive coverages
- `product:deductibles:create` - Create deductibles
- `product:deductibles:view` - View deductibles
- `product:deductibles:list` - List deductibles
- `product:deductibles:update` - Update deductibles
- `product:deductibles:archive` - Archive deductibles
- `product:pricing_rules:create` - Create pricing rules
- `product:pricing_rules:view` - View pricing rules
- `product:pricing_rules:list` - List pricing rules
- `product:pricing_rules:update` - Update pricing rules
- `product:pricing_rules:archive` - Archive pricing rules
- `product:export` - Export product snapshot
- `product:quote` - Compute product quote
- `product:versions:create` - Create product versions
- `product:versions:activate` - Activate product versions
- `product:versions:retire` - Retire product versions
- `product:visibility:create` - Create/update product visibility
- `product:visibility:view` - View product visibility
- `product:visibility:revoke` - Revoke product visibility
- `product:offerings:create` - Create/update broker offerings
- `product:offerings:view` - View broker offerings
- `product:offerings:activate` - Activate/inactivate broker offerings

**Product Status**:
- draft - Draft
- active - Active
- archived - Archived

**Coverage Status**:
- active - Active
- archived - Archived

**Deductible Status**:
- active - Active
- archived - Archived

**Pricing Rule Status**:
- active - Active
- archived - Archived

**Deductible Kind**:
- fixed - Fixed amount
- percentage - Percentage

**Pricing Rule Type**:
- base - Base pricing
- discount - Discount
- surcharge - Surcharge
- adjustment - Adjustment

**Line of Business**:
- motor - Motor
- property - Property
- health - Health
- life - Life
- liability - Liability

**Product Version Status**:
- draft - Draft
- active - Active
- retired - Retired

**Visibility Status**:
- active - Active
- revoked - Revoked

**Offering Status**:
- draft - Draft
- active - Active
- inactive - Inactive

**Pagination**:
- Default limit: 50
- Maximum limit: 200 (export default: 200)
- Default offset: 0

**Quote Engine**:
- Computes total premium based on exposure, region, effective date
- Applies base pricing, discounts, and surcharges
- Supports multiple currencies
- Version-aware pricing

**Product Versioning**:
- Supports versioning for products
- Activate, retire, and clone versions
- Snapshot-based version storage
- Change tracking with descriptions

**Product Visibility**:
- Controls which distributors can see which products
- Version-specific visibility
- Revoke visibility with reason tracking

**Broker Offerings**:
- Commission rate configuration
- Broker-specific product offerings
- Activate/inactivate offerings
- Customer-facing offering list

**Audit Logging**:
- All operations are logged with correlation ID, tenant ID, actor, and action
- Create operations logged with info
- Export operations logged with counts

**Outbox Monitoring**:
- Health check monitors outbox backlog
- Degraded status if pending events exceed 100
- Outbox component status: ok, backlog, unknown
