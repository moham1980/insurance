# Federation AI/LLM Constraints (P8-16)

## Principles

1. **No PII in cross-tenant events**: Only anonymized/aggregated data may cross tenant boundaries via federation events.
2. **Consent-gated inference**: Any AI/LLM inference involving customer data from another tenant requires explicit consent.
3. **Per-tenant model authorization**: Each AI model must be explicitly authorized per tenant before use in federation contexts.
4. **Audit trail**: All federation AI inference requests must be logged with tenant, model, consent reference, and correlation ID.

## Implementation

### Event Constraints
- Cross-tenant events must use `dataClassification: 'ANONYMIZED'` or `'AGGREGATED'` in the event envelope.
- Events with `dataClassification: 'PII'` or `'CONFIDENTIAL'` must NOT be published to cross-tenant topics.
- The `FederationEventRouter` validates `dataClassification` before routing to cross-tenant topics.
- PII fields must be replaced with blind indices or global subject references.

### AI Gateway Integration
- Federation AI inference requests must route through `ecosystem-ai-gateway`.
- The AI gateway validates:
  - Caller tenant is authorized for the requested model
  - Consent exists for the subject's data category
  - Request does not contain raw PII from another tenant
- Model responses are logged with full audit trail.

### Per-Tenant Model Authorization
```typescript
interface FederationModelAuthorization {
  modelId: string;
  tenantId: string;
  authorizedAt: Date;
  authorizedBy: string;
  scopes: string[];
  dataCategories: string[];
  status: 'active' | 'revoked';
}
```

### Enforcement Points
1. **Event publishing**: `FederationEventRouter.isEventAllowedForTenant()` checks data classification
2. **AI inference**: AI gateway checks `FederationModelAuthorization` before processing
3. **Consent enforcement**: `FederationConsentService.enforceConsentBeforeProjection()` before any data projection
4. **Audit**: All federation AI operations logged to `AuditRecord` with `federationContext` metadata
