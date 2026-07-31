# Auth Service - Endpoint Catalog

**Service**: auth-service  
**Purpose**: Authentication, Authorization, IAM, Federation, SSO, Organization Management  
**Base Path**: `/` (varies by controller)

---

## Controllers Overview

1. **auth.controller.ts** - Core authentication (login, register, service token, user management)
2. **iam.controller.ts** - IAM features (role hierarchy, SoD, audit logs)
3. **federation.controller.ts** - Identity federation (OAuth/OIDC providers, identity linking)
4. **brand-config.controller.ts** - Brand configuration management
5. **policy-admin.controller.ts** - ABAC policy management
6. **org-units.controller.ts** - Organization unit management
7. **sso.controller.ts** - SSO (OIDC + SAML)
8. **workspace.controller.ts** - Workspace management
9. **tenant-organization.controller.ts** - Tenant and organization administration
10. **health.controller.ts** - Health check

---

## 1. auth.controller.ts

### POST /service-token
**Purpose**: Issue service-to-service JWT token  
**Auth**: Requires `X-Service-Issuer-Key` header matching `SERVICE_TOKEN_ISSUER_KEY` env var  
**Headers**:
- `X-Tenant-Id` (optional)
- `X-Service-Issuer-Key` (required)
- `X-Correlation-Id` (optional)

