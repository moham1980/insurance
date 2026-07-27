# Canonical API Contract — Agent Portal ↔ Sales Network

> **تاریخ**: ۱۴۰۵/۰۲/۱۰  
> **نسخه**: 1.0  
> **دو سرویس**: `agent-portal-service` ←→ `sales-network-service`  
> **هدف**: تعریف contract رسمی برای همه endpointهای مورد نیاز Agent Portal از Sales Network

---

## Base Configuration

- **Base URL**: `http://sales-network-service:3022`
- **Headers Required**:
  - `x-tenant-id`: شناسه tenant
  - `x-partner-id`: شناسه partner/نماینده
  - `Authorization`: Bearer JWT token
  - `x-correlation-id`: (اختیاری) برای traceability

---

## Endpoint 1: Get Agent Dashboard Stats

**مسیر**: `GET /sales-network/agents/{agentId}/stats`

**هدف**: دریافت آمار داشبورد نماینده (تعداد بیمه‌نامه‌ها، خسارت‌ها، کارمزدها، KPIهای ماهانه)

**Request Parameters**:

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| agentId | string | path | yes | شناسه کاربر نماینده |

**Request Headers**:
```
x-tenant-id: {tenantId}
x-partner-id: {partnerId}
Authorization: Bearer {token}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "totalPolicies": 150,
    "activePolicies": 120,
    "pendingPolicies": 10,
    "totalClaims": 25,
    "pendingClaims": 5,
    "totalCommission": 45000000,
    "pendingCommission": 5000000,
    "monthlyPremium": 12000000,
    "monthlyIssuance": 15
  },
  "correlationId": "string"
}
```

**Response 404**: Agent not found
```json
{
  "success": false,
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent not found"
  },
  "correlationId": "string"
}
```

---

## Endpoint 2: Get Agent Policies

**مسیر**: `GET /sales-network/agents/{agentId}/policies`

**هدف**: دریافت لیست بیمه‌نامه‌های نماینده با فیلتر

**Request Parameters**:

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| agentId | string | path | yes | شناسه کاربر نماینده |
| status | string | query | no | فیلتر وضعیت (ACTIVE, PENDING, EXPIRED, CANCELLED) |
| fromDate | string (ISO date) | query | no | تاریخ شروع فیلتر |
| toDate | string (ISO date) | query | no | تاریخ پایان فیلتر |
| limit | number | query | no | default 50, max 200 |
| offset | number | query | no | default 0 |

**Request Headers**:
```
x-tenant-id: {tenantId}
x-partner-id: {partnerId}
Authorization: Bearer {token}
```

**Response 200**:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "policyNumber": "string",
      "customerId": "uuid",
      "customerName": "string",
      "product": "string",
      "status": "string",
      "premium": number,
      "issueDate": "string (ISO)",
      "expiryDate": "string (ISO)",
      "commissionRate": number,
      "commissionAmount": number
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  },
  "correlationId": "string"
}
```

---

## Endpoint 3: Get Agent Claims

**مسیر**: `GET /sales-network/agents/{agentId}/claims`

**هدف**: دریافت لیست خسارت‌های مربوط به نماینده

**Request Parameters**:

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| agentId | string | path | yes | شناسه کاربر نماینده |
| status | string | query | no | فیلتر وضعیت (OPEN, INVESTIGATING, APPROVED, PAID, CLOSED) |
| fromDate | string (ISO date) | query | no | تاریخ شروع فیلتر |
| toDate | string (ISO date) | query | no | تاریخ پایان فیلتر |
| limit | number | query | no | default 50, max 200 |
| offset | number | query | no | default 0 |

**Request Headers**:
```
x-tenant-id: {tenantId}
x-partner-id: {partnerId}
Authorization: Bearer {token}
```

**Response 200**:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "claimNumber": "string",
      "policyNumber": "string",
      "customerName": "string",
      "status": "string",
      "submittedDate": "string (ISO)",
      "amount": number,
      "approvedAmount": number
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0
  },
  "correlationId": "string"
}
```

