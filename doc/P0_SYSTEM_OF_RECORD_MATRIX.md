# P0 System-of-Record Matrix

This document defines the authoritative system of record (SoR) for each domain entity introduced in the P0 Foundation phase.

## Principles

- **Single source of truth**: Exactly one service owns the write model for each entity.
- **Event-sourced projections**: Other services consume events to build read models or projections.
- **Tenant-scoped data**: All entities below include `tenant_id` for isolation.

## Matrix

| Entity | System of Record | Write API | Events | Consumers |
|--------|------------------|-----------|--------|-----------|
| Organization | `auth-service` | `POST /api/v1/admin/organizations` | `insurance.organization.created` | party-kyc, sales-network, policy, underwriting |
| OrganizationCapability | `auth-service` | `POST /api/v1/admin/organizations/:id/capabilities` | `insurance.organization.capability.assigned` | sales-network, policy, underwriting |
| Tenant | `auth-service` | `POST /api/v1/admin/tenants` | `insurance.tenant.created` | all services |
| BrandConfig | `auth-service` | `PATCH /api/v1/admin/tenants/:id/brand` | `insurance.brand.configured` | api-gateway, customer-portal, agent-portal |
| Party | `party-kyc-service` | `POST /api/v1/party` | `insurance.party.created` | customer-360, policy, claims, billing, aml |
| PartyRoleAssignment | `party-kyc-service` | `POST /api/v1/parties/:id/roles` | `insurance.party.role.assigned` | sales-network, policy, claims |
| GlobalSubject | `party-kyc-service` | `POST /api/v1/global-subjects` | `insurance.global.subject.created` | auth-service, customer-360 |
| IdentityLink | `party-kyc-service` | `POST /api/v1/global-subjects/:id/links` | `insurance.identity.linked` | auth-service, customer-360 |
| BrokerLicense | `party-kyc-service` | `POST /api/v1/broker-licenses` | `insurance.broker.license.verified` | sales-network, regulatory-gateway |
| DistributionAgreement | `sales-network-service` | `POST /api/v1/distribution-agreements` | `insurance.distribution.agreement.activated` | policy, underwriting, billing, commissions |
| CommissionTier | `sales-network-service` | nested under agreement | `insurance.commission.tier.defined` | policy, billing, commissions |
| ClawbackRule | `sales-network-service` | nested under agreement | `insurance.clawback.rule.defined` | policy, billing, commissions |

## Notes

- `tenant_id` must never be renamed; only additive migrations are allowed.
- Projections must be rebuilt from events, not reverse-engineered from tables.
- Cross-service references use UUIDs; eventual consistency is achieved via outbox + Kafka.