**Request Body**:
```json
{
  "serviceId": "string",
  "permissions": ["string"],
  "tenantId": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "string",
    "expiresAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `UNAUTHORIZED` - Invalid issuer key
- `VALIDATION_ERROR` - Invalid input
- `INTERNAL_ERROR` - Token issuance failed

---

### POST /register
**Purpose**: Register new user  
**Auth**: None (public)  
**Headers**: `X-Correlation-Id` (optional)

**Request Body**:
```json
{
  "email": "string",
  "username": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "department": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "email": "string",
    "username": "string",
    "roles": ["string"],
    "orgUnitId": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `DUPLICATE_USER` - Email/username already exists
- `VALIDATION_ERROR` - Invalid input
- `INTERNAL_ERROR` - Registration failed

---

### POST /login
**Purpose**: User login with rate limiting (5 attempts per 15 min per IP+username)  
**Auth**: None (public)  
**Headers**: `X-Tenant-Id` (optional), `X-Correlation-Id` (optional)

**Request Body**:
```json
{
  "username": "string",
  "password": "string",
  "deviceFingerprint": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "string",
    "refreshToken": "string",
    "user": {
      "userId": "string",
      "email": "string",
      "username": "string",
      "firstName": "string",
      "lastName": "string",
      "roles": ["string"],
      "department": "string",
      "orgUnitId": "string",
      "positionTitle": "string"
    }
  },
  "correlationId": "string"
}
```

**Errors**:
- `INVALID_CREDENTIALS` - Wrong username/password
- `RATE_LIMITED` - Too many login attempts
- `INTERNAL_ERROR` - Login failed

---

### GET /me
**Purpose**: Get current user info from JWT  
**Auth**: JWT required  
**Headers**: `Authorization: Bearer <token>`, `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "email": "string",
    "username": "string",
    "firstName": "string",
    "lastName": "string",
    "roles": ["string"],
    "department": "string",
    "orgUnitId": "string",
    "positionTitle": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `UNAUTHORIZED` - Invalid/expired token

---

### GET /users
**Purpose**: List users with org-unit scoping  
**Auth**: JWT + `users:list` permission + ABAC + Tenant  
**Headers**: `Authorization: Bearer <token>`, `X-Correlation-Id` (optional)

**Query Params**:
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "userId": "string",
      "email": "string",
      "username": "string",
      "firstName": "string",
      "lastName": "string",
      "roles": ["string"],
      "department": "string",
      "orgUnitId": "string",
      "positionTitle": "string",
      "lastLoginAt": "ISO8601"
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
- `INTERNAL_ERROR` - Failed to list users

**Scoping**: Non-admin users only see users in their org-unit subtree.

---

### GET /roles/catalog
**Purpose**: Get role catalog  
**Auth**: JWT + `roles:catalog` permission + ABAC + Tenant  
**Headers**: `Authorization: Bearer <token>`, `X-Correlation-Id` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "role": "string",
        "displayName": "string",
        "description": "string",
        "permissions": ["string"]
      }
    ]
  },
  "correlationId": "string"
}
```

---

### PUT /users/:userId/roles
**Purpose**: Set user roles with SoD validation  
**Auth**: JWT + `users:set_roles` permission + ABAC + Tenant + Resource(user, write)  
**Headers**: `Authorization: Bearer <token>`, `X-Correlation-Id` (optional)

**Request Body**:
```json
{
  "roles": ["string"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "roles": ["string"],
    "orgUnitId": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Invalid roles array
- `NOT_FOUND` - User not found
- `FORBIDDEN` - Org-unit scope violation

**Scoping**: Non-admin users can only modify users in their org-unit subtree.

---

### PUT /users/:userId/org-unit
**Purpose**: Assign user to org-unit  
**Auth**: JWT + `users:assign_org_unit` permission + ABAC + Tenant + Resource(user, write)  
**Headers**: `Authorization: Bearer <token>`, `X-Correlation-Id` (optional)

**Request Body**:
```json
{
  "orgUnitId": "string | null"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "orgUnitId": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Invalid orgUnitId
- `NOT_FOUND` - User not found
- `FORBIDDEN` - Org-unit scope violation

**Scoping**: Non-admin users can only assign to org-units in their subtree.

---

## 2. iam.controller.ts

**Base Path**: `/iam`  
**Auth**: JWT + PermissionsGuard + RolesGuard (all endpoints)

### GET /iam/roles/hierarchy
**Purpose**: Get role hierarchy information  
**Permission**: `roles:catalog`

**Query Params**:
- `role` (optional) - Get hierarchy for specific role

**Response**:
```json
{
  "role": "string",
  "parents": ["string"],
  "children": ["string"],
  "allRolesWithInheritance": ["string"]
}
```

---

### POST /iam/roles/sod-check
**Purpose**: Check SoD violations for role set  
**Permission**: `users:set_roles`

**Request Body**:
```json
{
  "roles": ["string"]
}
```

**Response**:
```json
{
  "hasViolations": false,
  "hasWarnings": false,
  "violations": [
    {
      "type": "string",
      "roles": ["string"],
      "description": "string"
    }
  ],
  "warnings": [
    {
      "type": "string",
      "roles": ["string"],
      "description": "string"
    }
  ]
}
```

---

### POST /iam/roles/validate-assignment
**Purpose**: Validate role assignment with SoD warnings  
**Permission**: `users:set_roles`

**Request Body**:
```json
{
  "roles": ["string"]
}
```

**Response**:
```json
[
  {
    "role": "string",
    "allowed": true,
    "conflicts": ["string"],
    "warnings": ["string"]
  }
]
```

---

### GET /iam/audit/user/:userId
**Purpose**: Get access audit logs for user  
**Permission**: `users:list`

**Path Params**: `userId`  
**Query Params**:
- `limit` (default: 50, max: 100)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "auditId": "string",
      "userId": "string",
      "resourceType": "string",
      "action": "string",
      "decision": "allow|deny",
      "timestamp": "ISO8601",
      "ipAddress": "string",
      "userAgent": "string",
      "context": {}
    }
  ],
  "pagination": {
    "total": 0,
    "limit": 50,
    "offset": 0
  }
}
```

---

### GET /iam/audit/resource
**Purpose**: Get access audit logs for resource  
**Permission**: `policy:view`

**Query Params**:
- `resourceType` (required)
- `resourceId` (required)
- `limit` (default: 50, max: 100)
- `offset` (default: 0)

**Response**: Same as user audit logs

**Errors**:
- `VALIDATION_ERROR` - Missing required params

---

### GET /iam/audit/denied
**Purpose**: Get denied access attempts  
**Permission**: `users:list`

**Query Params**:
- `limit` (default: 50, max: 100)
- `offset` (default: 0)
- `startDate` (optional, ISO8601)
- `endDate` (optional, ISO8601)

**Response**: Same as user audit logs

---

### GET /iam/audit/stats
**Purpose**: Get access statistics  
**Permission**: `reporting:view`

**Query Params**:
- `startDate` (optional, ISO8601)
- `endDate` (optional, ISO8601)

**Response**:
```json
{
  "success": true,
  "data": {
    "totalRequests": 0,
    "allowedRequests": 0,
    "deniedRequests": 0,
    "uniqueUsers": 0,
    "byResourceType": {},
    "byAction": {},
    "byDecision": {}
  }
}
```

---

## 3. federation.controller.ts

**Base Path**: `/federation`  
**Auth**: JWT + RolesGuard + PermissionsGuard (except `/federation/iam-ecosystem/callback`)

### GET /federation/providers
**Purpose**: Get configured identity providers  
**Roles**: `insurer_admin`, `head_office_ops`  
**Permission**: `federation:read`

**Response**:
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "providerId": "string",
        "name": "string",
        "type": "oidc|saml",
        "enabled": true
      }
    ]
  },
  "correlationId": "string"
}
```

