# Notification Service - Endpoint Catalog

**Service**: notification-service  
**Purpose**: Multi-channel notifications (SMS, email, push), OTP, templates, delivery callbacks, credential vault  
**Base Path**: `/notifications`

---

## Controllers Overview

1. **notification.controller.ts** - Notification operations (send, OTP, templates, retry, bulk, push, credentials)
2. **health.controller.ts** - Health check

---

## 1. notification.controller.ts

**Base Path**: `/notifications`  
**Auth**: JwtAuthGuard + PermissionsGuard + TenantGuard (most endpoints), CallbackAuthGuard (webhooks)

## Notification Endpoints

### POST /notifications
**Purpose**: Send notification  
**Permission**: `notification:send`

**Headers**:
- `X-Correlation-Id` (optional)

**Request Body**:
```json
{
  "userId": "string",
  "correlationId": "string",
  "channel": "sms|email|push",
  "type": "string",
  "recipient": "string",
  "message": "string",
  "metadata": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "UUID",
    "tenantId": "string",
    "userId": "string",
    "correlationId": "string",
    "channel": "string",
    "type": "string",
    "recipient": "string",
    "status": "string",
    "retryCount": 0,
    "sentAt": "ISO8601",
    "deliveredAt": "ISO8601",
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

---

### POST /notifications/otp
**Purpose**: Send OTP  
**Permission**: `notification:otp:send`

**Request Body**:
```json
{
  "recipient": "string",
  "phoneNumber": "string",
  "correlationId": "string",
  "userId": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "reference": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `BAD_REQUEST` - recipient required

---

### POST /notifications/otp/verify
**Purpose**: Verify OTP  
**Permission**: `notification:otp:verify`

**Request Body**:
```json
{
  "reference": "string (required)",
  "code": "string (required)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "userId": "string"
  }
}
```

**Errors**:
- `BAD_REQUEST` - reference and code required

---

### GET /notifications/:id
**Purpose**: Get notification by ID  
**Permission**: `notification:view`

**Path Params**: `id`

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- `NOT_FOUND` - Notification not found

---

### GET /notifications
**Purpose**: List notifications  
**Permission**: `notification:list`

**Query Params**:
- `userId` (optional, string)
- `correlationId` (optional, string)
- `channel` (optional, NotificationChannel)
- `type` (optional, NotificationType)
- `status` (optional, string)
- `limit` (max: 200)
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
  }
}
```

---

### POST /notifications/delivery-callback
**Purpose**: Delivery callback (webhook)  
**Auth**: CallbackAuthGuard

**Request Body**:
```json
{
  "messageId": "string",
  "status": "delivered|failed|bounced|complained",
  "provider": "string",
  "recipient": "string",
  "errorCode": "string",
  "errorMessage": "string",
  "deliveredAt": "ISO8601",
  "tenantId": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- `NOT_FOUND` - Notification not found for callback

---

## SMS Template Endpoints

### POST /notifications/sms/templates
**Purpose**: Create SMS template  
**Permission**: `notification:templates:manage`

**Request Body**:
```json
{
  "type": "SmsTemplateType",
  "language": "string",
  "message": "string",
  "variables": {},
  "description": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

---

### GET /notifications/sms/templates
**Purpose**: List SMS templates  
**Permission**: `notification:list`

**Query Params**:
- `type` (optional, SmsTemplateType)
- `language` (optional, string)
- `limit` (max: 200)
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
  }
}
```

---

### GET /notifications/sms/templates/:type/:language
**Purpose**: Get SMS template by type and language  
**Permission**: `notification:view`

**Path Params**: `type`, `language`

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- `NOT_FOUND` - Template not found

---

### POST /notifications/sms/templates/:id
**Purpose**: Update SMS template  
**Permission**: `notification:templates:manage`

**Path Params**: `id`

**Request Body**:
```json
{
  "message": "string",
  "variables": {},
  "description": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

---

### POST /notifications/sms/send-template
**Purpose**: Send SMS with template  
**Permission**: `notification:send`

**Headers**:
- `X-Correlation-Id` (optional)

**Request Body**:
```json
{
  "type": "SmsTemplateType",
  "recipient": "string",
  "variables": {},
  "language": "string",
  "userId": "string",
  "correlationId": "string"
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

## Email Template Endpoints

### POST /notifications/email/templates
**Purpose**: Create email template  
**Permission**: `notification:templates:manage`

**Request Body**:
```json
{
  "type": "EmailTemplateType",
  "language": "string",
  "subject": "string",
  "body": "string",
  "html": "string",
  "variables": {},
  "description": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

---

### GET /notifications/email/templates
**Purpose**: List email templates  
**Permission**: `notification:list`

**Query Params**:
- `type` (optional, EmailTemplateType)
- `language` (optional, string)
- `limit` (max: 200)
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
  }
}
```

---

### GET /notifications/email/templates/:type/:language
**Purpose**: Get email template by type and language  
**Permission**: `notification:view`

**Path Params**: `type`, `language`

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- `NOT_FOUND` - Template not found

---

### POST /notifications/email/templates/:id
**Purpose**: Update email template  
**Permission**: `notification:templates:manage`

**Path Params**: `id`

**Request Body**:
```json
{
  "subject": "string",
  "body": "string",
  "html": "string",
  "variables": {},
  "description": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

---

### POST /notifications/email/send-template
**Purpose**: Send email with template  
**Permission**: `notification:send`

**Headers**:
- `X-Correlation-Id` (optional)

**Request Body**:
```json
{
  "type": "EmailTemplateType",
  "recipient": "string",
  "variables": {},
  "language": "string",
  "userId": "string",
  "correlationId": "string"
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

## Retry Endpoints

### POST /notifications/:id/retry
**Purpose**: Retry failed notification  
**Permission**: `notification:retry`

**Path Params**: `id`

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- `NOT_FOUND` - Notification not found
- `RETRY_FAILED` - Retry failed

---

### POST /notifications/retry-all-failed
**Purpose**: Retry all failed notifications  
**Permission**: `notification:retry`

**Request Body**:
```json
{
  "maxRetries": 3
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "retried": 0,
    "failed": 0
  }
}
```

---

## Bulk & Push Endpoints

### POST /notifications/bulk
**Purpose**: Send bulk notifications  
**Permission**: `notification:send`

**Headers**:
- `X-Correlation-Id` (optional)

**Request Body**:
```json
{
  "channel": "sms|email|push",
  "type": "string",
  "recipients": ["string"],
  "message": "string",
  "scheduledAt": "ISO8601",
  "metadata": {},
  "userId": "string"
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

### POST /notifications/push
**Purpose**: Send push notification  
**Permission**: `notification:send`

**Headers**:
- `X-Correlation-Id` (optional)

**Request Body**:
```json
{
  "subscription": {
    "endpoint": "string",
    "keys": {
      "p256dh": "string",
      "auth": "string"
    }
  },
  "title": "string (required)",
  "body": "string (required)",
  "type": "string",
  "metadata": {},
  "userId": "string",
  "correlationId": "string"
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
- `BAD_REQUEST` - Valid push subscription (endpoint, keys.p256dh, keys.auth) required, title and body required

---

## Provider Health & Templates

### GET /notifications/health/providers
**Purpose**: Check provider health  
**Permission**: `notification:view`

**Response**:
```json
{
  "success": true,
  "data": {
    "sms": {
      "provider": "kavenegar",
      "configured": true
    },
    "email": {
      "provider": "sendgrid",
      "configured": true
    },
    "fallbackSms": {
      "provider": "twilio",
      "configured": true
    },
    "push": {
      "enabled": true,
      "vapidConfigured": true
    }
  }
}
```

---

### POST /notifications/templates/seed-defaults
**Purpose**: Seed default templates  
**Permission**: `notification:templates:manage`

**Response**:
```json
{
  "success": true,
  "data": {
    "smsTemplates": 0,
    "emailTemplates": 0
  }
}
```

---

## Credential Vault Endpoints

### GET /notifications/credentials
**Purpose**: List credentials  
**Permission**: `notification:credentials:view`

**Query Params**:
- `provider` (optional, string)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "credentialId": "UUID",
      "tenantId": "string",
      "provider": "string",
      "credentialType": "string",
      "maskedValue": "string",
      "isActive": true,
      "expiresAt": "ISO8601",
      "createdAt": "ISO8601"
    }
  ]
}
```

---

### POST /notifications/credentials
**Purpose**: Set credential  
**Permission**: `notification:credentials:manage`

**Request Body**:
```json
{
  "provider": "CredentialProvider",
  "credentialType": "CredentialType",
  "value": "string",
  "extra": {},
  "expiresAt": "ISO8601"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "credentialId": "UUID",
    "provider": "string",
    "credentialType": "string",
    "maskedValue": "string",
    "isActive": true,
    "expiresAt": "ISO8601"
  }
}
```

---

### POST /notifications/credentials/:credentialId/rotate
**Purpose**: Rotate credential  
**Permission**: `notification:credentials:manage`

**Path Params**: `credentialId`

**Request Body**:
```json
{
  "provider": "CredentialProvider",
  "credentialType": "CredentialType",
  "value": "string",
  "extra": {},
  "expiresAt": "ISO8601"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "credentialId": "UUID",
    "provider": "string",
    "credentialType": "string",
    "maskedValue": "string",
    "isActive": true,
    "expiresAt": "ISO8601"
  }
}
```

**Errors**:
- `NOT_FOUND` - Credential not found

---

### DELETE /notifications/credentials/:credentialId
**Purpose**: Delete credential  
**Permission**: `notification:credentials:manage`

**Path Params**: `credentialId`

**Response**:
```json
{
  "success": true,
  "data": {
    "credentialId": "string",
    "deleted": true
  }
}
```

---

## Webhook Endpoint

### POST /notifications/webhooks/delivery
**Purpose**: Handle delivery callback (webhook)  
**Auth**: CallbackAuthGuard

**Request Body**:
```json
{
  "notificationId": "string",
  "provider": "string",
  "status": "delivered|failed|bounced|complained",
  "timestamp": "ISO8601",
  "details": {},
  "tenantId": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- `NOT_FOUND` - Notification not found

---

## 2. health.controller.ts

### GET /health
**Purpose**: Health check for notification-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "notification-service",
  "timestamp": "ISO8601",
  "uptime": 123.45,
  "components": {
    "db": "ok|error",
    "redis": "ok|error",
    "kafka": "configured|disabled|not_configured"
  },
  "error": "string (only if degraded)"
}
```

---

## Summary

**Total Endpoints**: 30

**By Controller**:
- notification.controller.ts: 29
- health.controller.ts: 1

**Notification Lifecycle**:
1. Send → `/notifications`
2. Get → `/notifications/:id`
3. List → `/notifications`
4. Retry → `/notifications/:id/retry`
5. Retry All Failed → `/notifications/retry-all-failed`

**OTP Flow**:
1. Send OTP → `/notifications/otp`
2. Verify OTP → `/notifications/otp/verify`

**SMS Templates**:
1. Create → `/notifications/sms/templates`
2. List → `/notifications/sms/templates`
3. Get → `/notifications/sms/templates/:type/:language`
4. Update → `/notifications/sms/templates/:id`
5. Send with Template → `/notifications/sms/send-template`

**Email Templates**:
1. Create → `/notifications/email/templates`
2. List → `/notifications/email/templates`
3. Get → `/notifications/email/templates/:type/:language`
4. Update → `/notifications/email/templates/:id`
5. Send with Template → `/notifications/email/send-template`

**Credential Vault**:
1. List → `/notifications/credentials`
2. Set → `/notifications/credentials`
3. Rotate → `/notifications/credentials/:credentialId/rotate`
4. Delete → `/notifications/credentials/:credentialId`

**Permissions**:
- `notification:send` - Send notifications, OTP, bulk, push
- `notification:otp:send` - Send OTP
- `notification:otp:verify` - Verify OTP
- `notification:view` - View notifications, templates
- `notification:list` - List notifications, templates
- `notification:templates:manage` - Manage templates
- `notification:retry` - Retry notifications
- `notification:credentials:view` - View credentials
- `notification:credentials:manage` - Manage credentials

**Authentication**:
- Most endpoints use JwtAuthGuard + PermissionsGuard + TenantGuard
- Webhook endpoints use CallbackAuthGuard
- `/health` is public

**Providers Supported**:
- SMS: Kavenegar, Twilio, MelliPayamak
- Email: SendGrid, AWS SES
- Push: VAPID (Web Push)
