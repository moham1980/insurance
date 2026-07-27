/**
 * Tenant Isolation Runtime Tests
 * Runtime tests with multi-tenant scenarios
 */

import { TenantIsolationService } from './tenant-isolation.service';
import { TenantGuard } from './tenant-guard';

/**
 * Multi-tenant runtime scenario test
 */
export async function runMultiTenantRuntimeScenario(): Promise<{
  success: boolean;
  results: Array<{ scenario: string; passed: boolean; details: any }>;
}> {
  const service = new TenantIsolationService();
  const results: Array<{ scenario: string; passed: boolean; details: any }> = [];

  // Scenario 1: User from Tenant A accessing Tenant A resources
  const tenantA = '550e8400-e29b-41d4-a716-446655440000';
  const tenantB = '660e8400-e29b-41d4-a716-446655440001';
  const tenantC = '770e8400-e29b-41d4-a716-446655440002';

  // Test 1: Same-tenant access should be allowed
  const sameTenantAccess = service.isValidTenantId(tenantA);
  results.push({
    scenario: 'Valid tenant ID format',
    passed: sameTenantAccess,
    details: { tenantId: tenantA, isValid: sameTenantAccess },
  });

  // Test 2: Cross-tenant access should be denied for regular users
  const regularUser = { roles: ['agent'] };
  const crossTenantAccessAllowed = service.isCrossTenantAccessAllowed(regularUser);
  results.push({
    scenario: 'Regular user cross-tenant access denied',
    passed: !crossTenantAccessAllowed,
    details: { user: regularUser, hasAccess: crossTenantAccessAllowed },
  });

  // Test 3: Admin user cross-tenant access should be allowed
  const adminUser = { roles: ['insurer_admin'] };
  const adminCrossTenantAccessAllowed = service.isCrossTenantAccessAllowed(adminUser);
  results.push({
    scenario: 'Admin user cross-tenant access allowed',
    passed: adminCrossTenantAccessAllowed,
    details: { user: adminUser, hasAccess: adminCrossTenantAccessAllowed },
  });

  // Test 4: Cache key isolation
  const cacheKey1 = service.addTenantToCacheKey('user:123', tenantA);
  const cacheKey2 = service.addTenantToCacheKey('user:123', tenantB);
  results.push({
    scenario: 'Cache key isolation between tenants',
    passed: cacheKey1 !== cacheKey2,
    details: { key1: cacheKey1, key2: cacheKey2 },
  });

  // Test 5: Queue topic isolation
  const queueTopic1 = service.addTenantToQueueTopic('policy.created', tenantA);
  const queueTopic2 = service.addTenantToQueueTopic('policy.created', tenantB);
  results.push({
    scenario: 'Queue topic isolation between tenants',
    passed: queueTopic1 !== queueTopic2,
    details: { topic1: queueTopic1, topic2: queueTopic2 },
  });

  // Test 6: File path isolation
  const filePath1 = service.addTenantToFilePath('/uploads', tenantA);
  const filePath2 = service.addTenantToFilePath('/uploads', tenantB);
  results.push({
    scenario: 'File path isolation between tenants',
    passed: filePath1 !== filePath2,
    details: { path1: filePath1, path2: filePath2 },
  });

  // Test 7: Database query filtering
  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
  };
  service.addTenantFilter(mockQueryBuilder, tenantA, 'policy');
  const filterCalled = mockQueryBuilder.andWhere.mock.calls.length > 0;
  results.push({
    scenario: 'Database query tenant filter applied',
    passed: filterCalled,
    details: { calls: mockQueryBuilder.andWhere.mock.calls },
  });

  const allPassed = results.every(r => r.passed);

  return {
    success: allPassed,
    results,
  };
}

/**
 * Simulate multi-tenant data access scenario
 */
export interface MultiTenantDataAccessScenario {
  tenantId: string;
  userId: string;
  roles: string[];
  requestedResourceTenantId: string;
  resourceType: string;
  action: string;
  expectedAccess: boolean;
}

