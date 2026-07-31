# P0 Global Architecture Gates

This document defines the exit gates that must be satisfied before P0 can be declared complete and work proceeds to P1.

## Foundation Data Model

- [x] `Organization`, `Tenant`, `BrandConfig` entities and migrations exist.
- [x] `OrganizationCapability` distinguishes `CARRIER`, `BROKER`, `MGA`, `AGENCY`, `AGGREGATOR`, `LOSS_ADJUSTER`, `SERVICE_PROVIDER`.
- [x] `Party`, `PartyRoleAssignment`, `GlobalSubject`, `IdentityIdentifier`, `IdentityLink` entities and migrations exist.
- [x] `BrokerLicense` entity exists with central code and license number uniqueness.
- [x] `DistributionAgreement`, `CommissionTier`, `ReferralRule`, `ClawbackRule` entities and migrations exist.
- [x] Tenant/organization identifiers are additive; `tenantId` is never renamed.

## APIs and Federation

- [x] `auth-service` exposes admin APIs for organizations, tenants, brands, capabilities, and relationships.
- [x] `party-kyc-service` exposes APIs for party roles, global subjects, identity links, and broker licenses.
- [x] `sales-network-service` exposes distribution agreement lifecycle and eligibility APIs.
- [x] `api-gateway` resolves tenant from `Host` header / brand key before `x-tenant-id`.
- [x] JWT claims include `tenantId`, `organizationId`, `roles`, `permissions`, `brandKey`.

## Security and Isolation

- [x] ABAC policy attributes include `tenantId`, `organizationId`, `partyId`, `roleType`, `resource.type`, `action`, `time`, `location`.
- [x] PostgreSQL RLS policies are provided for tenant-scoped tables.
- [x] PII is stored encrypted/KMS-ready; blind indexes are used for lookups.

## Events and Contracts

- [x] OpenAPI and AsyncAPI contracts are published in `contracts/openapi/brokerage-p0.yaml` and `contracts/asyncapi/brokerage-p0.yaml`.
- [ ] CI contract tests pass (tracked under `tests/contract`).

## Migration and Operations

- [x] Zero-downtime migration runner supports `--dry-run`, `--reconcile`, `--rollback N`, and `--backup`.
- [x] System-of-Record matrix documents ownership for all new entities.
- [x] Observability plan covers metrics, logs, traces, and alerting.

## Idempotency

- [x] Idempotency middleware supports `x-idempotency-key` with configurable TTL.

## Known Remaining Work

- Full CI contract test execution and bug fixes.
- Kafka outbox wiring for new P0 domain events.
- Front-end BFF alignment for new brand/tenant APIs.
- Vault/KMS integration for brand SMTP/SMS credential refs.
