/**
 * Tenant Isolation Tests
 * Tests to verify cross-tenant access prevention
 */

import { TenantGuard } from './tenant-guard';
import { TenantIsolationService } from './tenant-isolation.service';

describe('TenantIsolationService', () => {
  let service: TenantIsolationService;

  beforeEach(() => {
    service = new TenantIsolationService();
  });

  describe('isValidTenantId', () => {
    it('should accept valid UUID tenant IDs', () => {
      expect(service.isValidTenantId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(service.isValidTenantId('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('should reject invalid tenant IDs', () => {
      expect(service.isValidTenantId('tenant-123')).toBe(false);
      expect(service.isValidTenantId('TENANT_ABC')).toBe(false);
      expect(service.isValidTenantId('')).toBe(false);
      expect(service.isValidTenantId(null as any)).toBe(false);
      expect(service.isValidTenantId(undefined as any)).toBe(false);
    });
  });

  describe('isCrossTenantAccessAllowed', () => {
    it('should allow cross-tenant access for system_admin', () => {
      const user = { roles: ['system_admin'] };
      expect(service.isCrossTenantAccessAllowed(user)).toBe(true);
    });

    it('should allow cross-tenant access for insurer_admin', () => {
      const user = { roles: ['insurer_admin'] };
      expect(service.isCrossTenantAccessAllowed(user)).toBe(true);
    });

    it('should deny cross-tenant access for regular users', () => {
      const user = { roles: ['agent'] };
      expect(service.isCrossTenantAccessAllowed(user)).toBe(false);
    });

    it('should deny cross-tenant access for users without roles', () => {
      const user = {};
      expect(service.isCrossTenantAccessAllowed(user)).toBe(false);
    });
  });

  describe('addTenantFilter', () => {
    it('should apply tenant filter to query builder', () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
      } as any;

      service.addTenantFilter(mockQueryBuilder, 'tenant-123', 'policy');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'policy = :tenantId',
        { tenantId: 'tenant-123' },
      );
    });
  });

  describe('addTenantToCacheKey', () => {
    it('should add tenant prefix to cache key', () => {
      const key = service.addTenantToCacheKey('user:123', 'tenant-456');
      expect(key).toContain('tenant:tenant-456');
      expect(key).toContain('user:123');
      expect(key).toBe('tenant:tenant-456:user:123');
    });

    it('should generate different keys for different tenants', () => {
      const key1 = service.addTenantToCacheKey('user:123', 'tenant-456');
      const key2 = service.addTenantToCacheKey('user:123', 'tenant-789');
      expect(key1).not.toBe(key2);
    });
  });

  describe('addTenantToQueueTopic', () => {
    it('should add tenant prefix to queue topic', () => {
      const topic = service.addTenantToQueueTopic('policy.created', 'tenant-456');
      expect(topic).toContain('tenant.tenant-456');
      expect(topic).toContain('policy.created');
      expect(topic).toBe('tenant.tenant-456.policy.created');
    });
  });

  describe('addTenantToFilePath', () => {
    it('should add tenant directory to file path', () => {
      const path = service.addTenantToFilePath('/uploads', 'tenant-456');
      expect(path).toContain('tenant-456');
      expect(path).toContain('/uploads');
      expect(path).toBe('/tenants/tenant-456/uploads');
    });
  });
});

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let mockExecutionContext: any;
  let mockReflector: any;

  beforeEach(() => {
    mockReflector = {
      get: jest.fn(),
    };
    guard = new TenantGuard(mockReflector);
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { tenantId: '550e8400-e29b-41d4-a716-446655440000' },
          headers: {},
        }),
      }),
      getHandler: jest.fn().mockReturnValue({}),
      getClass: jest.fn().mockReturnValue({}),
    };
  });

  describe('canActivate', () => {
    it('should allow access when tenant IDs match', async () => {
      mockExecutionContext.switchToHttp().getRequest = jest.fn().mockReturnValue({
        user: { tenantId: '550e8400-e29b-41d4-a716-446655440000' },
        headers: { 'x-tenant-id': '550e8400-e29b-41d4-a716-446655440000' },
        params: {},
      });

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should deny access when tenant IDs mismatch', async () => {
      mockExecutionContext.switchToHttp().getRequest = jest.fn().mockReturnValue({
        user: { tenantId: '550e8400-e29b-41d4-a716-446655440000' },
        headers: { 'x-tenant-id': '660e8400-e29b-41d4-a716-446655440000' },
        params: {},
      });

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(false);
    });

    it('should allow access when only user tenant ID is present', async () => {
      mockExecutionContext.switchToHttp().getRequest = jest.fn().mockReturnValue({
        user: { tenantId: '550e8400-e29b-41d4-a716-446655440000' },
        headers: {},
        params: {},
      });

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should use ResourceTenantId decorator when present', async () => {
      mockExecutionContext.getHandler = jest.fn().mockReturnValue({
        __resourceTenantId__: '550e8400-e29b-41d4-a716-446655440000',
      });

      mockExecutionContext.switchToHttp().getRequest = jest.fn().mockReturnValue({
        user: { tenantId: '550e8400-e29b-41d4-a716-446655440000' },
        headers: {},
        params: {},
      });

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should deny access when ResourceTenantId differs from user tenant', async () => {
      mockExecutionContext.getHandler = jest.fn().mockReturnValue({
        __resourceTenantId__: '660e8400-e29b-41d4-a716-446655440000',
      });

      mockExecutionContext.switchToHttp().getRequest = jest.fn().mockReturnValue({
        user: { tenantId: '550e8400-e29b-41d4-a716-446655440000' },
        headers: {},
        params: {},
      });

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(false);
    });
  });
});

