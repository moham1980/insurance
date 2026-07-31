# P0 JWT Claims Contract

All identity tokens issued by `auth-service` (local HS256 or ecosystem iam-service RS256) MUST include the following claims. API Gateway and downstream services rely on these claims for tenant resolution, ABAC enforcement, and audit logging.

## Required Claims

| Claim | Type | Description |
|-------|------|-------------|
| `sub` | string | Global subject identifier (UUID) |
| `iss` | string | Token issuer URL |
| `aud` | string | Audience(s) |
| `exp` | number | Expiration timestamp (seconds) |
| `iat` | number | Issued-at timestamp (seconds) |
| `jti` | string | Unique token id |
| `scope` | string | Space-separated OAuth2 scopes |

## Domain-Specific Claims

| Claim | Type | Description |
|-------|------|-------------|
| `userId` | string | Service-local user identifier |
| `tenantId` | string | Tenant UUID the identity belongs to |
| `organizationId` | string | Primary organization UUID for this identity |
| `roles` | string[] | Effective role codes (resolved through role hierarchy) |
| `permissions` | string[] | Effective permission keys (resolved from roles) |
| `brandKey` | string | Brand key resolved for the tenant |
| `preferred_username` | string | Human-readable username |
| `assuranceLevel` | string | one of `low`, `substantial`, `high` |

## Validation Rules

- `tenantId` and `organizationId` are mandatory for service-to-service and privileged operations.
- Gateway rejects tokens where `tenantId` header does not match token `tenantId` (except public tenant-selection routes).
- Scope must contain at least one of `openid`, `insurance:portal`, or `insurance:service`.
- RS256 tokens from ecosystem iam-service are validated using JWKS; HS256 local tokens are only fallback for service tokens and dev mode.

## Service-to-Service

Service tokens issued via `POST /auth/service-token` must include:
- `serviceId`
- `tenantId`
- `permissions`
- `scope` = `service`
