import { ensureFederationFields, markAsProjection, isProjection, isLocalAuthoritative, canMutate } from '../federation/authoritative-tenant.decorator';
import { FederationEventRouter } from '../federation/federation-event-router';
import { getSorMatrix, getEntityOwner, isProjectionTarget, validateEntityRegistered } from '../federation/system-of-record';

describe('Authoritative Tenant Decorator', () => {
  it('should ensure federation fields on a local entity', () => {
    const entity: any = {};
    const fields = ensureFederationFields(entity, 'tenant-1', 'org-1', 'policy-service');
    expect(fields.authoritativeTenantId).toBe('tenant-1');
    expect(fields.recordOwnerOrganizationId).toBe('org-1');
    expect(fields.sourceSystemId).toBe('policy-service');
    expect(fields.sourceVersion).toBe(1);
    expect(fields.federationStatus).toBe('local');
  });

  it('should not overwrite existing federation fields', () => {
    const entity: any = {
      authoritativeTenantId: 'existing-tenant',
      sourceVersion: 5,
    };
    const fields = ensureFederationFields(entity, 'tenant-1', 'org-1', 'policy-service');
    expect(fields.authoritativeTenantId).toBe('existing-tenant');
    expect(fields.sourceVersion).toBe(5);
  });

  it('should mark entity as projection', () => {
    const entity: any = { federationStatus: 'local' };
    markAsProjection(entity, 'source-tenant', 'source-org', 'policy-service', 'ext-1');
    expect(entity.federationStatus).toBe('projected');
    expect(entity.authoritativeTenantId).toBe('source-tenant');
    expect(entity.recordOwnerOrganizationId).toBe('source-org');
    expect(entity.externalId).toBe('ext-1');
    expect(entity.sourceVersion).toBe(1);
  });

  it('should detect projection status', () => {
    expect(isProjection({ federationStatus: 'projected' })).toBe(true);
    expect(isProjection({ federationStatus: 'local' })).toBe(false);
    expect(isProjection({})).toBe(false);
  });

  it('should check local authoritative', () => {
    expect(isLocalAuthoritative({ federationStatus: 'local', authoritativeTenantId: 't1' }, 't1')).toBe(true);
    expect(isLocalAuthoritative({ federationStatus: 'local', authoritativeTenantId: 't1' }, 't2')).toBe(false);
    expect(isLocalAuthoritative({ federationStatus: 'projected', authoritativeTenantId: 't1' }, 't1')).toBe(false);
  });

  it('should check canMutate', () => {
    expect(canMutate({ federationStatus: 'local', authoritativeTenantId: 't1' }, 't1')).toBe(true);
    expect(canMutate({ federationStatus: 'projected', authoritativeTenantId: 't1' }, 't1')).toBe(false);
    expect(canMutate({}, 't1')).toBe(true);
  });
});

describe('FederationEventRouter', () => {
  let router: FederationEventRouter;

  beforeEach(() => {
    router = new FederationEventRouter();
  });

  it('should resolve topic name from source tenant and event type', () => {
    const topic = router.resolveTopic('tenant-1', 'policy.projection.synced');
    expect(topic).toBe('tenant-1.policy.projection.synced.events');
  });

  it('should resolve routes for projected tenants', () => {
    const routes = router.resolveRoutes(
      'source-tenant',
      'policy.projection.synced',
      ['brokerTenant', 'customerTenant'],
      'source-org',
      ['org-broker', 'org-customer'],
    );
    expect(routes).toHaveLength(2);
    expect(routes[0].targetTenantIds).toEqual(['brokerTenant']);
    expect(routes[1].targetTenantIds).toEqual(['customerTenant']);
    expect(routes[0].topic).toBe('source-tenant.policy.projection.synced.events');
  });

  it('should select partition by tenant', () => {
    const partition = router.selectPartition('tenant-1', 'org-1');
    expect(partition).toBeGreaterThanOrEqual(0);
    expect(partition).toBeLessThan(12);
  });

  it('should check if event is allowed for tenant based on SOR matrix', () => {
    const sorMatrix = {
      Policy: { owner: 'issuerTenant', projectedIn: ['brokerTenant', 'customerTenant'] },
    };
    expect(router.isEventAllowedForTenant('issuerTenant', 'brokerTenant', 'Policy', sorMatrix)).toBe(true);
    expect(router.isEventAllowedForTenant('issuerTenant', 'unknownTenant', 'Policy', sorMatrix)).toBe(false);
    expect(router.isEventAllowedForTenant('brokerTenant', 'issuerTenant', 'Policy', sorMatrix)).toBe(false);
  });
});

describe('System-of-Record Matrix', () => {
  it('should return the SOR matrix', () => {
    const matrix = getSorMatrix();
    expect(matrix.version).toBe(1);
    expect(matrix.entities).toBeDefined();
    expect(matrix.rules.length).toBeGreaterThan(0);
  });

  it('should return entity owner info', () => {
    const owner = getEntityOwner('Policy');
    expect(owner).toBeDefined();
    expect(owner?.owner).toBe('issuerTenant');
    expect(owner?.ownerService).toBe('policy-service');
    expect(owner?.projectedIn).toContain('brokerTenant');
  });

  it('should check projection target', () => {
    expect(isProjectionTarget('Policy', 'brokerTenant')).toBe(true);
    expect(isProjectionTarget('Policy', 'homeTenant')).toBe(false);
  });

  it('should validate entity registration', () => {
    expect(validateEntityRegistered('Policy')).toBe(true);
    expect(validateEntityRegistered('UnknownEntity')).toBe(false);
  });

  it('should include federation entities', () => {
    expect(validateEntityRegistered('FederationConsent')).toBe(true);
    expect(validateEntityRegistered('PartnerRegistration')).toBe(true);
    expect(validateEntityRegistered('PartnerCertificate')).toBe(true);
    expect(validateEntityRegistered('GlobalSubject')).toBe(true);
    expect(validateEntityRegistered('IdentityLink')).toBe(true);
  });
});