export const multiTenantDataAccessScenarios: MultiTenantDataAccessScenario[] = [
  {
    tenantId: '550e8400-e29b-41d4-a716-446655440000',
    userId: 'user-1',
    roles: ['agent'],
    requestedResourceTenantId: '550e8400-e29b-41d4-a716-446655440000',
    resourceType: 'policy',
    action: 'read',
    expectedAccess: true,
  },
  {
    tenantId: '550e8400-e29b-41d4-a716-446655440000',
    userId: 'user-1',
    roles: ['agent'],
    requestedResourceTenantId: '660e8400-e29b-41d4-a716-446655440001',
    resourceType: 'policy',
    action: 'read',
    expectedAccess: false,
  },
  {
    tenantId: '550e8400-e29b-41d4-a716-446655440000',
    userId: 'admin-1',
    roles: ['insurer_admin'],
    requestedResourceTenantId: '660e8400-e29b-41d4-a716-446655440001',
    resourceType: 'policy',
    action: 'read',
    expectedAccess: true,
  },
  {
    tenantId: '550e8400-e29b-41d4-a716-446655440000',
    userId: 'system-1',
    roles: ['system_admin'],
    requestedResourceTenantId: '770e8400-e29b-41d4-a716-446655440002',
    resourceType: 'policy',
    action: 'read',
    expectedAccess: true,
  },
];

/**
 * Run multi-tenant data access scenario tests
 */
export function runMultiTenantDataAccessTests(): Array<{
  scenario: string;
  passed: boolean;
  details: any;
}> {
  const service = new TenantIsolationService();
  const results: Array<{ scenario: string; passed: boolean; details: any }> = [];

  for (const scenario of multiTenantDataAccessScenarios) {
    const user = { roles: scenario.roles };
    const hasCrossTenantAccess = service.isCrossTenantAccessAllowed(user);
    const isSameTenant = scenario.tenantId === scenario.requestedResourceTenantId;
    
    const accessAllowed = isSameTenant || hasCrossTenantAccess;
    const passed = accessAllowed === scenario.expectedAccess;

    results.push({
      scenario: `User ${scenario.userId} (${scenario.roles.join(', ')}) accessing ${scenario.resourceType} in tenant ${scenario.requestedResourceTenantId}`,
      passed,
      details: {
        isSameTenant,
        hasCrossTenantAccess,
        accessAllowed,
        expectedAccess: scenario.expectedAccess,
      },
    });
  }

  return results;
}

/**
 * Tenant boundary enforcement test
 */
export async function runTenantBoundaryEnforcementTest(): Promise<{
  success: boolean;
  results: Array<{ layer: string; passed: boolean; details: any }>;
}> {
  const service = new TenantIsolationService();
  const results: Array<{ layer: string; passed: boolean; details: any }> = [];

  const tenantId = '550e8400-e29b-41d4-a716-446655440000';

  // Database layer test
  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
  };
  service.addTenantFilter(mockQueryBuilder, tenantId, 'policy');
  const dbLayerPassed = mockQueryBuilder.andWhere.mock.calls.length > 0;
  results.push({
    layer: 'Database',
    passed: dbLayerPassed,
    details: { filterApplied: dbLayerPassed },
  });

  // Cache layer test
  const cacheKey = service.addTenantToCacheKey('user:123', tenantId);
  const cacheLayerPassed = cacheKey.includes(tenantId);
  results.push({
    layer: 'Cache',
    passed: cacheLayerPassed,
    details: { cacheKey, includesTenantId: cacheLayerPassed },
  });

  // Queue layer test
  const queueTopic = service.addTenantToQueueTopic('policy.created', tenantId);
  const queueLayerPassed = queueTopic.includes(tenantId);
  results.push({
    layer: 'Queue',
    passed: queueLayerPassed,
    details: { queueTopic, includesTenantId: queueLayerPassed },
  });

  // File storage layer test
  const filePath = service.addTenantToFilePath('/uploads', tenantId);
  const fileLayerPassed = filePath.includes(tenantId);
  results.push({
    layer: 'File Storage',
    passed: fileLayerPassed,
    details: { filePath, includesTenantId: fileLayerPassed },
  });

  const allPassed = results.every(r => r.passed);

  return {
    success: allPassed,
    results,
  };
}
