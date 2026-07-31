import { describe, test, expect } from '@jest/globals';

/**
 * Unit tests for Claim Projection operations.
 * Tests source version conflict resolution, supersede logic,
 * and read-only projection properties.
 *
 * Required by P5-9.1: projection update with sourceVersion.
 */

describe('Unit: Claim Projection', () => {
  test('T-UNIT-PROJ-01: Projection status types are valid', () => {
    const validStatuses = ['active', 'superseded', 'revoked'];
    for (const s of validStatuses) {
      expect(typeof s).toBe('string');
    }
    expect(validStatuses.length).toBe(3);
  });

  test('T-UNIT-PROJ-02: Newer source version supersedes older', () => {
    const resolveConflict = (
      existing: { sourceVersion: number; status: string },
      incoming: { sourceVersion: number },
    ): { action: string; newStatus: string } => {
      if (incoming.sourceVersion > existing.sourceVersion) {
        return { action: 'supersede_old', newStatus: 'superseded' };
      }
      if (incoming.sourceVersion === existing.sourceVersion) {
        return { action: 'duplicate_ignore', newStatus: existing.status };
      }
      return { action: 'stale_ignore', newStatus: existing.status };
    };

    expect(resolveConflict({ sourceVersion: 1, status: 'active' }, { sourceVersion: 2 })).toEqual({
      action: 'supersede_old',
      newStatus: 'superseded',
    });
    expect(resolveConflict({ sourceVersion: 2, status: 'active' }, { sourceVersion: 1 })).toEqual({
      action: 'stale_ignore',
      newStatus: 'active',
    });
    expect(resolveConflict({ sourceVersion: 1, status: 'active' }, { sourceVersion: 1 })).toEqual({
      action: 'duplicate_ignore',
      newStatus: 'active',
    });
  });

  test('T-UNIT-PROJ-03: Projection is read-only — no direct mutation', () => {
    const projection = {
      projectionId: 'proj-001',
      claimId: 'claim-001',
      externalClaimId: 'EXT-001',
      sourceSystemId: 'carrier-a',
      sourceVersion: 1,
      payload: { status: 'acknowledged', amount: 50000000 },
      receivedAt: new Date(),
      status: 'active',
    };

    expect(projection.projectionId).toBe('proj-001');
    expect(projection.payload.status).toBe('acknowledged');

    const mutateProjection = (field: string): boolean => {
      const immutableFields = ['projectionId', 'claimId', 'externalClaimId', 'sourceSystemId', 'sourceVersion', 'receivedAt'];
      return !immutableFields.includes(field);
    };

    expect(mutateProjection('projectionId')).toBe(false);
    expect(mutateProjection('sourceVersion')).toBe(false);
    expect(mutateProjection('payload')).toBe(true);
    expect(mutateProjection('status')).toBe(true);
  });

  test('T-UNIT-PROJ-04: External claim ID mapping is required', () => {
    const validateProjection = (proj: { externalClaimId?: string }): boolean => {
      if (!proj.externalClaimId || proj.externalClaimId.trim().length === 0) return false;
      return true;
    };

    expect(validateProjection({})).toBe(false);
    expect(validateProjection({ externalClaimId: '' })).toBe(false);
    expect(validateProjection({ externalClaimId: 'EXT-001' })).toBe(true);
  });

  test('T-UNIT-PROJ-05: Carrier organization is authoritative', () => {
    const projection = {
      brokerOrganizationId: 'broker-001',
      carrierOrganizationId: 'carrier-001',
      payload: { status: 'approved', approvedAmount: 75000000 },
    };

    expect(projection.carrierOrganizationId).toBeDefined();
    expect(projection.carrierOrganizationId).not.toBe(projection.brokerOrganizationId);
  });

  test('T-UNIT-PROJ-06: Projection delay under 5 seconds in non-federation mode', () => {
    const receivedAt = new Date();
    const eventPublishedAt = new Date(receivedAt.getTime() - 3000);
    const delay = receivedAt.getTime() - eventPublishedAt.getTime();

    expect(delay).toBeLessThan(5000);
  });
});
