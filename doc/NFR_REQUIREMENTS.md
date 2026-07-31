# Non-Functional Requirements (NFR) — Insurance Brokerage Platform

## Availability

| Component | Target | Measurement |
|-----------|--------|-------------|
| Customer Portal | 99.95% uptime | Monthly, excluding planned maintenance |
| Agent Portal | 99.95% uptime | Monthly, excluding planned maintenance |
| Backend Services | 99.9% uptime | Monthly, excluding planned maintenance |
| API Gateway | 99.95% uptime | Monthly |

## Recovery

| Metric | Target |
|--------|--------|
| RTO (Recovery Time Objective) | < 1 hour |
| RPO (Recovery Point Objective) | < 15 minutes |

## Data Retention

| Data Type | Retention Period |
|-----------|-----------------|
| Insurance Policies | 10 years from expiry |
| Claims Records | 10 years from closure |
| Audit Logs | 7 years |
| KYC Records | 5 years from party deactivation |
| PII References | Revoked after party deactivation, purged per GDPR/Sanhab requirements |

## Performance

| Endpoint Type | P95 Latency | P99 Latency |
|---------------|-------------|-------------|
| Read (GET) | < 200ms | < 500ms |
| Write (POST/PUT) | < 500ms | < 1s |
| Quote Comparison | < 2s | < 5s |
| Policy Issuance | < 5s | < 10s |

## Security

- All PII data encrypted at rest using AES-256-GCM (AEAD)
- All inter-service communication over TLS
- JWT validation with JWKS for RS256, HS256 fallback with strict issuer/audience
- Row-Level Security (RLS) enforced at PostgreSQL level
- ABAC guard on all sensitive endpoints
- Idempotency keys with payload hash mismatch rejection (HTTP 409)
- Signed internal tenant context from API Gateway (HMAC-SHA256)

## Observability

- X-Correlation-Id propagated on all requests and events
- OpenTelemetry/Jaeger for distributed tracing
- Prometheus metrics with tenant/organization labels
- Loki logging with PII masking
- Kafka consumer lag and DLQ depth monitoring
- Alerting on downtime, high latency, and lag thresholds

## Money Handling

- All monetary values stored as `numeric` (decimal) in PostgreSQL
- `Money.amountMinor` represented as decimal string in TypeScript for new entities
- `Money.currency` always explicit (never implicit default)
- No `float` or `double` types for monetary values
- DistributionAgreement, BonusTier, MarkupRule use `string` for amount fields
- Policy.premiumAmount uses `numeric` column type (correct at DB level)

## Migration Safety

- All migrations are versioned and idempotent
- Migration process: expand/backfill → dual-read/dual-write → validation → cutover → rollback
- `rollbackN` executes `down()` methods from migration files
- `backfillReconcile` verifies count consistency before and after migration
- `backupSchema` creates pre-migration schema backup
- `backup-restore-verify.ts` validates backup integrity
- Dedicated `insurance_migration_role` with BYPASSRLS for migrations only

## Negative Tests Required

- Float money rejection (no `number` type for new Money fields)
- Duplicate idempotency key with different payload → HTTP 409
- JWT tampering → HTTP 401
- Header spoofing (X-Tenant-Id mismatch with JWT) → HTTP 403
- ABAC bypass attempt → HTTP 403
- Separation of Duties (SoD) violation → HTTP 403
