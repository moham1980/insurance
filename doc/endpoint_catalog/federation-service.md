# Federation Service - Endpoint Catalog

**Service**: federation-service  
**Purpose**: Internal service for federation event routing, projection synchronization, and reconciliation  
**Base Path**: N/A (no REST endpoints)

---

## Service Overview

The federation-service is an internal library/service that provides federation utilities for the insurance system. It does not expose REST endpoints but provides:

1. **Event Routing** - Routes events between federated nodes
2. **Projection Synchronization** - Syncs projections across tenants
3. **Reconciliation** - Reconciles data between federated nodes
4. **Monitoring** - Health checks and sync latency monitoring
5. **Document Non-Repudiation** - Event signing and verification

---

## Exports

### Federation Event Router
- `FederationEventRouter` - Routes events to appropriate federated nodes
- `FederationEventRoute` - Event route configuration
- `PartitionSelectorConfig` - Partition selector configuration

### Projection Management
- `markAsProjection` - Marks entity as a projection
- `isProjection` - Checks if entity is a projection
- `isLocalAuthoritative` - Checks if tenant is authoritative
- `canMutate` - Checks if mutation is allowed
- `ensureFederationFields` - Ensures federation fields are present
- `FederationStatus` - Federation status enum

### Event Signing
- `signEvent` - Signs an event
- `verifyEventSignature` - Verifies event signature
- `canonicalJsonString` - Canonical JSON string for signing
- `computeEventDigest` - Computes event digest
- `generateKeyId` - Generates key ID
- `generateSigningKeyPair` - Generates signing key pair
- `SignedEventEnvelope` - Signed event envelope type
- `SigningKey` - Signing key type
- `KeyProvider` - Key provider interface

### Event Signature Validator
- `EventSignatureValidator` - Validates event signatures

### System of Record (SOR)
- `getSorMatrix` - Gets system of record matrix
- `getEntityOwner` - Gets entity owner tenant
- `isProjectionTarget` - Checks if tenant is a projection target
- `validateEntityRegistered` - Validates entity is registered
- `SorEntry` - SOR entry type
- `SorMatrix` - SOR matrix type

---

## Internal Services

### Event Router
- `federation-event-router.ts` - Federation event routing logic
- `partition-selector.ts` - Partition selection logic

### Projection Sync
- `projection-sync.service.ts` - Projection synchronization service
- `projection-apply.service.ts` - Projection application service

### Monitoring
- `partner-health-check.service.ts` - Partner health check service
- `sync-latency-monitor.ts` - Sync latency monitoring

### Reconciliation
- Reconciliation logic for data consistency between federated nodes

### Document Non-Repudiation
- `document-non-repudiation.service.ts` - Document non-repudiation service

---

## Summary

**Total REST Endpoints**: 0

**By Controller**: None (no REST controllers)

**Authentication**: N/A (no REST endpoints)

**Service Type**: Internal library/service for federation

**Key Capabilities**:
1. Event routing between federated nodes
2. Projection synchronization across tenants
3. Data reconciliation
4. Event signing and verification
5. Partner health monitoring
6. Sync latency monitoring

**Note**: This service does not expose REST endpoints. It is used internally by other services for federation-related operations. All federation operations are handled through event-driven architecture (Kafka) rather than REST APIs.