---

## Endpoint 4: Get Agent Customers

**مسیر**: `GET /sales-network/agents/{agentId}/customers`

**هدف**: دریافت لیست مشتریان نماینده

**Request Parameters**:

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| agentId | string | path | yes | شناسه کاربر نماینده |
| limit | number | query | no | default 50, max 200 |
| offset | number | query | no | default 0 |

**Request Headers**:
```
x-tenant-id: {tenantId}
x-partner-id: {partnerId}
Authorization: Bearer {token}
```

**Response 200**:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nationalId": "string",
      "name": "string",
      "phone": "string",
      "email": "string",
      "policiesCount": number,
      "claimsCount": number,
      "totalPremium": number
    }
  ],
  "pagination": {
    "total": 80,
    "limit": 50,
    "offset": 0
  },
  "correlationId": "string"
}
```

---

## Endpoint 5: Get Agent Commissions

**مسیر**: `GET /sales-network/agents/{agentId}/commissions`

**هدف**: دریافت لیست کارمزدهای نماینده

**Request Parameters**:

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| agentId | string | path | yes | شناسه کاربر نماینده |
| status | string | query | no | فیلتر وضعیت (PENDING, PAID, CANCELLED) |
| fromDate | string (ISO date) | query | no | تاریخ شروع فیلتر |
| toDate | string (ISO date) | query | no | تاریخ پایان فیلتر |
| limit | number | query | no | default 50, max 200 |
| offset | number | query | no | default 0 |

**Request Headers**:
```
x-tenant-id: {tenantId}
x-partner-id: {partnerId}
Authorization: Bearer {token}
```

**Response 200**:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "policyId": "uuid",
      "policyNumber": "string",
      "contractId": "uuid",
      "commissionRate": number,
      "commissionAmount": number,
      "status": "PENDING",
      "dueDate": "string (ISO)",
      "paidDate": "string (ISO)"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  },
  "correlationId": "string"
}
```

---

## Endpoint 6: Get Agent KPIs

**مسیر**: `GET /sales-network/agents/{agentId}/kpis`

**هدف**: دریافت KPIهای نماینده بر اساس بازه زمانی

**Request Parameters**:

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| agentId | string | path | yes | شناسه کاربر نماینده |
| fromDate | string (ISO date) | query | no | تاریخ شروع (default: شروع ماه جاری) |
| toDate | string (ISO date) | query | no | تاریخ پایان (default: امروز) |
| granularity | string | query | no | روزانه/ماهانه (default: monthly) |

**Request Headers**:
```
x-tenant-id: {tenantId}
x-partner-id: {partnerId}
Authorization: Bearer {token}
```

**Response 200**:

```json
{
  "success": true,
  "data": [
    {
      "date": "string (ISO)",
      "issuanceCount": number,
      "issuancePremium": number,
      "claimsCount": number,
      "claimsAmount": number,
      "commissionEarned": number,
      "newCustomers": number
    }
  ],
  "correlationId": "string"
}
```

---

## Error Response Format (Common)

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  },
  "correlationId": "string"
}
```

**Common Error Codes**:
- `UNAUTHORIZED`: Missing or invalid token
- `FORBIDDEN`: Insufficient permissions
- `AGENT_NOT_FOUND`: Agent ID does not exist
- `PARTNER_NOT_FOUND`: Partner ID does not exist
- `VALIDATION_ERROR`: Invalid request parameters
- `INTERNAL_ERROR`: Unexpected server error

---

## Notes for Implementation

1. **Authentication**: همه endpointها باید JwtAuthGuard داشته باشند
2. **Authorization**: باید از PermissionsGuard استفاده شود با permission مناسب
3. **Pagination**: همه endpointهای لیستی باید pagination داشته باشند
4. **Correlation ID**: همه endpointها باید correlationId را برگردانند
5. **Audit**: همه endpointها باید audit log داشته باشند
6. **Performance**: endpointهای stats و dashboard باید cache شوند (TTL: 5 دقیقه)
