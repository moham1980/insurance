export { FederationEventRouter, FederationEventRoute, PartitionSelectorConfig } from '../../common/src/federation/federation-event-router';
export { markAsProjection, isProjection, isLocalAuthoritative, canMutate, ensureFederationFields, FederationStatus } from '../../common/src/federation/authoritative-tenant.decorator';
export { signEvent, verifyEventSignature, canonicalJsonString, computeEventDigest, generateKeyId, generateSigningKeyPair, SignedEventEnvelope, SigningKey, KeyProvider } from '../../common/src/events/event-signer';
export { EventSignatureValidator } from '../../common/src/events/event-signature-validator';
export { getSorMatrix, getEntityOwner, isProjectionTarget, validateEntityRegistered, SorEntry, SorMatrix } from '../../common/src/federation/system-of-record';
