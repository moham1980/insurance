# Catalog BFF - Endpoint Catalog

**Service**: catalog-bff  
**Purpose**: Backend for Frontend for product catalog (products, offerings, distribution agreements)  
**Base Path**: `/api/v1/catalog`

---

## Controllers Overview

1. **catalog.controller.ts** - Catalog operations (products, offerings, distribution agreements, eligibility)

---

## 1. catalog.controller.ts

**Base Path**: `/api/v1/catalog`  
**Auth**: JwtAuthGuard

## Product Endpoints

### GET /api/v1/catalog/products
**Purpose**: List products  
**Auth**: JwtAuthGuard

**Query Params**:
- `lineOfBusiness` (optional, string)
- `status` (optional, string)
- `limit` (optional, number)
- `offset` (optional, number)

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
      "name": "string",
      "lineOfBusiness": "string",
      "status": "active|inactive"
    }
  ],
  "correlationId": "string"
}
```

---

### GET /api/v1/catalog/products/:productId
**Purpose**: Get product by ID  
**Auth**: JwtAuthGuard

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
    "name": "string",
    "lineOfBusiness": "string",
    "description": "string",
    "status": "active|inactive"
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Product not found

---

### GET /api/v1/catalog/distributors/:distributorOrganizationId/visible-products
**Purpose**: List products visible to a distributor  
**Auth**: JwtAuthGuard

**Path Params**: `distributorOrganizationId`

**Query Params**:
- `lineOfBusiness` (optional, string)
- `limit` (optional, number)
- `offset` (optional, number)

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
      "name": "string",
      "lineOfBusiness": "string"
    }
  ],
  "correlationId": "string"
}
```

---

## Offering Endpoints

### GET /api/v1/catalog/offerings
**Purpose**: List broker offerings  
**Auth**: JwtAuthGuard

**Query Params**:
- `lineOfBusiness` (optional, string)
- `insurerId` (optional, string)
- `limit` (optional, number)
- `offset` (optional, number)

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

### GET /api/v1/catalog/offerings/:offeringId/comparison-hint
**Purpose**: Get offering comparison hint  
**Auth**: JwtAuthGuard

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
    "comparisonData": {}
  },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Offering not found

---

### GET /api/v1/catalog/customer-offerings
**Purpose**: List customer-facing offerings  
**Auth**: JwtAuthGuard

**Query Params**:
- `lineOfBusiness` (optional, string)
- `limit` (optional, number)
- `offset` (optional, number)

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
      "name": "string",
      "lineOfBusiness": "string"
    }
  ],
  "correlationId": "string"
}
```

---

## Distribution Agreement Endpoints

### GET /api/v1/catalog/distribution-agreements/:agreementId/eligibility
**Purpose**: Get distribution agreement eligibility  
**Auth**: JwtAuthGuard

**Path Params**: `agreementId`

**Query Params**:
- `lineOfBusiness` (optional, string)

**Headers**:
- `Authorization: Bearer <token>` (required)
- `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "agreementId": "string",
    "eligible": true,
    "eligibleLinesOfBusiness": []
  },
  "correlationId": "string"
}
```

---

## Summary

**Total Endpoints**: 6

**By Controller**:
- catalog.controller.ts: 6

**Authentication**:
- All endpoints use JwtAuthGuard

**Product Operations**:
1. List Products → `/api/v1/catalog/products`
2. Get Product → `/api/v1/catalog/products/:productId`
3. List Distributor Visible Products → `/api/v1/catalog/distributors/:distributorOrganizationId/visible-products`

**Offering Operations**:
1. List Broker Offerings → `/api/v1/catalog/offerings`
2. Get Offering Comparison Hint → `/api/v1/catalog/offerings/:offeringId/comparison-hint`
3. List Customer Offerings → `/api/v1/catalog/customer-offerings`

**Distribution Agreement Operations**:
1. Get Agreement Eligibility → `/api/v1/catalog/distribution-agreements/:agreementId/eligibility`

**Downstream Services**:
- product-service (products)
- submission-placement-service (offerings, distribution agreements)

**Product Status**:
- active - Active
- inactive - Inactive
