export type FederationStatus = 'local' | 'shared' | 'projected';

export interface AuthoritativeTenantFields {
  authoritativeTenantId: string;
  recordOwnerOrganizationId: string;
  sourceSystemId: string;
  sourceVersion: number;
  externalId?: string;
  federationStatus: FederationStatus;
}

export function ensureFederationFields(entity: any, tenantId: string, organizationId: string, sourceSystemId: string): AuthoritativeTenantFields {
  if (!entity.authoritativeTenantId) {
    entity.authoritativeTenantId = tenantId;
  }
  if (!entity.recordOwnerOrganizationId) {
    entity.recordOwnerOrganizationId = organizationId;
  }
  if (!entity.sourceSystemId) {
    entity.sourceSystemId = sourceSystemId;
  }
  if (entity.sourceVersion === undefined || entity.sourceVersion === null) {
    entity.sourceVersion = 1;
  }
  if (!entity.federationStatus) {
    entity.federationStatus = 'local';
  }
  return {
    authoritativeTenantId: entity.authoritativeTenantId,
    recordOwnerOrganizationId: entity.recordOwnerOrganizationId,
    sourceSystemId: entity.sourceSystemId,
    sourceVersion: entity.sourceVersion,
    externalId: entity.externalId,
    federationStatus: entity.federationStatus,
  };
}

export function markAsProjection(entity: any, sourceTenantId: string, sourceOrgId: string, sourceSystemId: string, externalId?: string): void {
  entity.authoritativeTenantId = sourceTenantId;
  entity.recordOwnerOrganizationId = sourceOrgId;
  entity.sourceSystemId = sourceSystemId;
  entity.sourceVersion = (entity.sourceVersion || 0) + 1;
  if (externalId) {
    entity.externalId = externalId;
  }
  entity.federationStatus = 'projected';
}

export function isProjection(entity: any): boolean {
  return entity?.federationStatus === 'projected';
}

export function isLocalAuthoritative(entity: any, tenantId: string): boolean {
  return entity?.federationStatus === 'local' && entity?.authoritativeTenantId === tenantId;
}

export function canMutate(entity: any, tenantId: string): boolean {
  if (!entity?.federationStatus || entity.federationStatus === 'local') {
    return entity?.authoritativeTenantId === tenantId || !entity?.authoritativeTenantId;
  }
  return false;
}
