import {
  permissionsForRoles,
  hasPermission,
  hasAnyPermission,
  permissionsForDomain,
  domainsForRole,
  allRoles,
  allPermissions,
  PERMISSION_REGISTRY,
  type PermissionKey,
} from './permission-registry';

describe('permission-registry', () => {
  describe('permissionsForRoles', () => {
    it('returns empty array for undefined/null roles', () => {
      expect(permissionsForRoles(undefined)).toEqual([]);
      expect(permissionsForRoles(null)).toEqual([]);
    });

    it('returns empty array for unknown roles', () => {
      expect(permissionsForRoles(['nonexistent_role'])).toEqual([]);
    });

    it('returns claims permissions for claims_handler', () => {
      const perms = permissionsForRoles(['claims_handler']);
      expect(perms).toContain('claims:register');
      expect(perms).toContain('claims:assess');
      expect(perms).toContain('claims:approve');
      expect(perms).not.toContain('fraud:triage');
    });

    it('returns all permissions for ops_admin', () => {
      const perms = permissionsForRoles(['ops_admin']);
      // Should have permissions from all 7 domains
      expect(perms).toContain('claims:register');
      expect(perms).toContain('policy:issue');
      expect(perms).toContain('fraud:triage');
      expect(perms).toContain('underwriting:decide');
      expect(perms).toContain('product:quote');
      expect(perms).toContain('complaints:create');
      expect(perms).toContain('re:treaties:create');
    });

    it('merges permissions from multiple roles', () => {
      const perms = permissionsForRoles(['claims_handler', 'fraud_analyst']);
      expect(perms).toContain('claims:register');
      expect(perms).toContain('fraud:triage');
    });

    it('deduplicates permissions', () => {
      const perms = permissionsForRoles(['ops_admin', 'insurer_admin']);
      const unique = new Set(perms);
      expect(perms.length).toBe(unique.size);
    });
  });

  describe('hasPermission', () => {
    it('returns true when permission is present', () => {
      const perms: PermissionKey[] = ['claims:view', 'claims:list'];
      expect(hasPermission(perms, 'claims:view')).toBe(true);
    });

    it('returns false when permission is absent', () => {
      const perms: PermissionKey[] = ['claims:view'];
      expect(hasPermission(perms, 'claims:approve')).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true if any required permission is present', () => {
      const perms: PermissionKey[] = ['claims:view'];
      expect(hasAnyPermission(perms, ['claims:view', 'claims:approve'])).toBe(true);
    });

    it('returns false if no required permission is present', () => {
      const perms: PermissionKey[] = ['claims:view'];
      expect(hasAnyPermission(perms, ['claims:approve', 'claims:pay'])).toBe(false);
    });
  });

  describe('permissionsForDomain', () => {
    it('filters claims permissions', () => {
      const perms = permissionsForRoles(['ops_admin']);
      const claimsPerms = permissionsForDomain(perms, 'claims');
      expect(claimsPerms.every((p) => p.startsWith('claims:'))).toBe(true);
      expect(claimsPerms.length).toBeGreaterThan(0);
    });

    it('filters reinsurance permissions', () => {
      const perms = permissionsForRoles(['reinsurance_ops']);
      const rePerms = permissionsForDomain(perms, 'reinsurance');
      expect(rePerms.every((p) => p.startsWith('re:'))).toBe(true);
      expect(rePerms.length).toBeGreaterThan(0);
    });
  });

  describe('domainsForRole', () => {
    it('returns all 7 domains for ops_admin', () => {
      const domains = domainsForRole('ops_admin');
      expect(domains).toContain('claims');
      expect(domains).toContain('policy');
      expect(domains).toContain('fraud');
      expect(domains).toContain('underwriting');
      expect(domains).toContain('product');
      expect(domains).toContain('complaints');
      expect(domains).toContain('reinsurance');
      expect(domains.length).toBe(7);
    });

    it('returns only claims for claims_handler', () => {
      const domains = domainsForRole('claims_handler');
      expect(domains).toEqual(['claims']);
    });

    it('returns only reinsurance for reinsurance_ops', () => {
      const domains = domainsForRole('reinsurance_ops');
      expect(domains).toEqual(['reinsurance']);
    });

    it('returns empty for unknown role', () => {
      expect(domainsForRole('nonexistent')).toEqual([]);
    });
  });

  describe('allRoles', () => {
    it('includes key roles', () => {
      const roles = allRoles();
      expect(roles).toContain('ops_admin');
      expect(roles).toContain('insurer_admin');
      expect(roles).toContain('claims_handler');
      expect(roles).toContain('fraud_analyst');
      expect(roles).toContain('reinsurance_ops');
      expect(roles.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('allPermissions', () => {
    it('includes permissions from all domains', () => {
      const perms = allPermissions();
      expect(perms.some((p) => p.startsWith('claims:'))).toBe(true);
      expect(perms.some((p) => p.startsWith('policy:'))).toBe(true);
      expect(perms.some((p) => p.startsWith('fraud:'))).toBe(true);
      expect(perms.some((p) => p.startsWith('underwriting:'))).toBe(true);
      expect(perms.some((p) => p.startsWith('product:'))).toBe(true);
      expect(perms.some((p) => p.startsWith('complaints:'))).toBe(true);
      expect(perms.some((p) => p.startsWith('re:'))).toBe(true);
    });
  });

  describe('PERMISSION_REGISTRY', () => {
    it('provides introspection APIs', () => {
      expect(PERMISSION_REGISTRY.roles.length).toBeGreaterThan(0);
      expect(PERMISSION_REGISTRY.permissions.length).toBeGreaterThan(0);
      expect(PERMISSION_REGISTRY.domains.length).toBe(7);
    });

    it('rolePermissions returns permissions for a role', () => {
      const perms = PERMISSION_REGISTRY.rolePermissions('claims_handler');
      expect(perms).toContain('claims:register');
      expect(perms).toContain('claims:assess');
    });

    it('rolePermissions returns empty for unknown role', () => {
      expect(PERMISSION_REGISTRY.rolePermissions('nonexistent')).toEqual([]);
    });
  });

  describe('cross-domain consistency', () => {
    it('reinsurance_ops and re_ops have identical permissions', () => {
      const reOps = permissionsForRoles(['reinsurance_ops']);
      const reOpsAlias = permissionsForRoles(['re_ops']);
      expect(reOps.sort()).toEqual(reOpsAlias.sort());
    });
  });
});
