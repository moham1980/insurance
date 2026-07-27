# Notification Service — Capability Truth Registry

This document records the runtime truth of notification capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| SMS Provider (Kavenegar) | **REAL** | `KavenegarProvider` injected by `AppModule` factory | Callback signature verification via shared secret | P1
| SMS Provider (Twilio) | **REAL** | `TwilioProvider` injected by `AppModule` factory | International only, not Iran-optimized | P2
| SMS Provider (MelliPayamak) | **REAL** | `MelliPayamakProvider` injected by `AppModule` factory | Iran-local REST integration | P1
| Email Provider (SendGrid) | **REAL** | `SendGridProvider` injected by `AppModule` factory | Not Iran-local; deliverability concerns | P2
| Email Provider (AWS SES) | **REAL** | `AwsSesProvider` injected by `AppModule` factory | AWS SDK v2 to v3 upgrade | P2
| Notification Logging | **REAL** | `NotificationLog` with tenant-scoped DB, outbox events per state | None | Production-ready
| Retry Logic | **REAL** | Exponential backoff scheduled async without blocking HTTP; outbox events | DLQ already supported by `@insurance/shared` OutboxWorker | Production-ready
| Template Management | **REAL** | Tenant-scoped `EmailTemplate` + `SmsTemplate` with CRUD and `/templates/seed-defaults` | Admin governance UI not implemented | P2
| OTP Integration | **REAL** | OTP generated server-side, stored in Redis with TTL, verified via `/otp/verify` | Rate limit tuning per tenant | P0-complete
| Delivery Callback | **REAL** | `CallbackAuthGuard` validates `x-api-key` / HMAC; `NotificationService` updates `delivered_at` | Provider-specific IP allow-lists can be added | P0-complete
| RBAC/ABAC | **REAL** | `RequirePermissions` on every route, `PermissionsGuard` + `TenantGuard`; `AbacGuard` removed | None | Production-ready
| JWKS/RS256 Auth | **REAL** | `JwtAuthGuard` validates RS256 via JWKS, falls back to HS256 | Rotate secrets regularly | P1
| Async Processing | **REAL** | `sendNotification` persists log/outbox and schedules `processNotification` via `setTimeout` | Migrate to BullMQ/Redis queue for horizontal scale | P1

## Environment Variable Requirements

```bash
# JWT / Auth
JWT_SECRET=change-me
IAM_ISSUER=http://localhost:8080
JWT_AUDIENCES=insurance-platform
JWKS_URI=http://localhost:8080/.well-known/jwks.json

# Postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=postgres
DB_SCHEMA=notification

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=            # optional
REDIS_DB=0

# Kafka
KAFKA_BROKERS=localhost:19092
KAFKA_ENABLED=true

# SMS Configuration
SMS_PROVIDER=kavenegar              # kavenegar | twilio | melli-payamak
SMS_FALLBACK_PROVIDER=             # optional
KAVENEGAR_API_KEY=your-kavenegar-api-key
TWILIO_ACCOUNT_SID=                 # Only if SMS_PROVIDER=twilio
TWILIO_AUTH_TOKEN=                  # Only if SMS_PROVIDER=twilio
MELLIPAYAMAK_USERNAME=              # Only if SMS_PROVIDER=melli-payamak
MELLIPAYAMAK_PASSWORD=              # Only if SMS_PROVIDER=melli-payamak

# Email Configuration
EMAIL_PROVIDER=sendgrid             # sendgrid | aws-ses
SENDGRID_API_KEY=your-sendgrid-api-key
AWS_ACCESS_KEY_ID=                  # Only if EMAIL_PROVIDER=aws-ses
AWS_SECRET_ACCESS_KEY=              # Only if EMAIL_PROVIDER=aws-ses
AWS_REGION=us-east-1                # Only if EMAIL_PROVIDER=aws-ses

# Callback Security
NOTIFICATION_CALLBACK_API_KEY=change-me
NOTIFICATION_CALLBACK_HMAC_SECRET=change-me

# OTP Rate Limiting
OTP_MAX_PER_WINDOW=5
OTP_WINDOW_MS=300000
```

## Iran Readiness Notes

- Kavenegar and MelliPayamak are supported SMS providers for Iran.
- OTP verification uses Redis-backed storage; rate limiting is per tenant and recipient.
- Templates can be seeded per tenant via `POST /notifications/templates/seed-defaults`.

## Decision Log

- **2024-06-11**: Kavenegar is default SMS provider — Iran-ready. Delivery callback handling not yet implemented.
- **2026-06-11**: OTP flow with Redis storage + rate limiting implemented in `NotificationService.sendOtp`; verify endpoint added.
- **2026-06-11**: Delivery callback webhook hardened with `CallbackAuthGuard` (API-key / HMAC).
- **2026-06-11**: All controller routes decorated with `@RequirePermissions` and `TenantGuard`; `AbacGuard` removed.
- **2026-06-11**: `JwtAuthGuard` upgraded to JWKS/RS256 + HS256 fallback.
- **2026-06-11**: `NotificationService` refactored for async processing, tenant-scoped templates, and bulk outbox events.
- **2026-06-11**: `migrate.ts` uses TypeORM `DataSource` and runs all migrations.
