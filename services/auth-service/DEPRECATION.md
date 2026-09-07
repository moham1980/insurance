# auth-service — DEPRECATED

> **Status:** DEPRECATED as of Phase 13 (1405/06/03)
> **Replacement:** Ecosystem IAM Service (port 8080)
> **Reason:** All legacy insurance services now support JWKS RS256 validation against the ecosystem IAM.

## Deprecation Details

The legacy `auth-service` (port 18001) has been deprecated in favor of the Ecosystem IAM Service (port 8080).

### What was done in Phase 13

1. **All legacy services now accept ecosystem JWT tokens** via JWKS RS256 validation:
   - `billing-service` — `.env` updated: `IAM_ISSUER=http://localhost:8080`, `JWKS_URI` added
   - `payments-service` — `.env` updated: `IAM_ISSUER=http://localhost:8080`, `JWKS_URI` added
   - `product-service` — `.env` updated: `IAM_ISSUER=http://localhost:8080`, `JWKS_URI` added
   - `submission-placement-service` — `.env` updated: `IAM_ISSUER=http://localhost:8080`, `JWKS_URI` added
   - `underwriting-service` — `.env` updated: `IAM_ISSUER=http://localhost:8080`, `JWKS_URI` added
   - `collections-service` — `jwt-auth.guard.ts` upgraded to support JWKS RS256, `.env` updated
   - `sales-network-service` — `jwt-auth.guard.ts` upgraded to support JWKS RS256, `.env` updated
   - `claims-service` — already supported JWKS RS256 (Phase 1)
   - `policy-service` — already supported JWKS RS256 (Phase 1)

2. **api-gateway** — Route `/auth` marked as optional (`required=false`)
   - `JWT_ISSUERS` includes both `http://localhost:8080` (PRIMARY) and `http://localhost:18001` (DEPRECATED)
   - `JWKS_URI` points to ecosystem IAM: `http://localhost:8080/.well-known/jwks.json`

3. **Mobile app** — Already uses ecosystem IAM directly (`/oauth2/token` on port 8080)

### What this means

- **auth-service can be safely stopped** — no production service depends on it
- **JWT tokens from ecosystem IAM** are accepted by all legacy services
- **Backward compatibility** — HS256 fallback remains for any legacy tokens still in circulation
- **No code changes needed** in the mobile app or BFF — they already use ecosystem IAM

### Migration path

1. Stop `auth-service` (port 18001)
2. All new tokens are issued by ecosystem IAM (port 8080)
3. Existing HS256 tokens will expire naturally (typically 1 hour)
4. After all HS256 tokens expire, remove `JWT_SECRET` and `http://localhost:18001` from `JWT_ISSUERS`

### Files modified in Phase 13

| File | Change |
|-----|--------|
| `services/billing-service/.env` | `IAM_ISSUER` → `http://localhost:8080`, `JWKS_URI` + `JWT_AUDIENCES` added |
| `services/payments-service/.env` | `IAM_ISSUER` → `http://localhost:8080`, `JWKS_URI` + `JWT_AUDIENCES` added |
| `services/product-service/.env` | `IAM_ISSUER` → `http://localhost:8080`, `JWKS_URI` + `JWT_AUDIENCES` added |
| `services/submission-placement-service/.env` | `IAM_ISSUER` → `http://localhost:8080`, `JWKS_URI` + `JWT_AUDIENCES` added |
| `services/underwriting-service/.env` | `IAM_ISSUER` → `http://localhost:8080`, `JWKS_URI` + `JWT_AUDIENCES` added |
| `services/collections-service/.env` | `IAM_ISSUER` → `http://localhost:8080`, `JWKS_URI` + `JWT_AUDIENCES` added |
| `services/collections-service/src/jwt-auth.guard.ts` | Upgraded to support JWKS RS256 + HS256 fallback |
| `services/collections-service/package.json` | `jwks-rsa` dependency added |
| `services/sales-network-service/.env` | `IAM_ISSUER` → `http://localhost:8080`, `JWKS_URI` + `JWT_AUDIENCES` added |
| `services/sales-network-service/src/jwt-auth.guard.ts` | Upgraded to support JWKS RS256 + HS256 fallback |
| `services/sales-network-service/package.json` | `jwks-rsa` dependency added |
| `services/api-gateway/src/gateway.config.ts` | Route `/auth` marked as `required=false` (DEPRECATED) |
| `services/api-gateway/.env` | Comments updated to mark auth-service as DEPRECATED |