---

### GET /federation/authorize
**Purpose**: Get authorization URL for provider  
**Permission**: `federation:read`

**Query Params**:
- `provider_id` (required)
- `redirect_uri` (required)
- `state` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "string",
    "state": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required params
- `FEDERATION_ERROR` - Operation failed

---

### POST /federation/token
**Purpose**: Exchange authorization code for tokens  
**Permission**: `federation:manage`

**Request Body**:
```json
{
  "providerId": "string",
  "code": "string",
  "redirectUri": "string",
  "state": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "idToken": "string",
    "expiresIn": 3600
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required params
- `TOKEN_EXCHANGE_FAILED` - Operation failed

---

### POST /federation/userinfo
**Purpose**: Get user info from provider  
**Permission**: `federation:manage`

**Request Body**:
```json
{
  "providerId": "string",
  "accessToken": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "providerUserId": "string",
    "email": "string",
    "name": "string",
    "attributes": {}
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required params
- `USERINFO_FAILED` - Operation failed

---

### POST /federation/link
**Purpose**: Link federated identity to user  
**Roles**: `insurer_admin`, `head_office_ops`  
**Permission**: `federation:manage`

**Request Body**:
```json
{
  "userId": "string",
  "providerId": "string",
  "providerUserId": "string",
  "attributes": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Federated identity linked successfully"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required params
- `LINK_FAILED` - Operation failed

---

### POST /federation/unlink
**Purpose**: Unlink federated identity from user  
**Roles**: `insurer_admin`, `head_office_ops`  
**Permission**: `federation:manage`

**Request Body**:
```json
{
  "userId": "string",
  "providerId": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Federated identity unlinked successfully"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required params
- `UNLINK_FAILED` - Operation failed

---

### GET /federation/user/:userId/identities
**Purpose**: Get user's federated identities  
**Roles**: `insurer_admin`, `head_office_ops`  
**Permission**: `federation:read`

**Path Params**: `userId`

**Response**:
```json
{
  "success": true,
  "data": {
    "identities": [
      {
        "providerId": "string",
        "providerUserId": "string",
        "linkedAt": "ISO8601",
        "attributes": {}
      }
    ]
  },
  "correlationId": "string"
}
```

**Errors**:
- `FETCH_FAILED` - Operation failed

---

### POST /federation/refresh
**Purpose**: Refresh federated tokens  
**Permission**: `federation:manage`

**Request Body**:
```json
{
  "providerId": "string",
  "refreshToken": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "expiresIn": 3600
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required params
- `REFRESH_FAILED` - Operation failed

---

### POST /federation/iam-ecosystem/callback
**Purpose**: Ecosystem IAM federation callback (no auth required)  
**Auth**: None (public)

**Request Body**:
```json
{
  "code": "string",
  "redirectUri": "string",
  "state": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "userId": "string",
    "email": "string",
    "username": "string",
    "roles": ["string"],
    "tenantId": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required params
- `ECOSYSTEM_CALLBACK_FAILED` - Operation failed
- `UNAUTHORIZED` - JWT_SECRET not configured

---

## 4. brand-config.controller.ts

**Base Path**: `/brand-configs`  
**Auth**: JWT + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### POST /brand-configs
**Purpose**: Create brand config  
**Permission**: `brand:manage`

**Request Body**:
```json
{
  "brandKey": "string",
  "name": "string",
  "logoUrl": "string",
  "primaryColor": "string",
  "secondaryColor": "string",
  "theme": "light|dark",
  "customConfig": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "brandKey": "string",
    "name": "string",
    "logoUrl": "string",
    "primaryColor": "string",
    "secondaryColor": "string",
    "theme": "light|dark",
    "customConfig": {},
    "tenantId": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

---

### GET /brand-configs
**Purpose**: List brand configs  
**Permission**: `brand:manage`

**Query Params**:
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
  }
}
```

---

### GET /brand-configs/:brandKey
**Purpose**: Get brand config by key  
**Permission**: `brand:manage`

**Path Params**: `brandKey`

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

---

### PUT /brand-configs/:brandKey
**Purpose**: Update brand config  
**Permission**: `brand:manage`

**Path Params**: `brandKey`

**Request Body**: Same as create

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

---

## 5. policy-admin.controller.ts

**Base Path**: `/abac/policies`  
**Auth**: JWT + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### POST /abac/policies
**Purpose**: Create ABAC policy  
**Permission**: `abac:policy:create`  
**Resource**: `policy` (create)

**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "resourceType": "string",
  "effect": "allow|deny",
  "conditions": [
    {
      "field": "string",
      "operator": "eq|ne|in|not_in|contains|not_contains",
      "value": "any"
    }
  ],
  "enabled": true
}
```

**Response**: Returns `AbacPolicy` entity

---

### PUT /abac/policies/:id
**Purpose**: Update ABAC policy  
**Permission**: `abac:policy:update`  
**Resource**: `policy` (write)

**Path Params**: `id`

**Request Body**: Same as create (partial update)

**Response**: Returns `AbacPolicy` entity

---

### DELETE /abac/policies/:id
**Purpose**: Delete ABAC policy  
**Permission**: `abac:policy:delete`  
**Resource**: `policy` (delete)

**Path Params**: `id`

**Response**:
```json
{
  "success": true
}
```

---

### GET /abac/policies/:id
**Purpose**: Get ABAC policy by ID  
**Permission**: `abac:policy:read`  
**Resource**: `policy` (read)

**Path Params**: `id`

**Response**: Returns `AbacPolicy` entity

---

### GET /abac/policies
**Purpose**: List ABAC policies  
**Permission**: `abac:policy:read`  
**Resource**: `policy` (read)

**Query Params**:
- `enabled` (optional, boolean)
- `status` (optional, string)
- `page` (optional, number)
- `limit` (optional, max 200)

**Response**:
```json
{
  "items": [AbacPolicy],
  "total": 0
}
```

---

### POST /abac/policies/evaluate
**Purpose**: Evaluate policy against context  
**Permission**: `abac:policy:read`  
**Resource**: `policy` (read)

**Request Body**:
```json
{
  "user": {
    "userId": "string",
    "roles": ["string"],
    "orgUnitId": "string"
  },
  "resource": {
    "type": "string",
    "id": "string"
  },
  "action": "string",
  "context": {}
}
```

**Response**:
```json
{
  "allowed": true,
  "matchedPolicy": {
    "id": "string",
    "name": "string"
  }
}
```

---

## 6. org-units.controller.ts

**Base Path**: `/` (root path)  
**Auth**: JWT + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### POST /org-units
**Purpose**: Create organization unit  
**Permission**: `org_units:create`  
**Resource**: `orgUnit` (create)

**Request Body**:
```json
{
  "type": "head_office|branch|regional_office|department|team",
  "name": "string",
  "code": "string",
  "parentOrgUnitId": "string",
  "metadata": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "orgUnitId": "string",
    "type": "string",
    "name": "string",
    "code": "string",
    "parentOrgUnitId": "string",
    "metadata": {},
    "isActive": true,
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required fields
- `DUPLICATE_CODE` - Code already exists
- `FORBIDDEN` - Parent not in user's subtree
- `INTERNAL_ERROR` - Creation failed

**Scoping**: Non-admin users must specify parent in their subtree.

---

### GET /org-units/:orgUnitId
**Purpose**: Get organization unit by ID  
**Permission**: `org_units:get`  
**Resource**: `orgUnit` (read)

**Path Params**: `orgUnitId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Org unit not found
- `FORBIDDEN` - Not in user's subtree

**Scoping**: Non-admin users can only access units in their subtree.

---

### GET /org-units
**Purpose**: List organization units  
**Permission**: `org_units:list`  
**Resource**: `orgUnit` (read)

**Query Params**:
- `type` (optional, filter by type)
- `parentOrgUnitId` (optional, filter by parent)
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "orgUnitId": "string",
      "type": "string",
      "name": "string",
      "code": "string",
      "parentOrgUnitId": "string",
      "isActive": true,
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

**Scoping**: Non-admin users only see units in their subtree.

---

## 7. sso.controller.ts

**Base Path**: `/sso`  
**Auth**: JWT (except public endpoints), rate limited (30 req/min per IP)

### GET /sso/providers
**Purpose**: Get available SSO providers  
**Auth**: None (public)

**Response**:
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "providerId": "string",
        "name": "string",
        "type": "oidc|saml",
        "enabled": true
      }
    ],
    "ssoEnabled": true
  }
}
```

---

### GET /sso/oidc/auth-url
**Purpose**: Generate OIDC authorization URL with PKCE  
**Auth**: None (public), rate limited

**Query Params**:
- `redirect_uri` (required)
- `state` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "string",
    "state": "string",
    "codeVerifier": "string",
    "nonce": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing redirect_uri
- `RATE_LIMITED` - Too many requests
- `SSO_ERROR` - Operation failed

---

### POST /sso/oidc/token
**Purpose**: Exchange OIDC authorization code for tokens  
**Auth**: None (public), rate limited

**Request Body**:
```json
{
  "code": "string",
  "redirectUri": "string",
  "state": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "idToken": "string",
    "expiresIn": 3600,
    "nonce": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required fields
- `RATE_LIMITED` - Too many requests
- `TOKEN_EXCHANGE_FAILED` - Operation failed

---

### POST /sso/oidc/verify
**Purpose**: Verify ID token  
**Auth**: None (public), rate limited

**Request Body**:
```json
{
  "idToken": "string",
  "nonce": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sub": "string",
    "email": "string",
    "name": "string",
    "given_name": "string",
    "family_name": "string",
    "iss": "string",
    "aud": "string",
    "exp": 1234567890
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required fields
- `RATE_LIMITED` - Too many requests
- `TOKEN_VERIFICATION_FAILED` - Operation failed

---

### POST /sso/oidc/refresh
**Purpose**: Refresh access token  
**Auth**: None (public), rate limited

**Request Body**:
```json
{
  "refreshToken": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "expiresIn": 3600
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing refreshToken
- `RATE_LIMITED` - Too many requests
- `TOKEN_REFRESH_FAILED` - Operation failed

---

### GET /sso/saml/sso
**Purpose**: Generate SAML SSO URL  
**Auth**: None (public), rate limited

**Query Params**:
- `idp_id` (required)
- `relay_state` (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "ssoUrl": "string",
    "relayState": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing idp_id
- `RATE_LIMITED` - Too many requests
- `SSO_ERROR` - Operation failed

---

### POST /sso/saml/acs
**Purpose**: Handle SAML response (ACS callback)  
**Auth**: None (public), rate limited

**Request Body**:
```json
{
  "samlResponse": "string",
  "relayState": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "userId": "string",
    "email": "string",
    "username": "string",
    "roles": ["string"],
    "tenantId": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required fields
- `RATE_LIMITED` - Too many requests
- `SAML_PROCESSING_FAILED` - Operation failed

---

### POST /sso/oidc/callback
**Purpose**: Complete OIDC login (code exchange + ID token verify + user mapping)  
**Auth**: None (public), rate limited

**Request Body**:
```json
{
  "code": "string",
  "redirectUri": "string",
  "state": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "userId": "string",
    "email": "string",
    "username": "string",
    "roles": ["string"],
    "tenantId": "string"
  },
  "correlationId": "string"
}
```

**Errors**:
- `VALIDATION_ERROR` - Missing required fields
- `RATE_LIMITED` - Too many requests
- `OIDC_CALLBACK_FAILED` - Operation failed

---

## 8. workspace.controller.ts

**Base Path**: `/workspaces`  
**Auth**: JWT + PermissionsGuard + AbacGuard + TenantGuard (all endpoints)

### POST /workspaces
**Purpose**: Create workspace  
**Permission**: `workspaces:manage`

**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "type": "string",
  "metadata": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "workspaceId": "string",
    "name": "string",
    "description": "string",
    "type": "string",
    "metadata": {},
    "tenantId": "string",
    "createdBy": "string",
    "createdAt": "ISO8601"
  }
}
```

---

### GET /workspaces
**Purpose**: List workspaces  
**Permission**: `workspaces:manage`

**Query Params**:
- `partyId` (optional, filter by party)
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
  }
}
```

---

### GET /workspaces/mine
**Purpose**: List user's workspaces  
**Permission**: `workspaces:view`

**Query Params**:
- `partyId` (required)
- `limit` (default: 50)
- `offset` (default: 0)

**Response**: Same as list

---

### GET /workspaces/:workspaceId
**Purpose**: Get workspace by ID  
**Permission**: `workspaces:view`

**Path Params**: `workspaceId`

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

---

### POST /workspaces/:workspaceId/members
**Purpose**: Add member to workspace  
**Permission**: `workspaces:manage`

**Path Params**: `workspaceId`

**Request Body**:
```json
{
  "partyId": "string",
  "role": "string",
  "grantedAt": "ISO8601"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "membershipId": "string",
    "workspaceId": "string",
    "partyId": "string",
    "role": "string",
    "grantedAt": "ISO8601"
  }
}
```

---

### DELETE /workspaces/:workspaceId/members/:membershipId
**Purpose**: Remove member from workspace  
**Permission**: `workspaces:manage`

**Path Params**: `workspaceId`, `membershipId`

**Response**:
```json
{
  "success": true,
  "data": {
    "removed": true
  }
}
```

---

## 9. tenant-organization.controller.ts

**Base Path**: `/api/v1/admin`  
**Auth**: JWT + PermissionsGuard + AbacGuard + TenantGuard (except `/brand/by-domain`)

### POST /api/v1/admin/organizations
**Purpose**: Create organization  
**Permission**: `org_units:create`

**Request Body**:
```json
{
  "name": "string",
  "code": "string",
  "type": "insurer|broker|agent|adjuster",
  "legalName": "string",
  "taxId": "string",
  "address": {},
  "contact": {},
  "metadata": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "organizationId": "string",
    "name": "string",
    "code": "string",
    "type": "string",
    "legalName": "string",
    "taxId": "string",
    "address": {},
    "contact": {},
    "metadata": {},
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- Internal error with `code` and `message`

---

### GET /api/v1/admin/organizations/:organizationId
**Purpose**: Get organization by ID  
**Permission**: `org_units:get`

**Path Params**: `organizationId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Organization not found

---

### PATCH /api/v1/admin/organizations/:organizationId
**Purpose**: Update organization  
**Permission**: `org_units:create`

**Path Params**: `organizationId`

**Request Body**: Partial update (same fields as create)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- Internal error with `code` and `message`

---

### GET /api/v1/admin/organizations/:organizationId/capabilities
**Purpose**: List organization capabilities  
**Permission**: `org_units:list`

**Path Params**: `organizationId`

**Query Params**:
- `tenantId` (optional)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "capabilityId": "string",
      "name": "string",
      "type": "string",
      "enabled": true,
      "config": {}
    }
  ],
  "correlationId": "string"
}
```

---

### POST /api/v1/admin/organizations/:organizationId/capabilities
**Purpose**: Create capability for organization  
**Permission**: `org_units:create`

**Path Params**: `organizationId`

**Request Body**:
```json
{
  "name": "string",
  "type": "string",
  "enabled": true,
  "config": {}
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
- Internal error with `code` and `message`

---

### DELETE /api/v1/admin/organizations/:organizationId/capabilities/:capabilityId
**Purpose**: Delete capability (suspend)  
**Permission**: `org_units:create`

**Path Params**: `organizationId`, `capabilityId`

**Response**:
```json
{
  "success": true,
  "data": {
    "capabilityId": "string",
    "status": "suspended"
  },
  "correlationId": "string"
}
```

**Errors**:
- Internal error with `code` and `message`

---

### POST /api/v1/admin/organizations/:organizationId/relationships
**Purpose**: Create organization relationship  
**Permission**: `federation:manage`

**Path Params**: `organizationId`

**Request Body**:
```json
{
  "relatedOrganizationId": "string",
  "type": "parent|child|peer|affiliate",
  "metadata": {}
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "relationshipId": "string",
    "organizationId": "string",
    "relatedOrganizationId": "string",
    "type": "string",
    "metadata": {},
    "createdAt": "ISO8601"
  },
  "correlationId": "string"
}
```

**Errors**:
- Internal error with `code` and `message`

---

### GET /api/v1/admin/tenants
**Purpose**: List tenants  
**Permission**: `org_units:list`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "tenantId": "string",
      "name": "string",
      "code": "string",
      "status": "active|suspended",
      "createdAt": "ISO8601"
    }
  ],
  "correlationId": "string"
}
```

---

### POST /api/v1/admin/tenants
**Purpose**: Create tenant  
**Permission**: `org_units:create`

**Request Body**:
```json
{
  "name": "string",
  "code": "string",
  "status": "active",
  "metadata": {}
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
- Internal error with `code` and `message`

---

### PATCH /api/v1/admin/tenants/:tenantId/brand
**Purpose**: Update tenant brand  
**Permission**: `org_units:create`

**Path Params**: `tenantId`

**Request Body**:
```json
{
  "logoUrl": "string",
  "primaryColor": "string",
  "secondaryColor": "string",
  "theme": "light|dark",
  "customConfig": {}
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
- Internal error with `code` and `message`

---

### GET /api/v1/admin/tenants/:tenantId/brand
**Purpose**: Get tenant brand  
**Permission**: `org_units:list`

**Path Params**: `tenantId`

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Brand not found

---

### GET /api/v1/admin/brand/by-domain
**Purpose**: Get brand by domain (public, no auth)  
**Auth**: None (public)

**Query Params**:
- `domain` (required)

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "correlationId": "string"
}
```

**Errors**:
- `NOT_FOUND` - Brand not found for domain

---

## 10. health.controller.ts

### GET /health
**Purpose**: Health check for auth-service  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "auth-service",
  "timestamp": "ISO8601",
  "uptime": 123.45,
  "components": {
    "db": "ok|error",
    "jwt_secret": "ok|missing",
    "service_token_issuer_key": "ok|missing",
    "pii_encryption_key": "ok|missing",
    "redis": "ok|error|not_configured",
    "session_store": "ok|error|db_managed",
    "migrations": "ok|pending|error",
    "kafka": "ok|error|not_configured"
  },
  "error": "string (only if degraded)"
}
```

---

## Summary

**Total Endpoints**: 58

**By Controller**:
- auth.controller.ts: 8
- iam.controller.ts: 6
- federation.controller.ts: 9
- brand-config.controller.ts: 4
- policy-admin.controller.ts: 6
- org-units.controller.ts: 3
- sso.controller.ts: 8
- workspace.controller.ts: 6
- tenant-organization.controller.ts: 10
- health.controller.ts: 1

**Authentication Patterns**:
- Public (no auth): `/service-token`, `/register`, `/login`, `/sso/*`, `/health`, `/api/v1/admin/brand/by-domain`, `/federation/iam-ecosystem/callback`
- JWT only: `/me`
- JWT + Permissions: `/roles/catalog`, `/iam/*`
- JWT + Permissions + ABAC + Tenant: Most admin endpoints
- JWT + Roles: Some federation endpoints

**Rate Limiting**:
- Login: 5 attempts per 15 min per IP+username
- SSO: 30 requests per min per IP
