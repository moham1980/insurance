# Auth Service — Capability Truth Registry

This document records the runtime truth of auth capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Local JWT Authentication | **REAL** | `jwt.verify` with `JWT_SECRET` in auth.service.ts | None | Production-ready
| RBAC (Role-Based Access Control) | **REAL** | `@Roles` decorator + role extraction from JWT | Missing dynamic role administration UI | P1
| ABAC (Attribute-Based Access Control) | **REAL** | `abac.guard.ts` + `PolicyAdminService` with DB-backed policies and `/abac/policies` CRUD API | Policy cache TTL is 1 minute; ensure DB is reachable | P1
| OIDC Federation | **REAL** | `sso.service.ts` uses `jwks-rsa` with `OIDC_JWKS_URI` for dynamic key resolution + static key fallback | Ensure JWKS endpoint is reachable in production | P0
| SAML Federation | **REAL** | `sso.service.ts` uses `@node-saml/node-saml` for assertion signature validation and attribute mapping | Ensure SAML_CERT and SAML_SSO_URL are configured per IDP | P0
| Session Management | **REAL** | Redis-backed session store with refresh token rotation and concurrent session limits | Ensure Redis and SESSION_STORE=redis are configured | P1
| SoD (Separation of Duties) | **DESIGNED** | No explicit SoD rules in policy engine | Needs formal SoD policy rules + enforcement | P1
| Password Policy Enforcement | **REAL** | Basic bcrypt + length checks | Missing complexity, breach detection, MFA integration | P2
| Audit Trail for Auth Events | **SKELETON** | Logger only | Needs immutable audit log events published to outbox | P1

## Environment Variable Requirements

```bash
# Required for production
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
OIDC_AUTH_URL=
OIDC_TOKEN_URL=
OIDC_ISSUER=
OIDC_JWKS_URI=                    # NEW: Required for signature verification
OIDC_SECRET_KEY=                  # NEW: Alternative to JWKS for symmetric signing
SAML_IDPS=
SAML_{IDP}_SSO_URL=
SAML_{IDP}_CERT=                  # NEW: Required for signature validation
SAML_{IDP}_ATTRIBUTE_MAPPING=    # NEW: Map SAML attributes to local identity
JWT_SECRET=                       # Must be >= 32 bytes in production
JWT_EXPIRES_IN=24h
SESSION_STORE=redis               # NEW: For server-side session tracking
```

## Decision Log

- **2024-06-11**: `verifyIdToken` now uses `jwks-rsa` with `OIDC_JWKS_URI` for dynamic key resolution, falling back to `OIDC_PUBLIC_KEY`/`OIDC_SECRET_KEY`.
- **2024-06-11**: `handleSamlResponse` now uses `@node-saml/node-saml` for real assertion signature validation and attribute mapping.
- **2024-06-11**: Session management implemented with `SessionService` supporting Redis (`SESSION_STORE=redis`) and DB fallback, including refresh token rotation and concurrent session limits.
- **2024-06-11**: ABAC policies moved to DB with `AbacPolicy` entity, `PolicyAdminService` cache, and `/abac/policies` CRUD API. Hardcoded policies remain as fallback.
- **2024-06-11**: SoD rules (`POL-008`, `POL-009`, `POL-010`) are active in both hardcoded and DB policies.

## Next Actions (from Backlog)

1. AUTH-W1-01: Add truth labels to all auth exports
2. AUTH-W2-01: Implement JWKS-based OIDC signature verification
3. AUTH-W2-02: Replace SAML placeholder with real assertion parsing
4. AUTH-W2-03: Add session lifecycle with Redis store
5. AUTH-W4-01: Add SoD enforcement rules to ABAC policy engine