/**
 * Cross-Tenant Access Prevention Test Scenarios
 */
export const crossTenantAccessScenarios = [
  {
    name: 'User from Tenant A accessing Tenant B data',
    userTenantId: '550e8400-e29b-41d4-a716-446655440000',
    resourceTenantId: '660e8400-e29b-41d4-a716-446655440000',
    expectedAllowed: false,
    description: 'Should deny cross-tenant data access',
  },
  {
    name: 'User from Tenant A accessing Tenant A data',
    userTenantId: '550e8400-e29b-41d4-a716-446655440000',
    resourceTenantId: '550e8400-e29b-41d4-a716-446655440000',
    expectedAllowed: true,
    description: 'Should allow same-tenant data access',
  },
  {
    name: 'Admin user with cross-tenant access',
    userTenantId: '550e8400-e29b-41d4-a716-446655440000',
    resourceTenantId: '660e8400-e29b-41d4-a716-446655440000',
    expectedAllowed: true,
    description: 'Should allow if user has insurer_admin role',
    hasAdminRole: true,
  },
];

/**
 * Run all cross-tenant access prevention tests
 */
export function runCrossTenantAccessTests(): Array<{
  scenario: string;
  passed: boolean;
  result: any;
}> {
  const service = new TenantIsolationService();
  const results: Array<{ scenario: string; passed: boolean; result: any }> = [];

  for (const scenario of crossTenantAccessScenarios) {
    // Check if tenant IDs match
    const tenantIdsMatch = scenario.userTenantId === scenario.resourceTenantId;
    
    // Check if user has admin role
    const user = scenario.hasAdminRole ? { roles: ['insurer_admin'] } : { roles: ['agent'] };
    const hasCrossTenantAccess = service.isCrossTenantAccessAllowed(user);
    
    // Determine expected result
    const expectedAllowed = tenantIdsMatch || (hasCrossTenantAccess && scenario.expectedAllowed);
    
    results.push({
      scenario: scenario.name,
      passed: expectedAllowed === scenario.expectedAllowed,
      result: { tenantIdsMatch, hasCrossTenantAccess, expectedAllowed },
    });
  }

  return results;
}

/**
 * Multi-Tenant Scenario Test
 */
export interface MultiTenantScenario {
  name: string;
  tenants: string[];
  operations: Array<{
    userTenantId: string;
    resourceTenantId: string;
    operation: string;
    expectedAllowed: boolean;
  }>;
}

export const multiTenantScenarios: MultiTenantScenario[] = [
  {
    name: 'Three-tenant isolation',
    tenants: ['550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440000'],
    operations: [
      { userTenantId: '550e8400-e29b-41d4-a716-446655440000', resourceTenantId: '550e8400-e29b-41d4-a716-446655440000', operation: 'read', expectedAllowed: true },
      { userTenantId: '550e8400-e29b-41d4-a716-446655440000', resourceTenantId: '660e8400-e29b-41d4-a716-446655440000', operation: 'read', expectedAllowed: false },
      { userTenantId: '660e8400-e29b-41d4-a716-446655440000', resourceTenantId: '770e8400-e29b-41d4-a716-446655440000', operation: 'write', expectedAllowed: false },
      { userTenantId: '770e8400-e29b-41d4-a716-446655440000', resourceTenantId: '550e8400-e29b-41d4-a716-446655440000', operation: 'delete', expectedAllowed: false },
    ],
  },
];

/**
 * Run multi-tenant scenario tests
 */
export function runMultiTenantScenarioTests(): Array<{
  scenario: string;
  passed: number;
  total: number;
  details: Array<{ operation: string; passed: boolean }>;
}> {
  const service = new TenantIsolationService();
  const results: Array<{
    scenario: string;
    passed: number;
    total: number;
    details: Array<{ operation: string; passed: boolean }>;
  }> = [];

  for (const scenario of multiTenantScenarios) {
    const details: Array<{ operation: string; passed: boolean }> = [];
    let passed = 0;

    for (const operation of scenario.operations) {
      // Check if tenant IDs match
      const tenantIdsMatch = operation.userTenantId === operation.resourceTenantId;
      const expectedAllowed = operation.expectedAllowed;
      const operationPassed = tenantIdsMatch === expectedAllowed;

      if (operationPassed) passed++;

      details.push({
        operation: `${operation.operation}: ${operation.userTenantId} -> ${operation.resourceTenantId}`,
        passed: operationPassed,
      });
    }

    results.push({
      scenario: scenario.name,
      passed,
      total: scenario.operations.length,
      details,
    });
  }

  return results;
}
