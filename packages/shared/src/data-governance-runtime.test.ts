/**
 * Data Governance Runtime Test
 * Tests to verify privacy scenarios with data governance components in a runtime environment
 */

import { classifyData, maskPii, requiresApproval, getRetentionPeriodDays } from './data-classification';
import { getDataAssetById, getDataAssetsBySensitivity, getAllPiiFields, DATA_INVENTORY } from './data-inventory';
import { consentManagementService, ConsentManagementService } from './consent-management';
import { purposeBasedAccessControlService } from './purpose-based-access';
import { dataMinimizationService } from './data-minimization';
import { dataSubjectRequestService } from './data-subject-request';

describe('Data Governance Runtime Tests', () => {
  describe('Privacy Scenario 1: Data Classification', () => {
    it('should classify national ID as PII', () => {
      const classification = classifyData({
        name: 'national_id',
        type: 'string',
        value: '0123456789',
      });

      expect(classification.sensitivity).toBe('pii');
    });

    it('should mask national ID with partial strategy', () => {
      const masked = maskPii('0123456789', 'partial');

      expect(masked).not.toBe('0123456789');
      expect(masked).toContain('*');
    });

    it('should require approval for confidential data', () => {
      const requires = requiresApproval('confidential', ['agent']);

      expect(requires).toBe(true);
    });

    it('should get retention period days', () => {
      const days = getRetentionPeriodDays('7_years');

      expect(days).toBe(2555); // 7 * 365
    });
  });

  describe('Privacy Scenario 2: Data Inventory', () => {
    it('should get data asset by ID', () => {
      const asset = getDataAssetById('customer_personal_data');

      expect(asset).toBeDefined();
      expect(asset?.sensitivity).toBe('confidential');
    });

    it('should get assets by sensitivity level', () => {
      const assets = getDataAssetsBySensitivity('pii');

      expect(Array.isArray(assets)).toBe(true);
      expect(assets.length).toBeGreaterThan(0);
    });

    it('should get all PII fields', () => {
      const piiFields = getAllPiiFields();

      expect(Array.isArray(piiFields)).toBe(true);
      expect(piiFields.length).toBeGreaterThan(0);
    });

    it('should have data inventory with assets', () => {
      expect(DATA_INVENTORY).toBeDefined();
      expect(Array.isArray(DATA_INVENTORY)).toBe(true);
      expect(DATA_INVENTORY.length).toBeGreaterThan(0);
    });
  });

  describe('Privacy Scenario 3: Consent Management', () => {
    it('should create consent', async () => {
      const consent = await consentManagementService.createConsent({
        customerId: 'customer-123',
        purpose: 'marketing',
        status: 'granted',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(consent).toBeDefined();
      expect(consent.status).toBe('granted');
    });

    it('should check consent status', () => {
      const hasConsent = consentManagementService.hasConsent('customer-123', 'marketing');

      expect(typeof hasConsent).toBe('boolean');
    });

    it('should get consent record', () => {
      const consent = consentManagementService.getConsent('customer-123', 'marketing');

      expect(consent).toBeDefined();
    });

    it('should revoke consent', () => {
      const revoked = consentManagementService.revokeConsent('customer-123', 'marketing');

      expect(revoked).toBeDefined();
    });
  });

  describe('Privacy Scenario 4: Purpose-Based Access Control', () => {
    it('should check access based on purpose', () => {
      const result = purposeBasedAccessControlService.canAccessForPurpose({
        userRoles: ['claims_agent'],
        purposeId: 'claims_processing',
      });

      expect(result).toBeDefined();
      expect(typeof result.allowed).toBe('boolean');
    });

    it('should get accessible purposes for user roles', () => {
      const purposes = purposeBasedAccessControlService.getAccessiblePurposes(['claims_agent']);

      expect(Array.isArray(purposes)).toBe(true);
    });

    it('should check if audit is required for purpose', () => {
      const auditRequired = purposeBasedAccessControlService.isAuditRequired('claims_processing');

      expect(typeof auditRequired).toBe('boolean');
    });
  });

  describe('Privacy Scenario 5: Data Minimization', () => {
    it('should apply minimization rules', () => {
      const result = dataMinimizationService.applyMinimization(
        { name: 'John Doe', nationalId: '0123456789', email: 'john@example.com' },
        { category: 'customer_personal', purpose: 'analytics' }
      );

      expect(result).toBeDefined();
    });

    it('should validate data collection', () => {
      const validation = dataMinimizationService.validateCollection(
        { name: 'John Doe', nationalId: '0123456789' },
        ['name', 'nationalId']
      );

      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe('boolean');
    });
  });

  describe('Privacy Scenario 6: Data Subject Request', () => {
    it('should create data subject request', async () => {
      const request = await dataSubjectRequestService.createRequest({
        customerId: 'customer-123',
        requestType: 'access',
        requesterName: 'John Doe',
        requesterEmail: 'john@example.com',
        verificationMethod: 'email',
        reason: 'GDPR right to access',
      });

      expect(request).toBeDefined();
      expect(request.requestType).toBe('access');
    });
  });
});

/**
 * Privacy Scenario Test Runner
 * Executes all privacy scenario tests and returns results
 */
export async function runDataGovernanceRuntimeTests(): Promise<{
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: Array<{
    scenario: string;
    passed: boolean;
    duration: number;
  }>;
}> {
  const startTime = Date.now();
  let passedTests = 0;
  let failedTests = 0;
  const results: Array<{ scenario: string; passed: boolean; duration: number }> = [];

  // Test 1: Data Classification
  try {
    const start = Date.now();
    const classification = dataClassificationService.classifyData({
      field: 'nationalId',
      value: '0123456789',
      context: 'customer_profile',
    });
    const passed = classification.level === 'confidential';
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'Data Classification - National ID', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'Data Classification - National ID', passed: false, duration: 0 });
  }

  // Test 2: Consent Management
  try {
    const start = Date.now();
    await consentManagementService.recordConsent('user-123', 'marketing', {
      granted: true,
      timestamp: new Date(),
      channel: 'web',
    });
    const hasConsent = await consentManagementService.hasValidConsent('user-123', 'marketing');
    const passed = hasConsent === true;
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'Consent Management - Record and Check', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'Consent Management - Record and Check', passed: false, duration: 0 });
  }

  // Test 3: Purpose-Based Access Control
  try {
    const start = Date.now();
    const result = purposeBasedAccessService.checkAccess({
      userId: 'agent-123',
      role: 'claims_agent',
      purpose: 'claims_processing',
      resource: 'policy',
      action: 'read',
      dataTypes: ['nationalId', 'phone'],
    });
    const passed = result.granted === true;
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'Purpose-Based Access Control - Legitimate Purpose', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'Purpose-Based Access Control - Legitimate Purpose', passed: false, duration: 0 });
  }

  // Test 4: Data Minimization
  try {
    const start = Date.now();
    const minimization = dataMinimizationService.applyRules({
      data: { name: 'John Doe', nationalId: '0123456789', policyNumber: 'POL-123' },
      purpose: 'reporting',
      action: 'aggregate',
    });
    const passed = minimization.excludedFields.includes('nationalId');
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'Data Minimization - Reporting Purpose', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'Data Minimization - Reporting Purpose', passed: false, duration: 0 });
  }

  // Test 5: Data Subject Request
  try {
    const start = Date.now();
    const request = await dataSubjectRequestService.createRequest({
      userId: 'customer-123',
      type: 'access',
      requestedData: ['personal', 'policy'],
      reason: 'GDPR right to access',
    });
    const passed = request.status === 'pending' && request.type === 'access';
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'Data Subject Request - Access Request', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'Data Subject Request - Access Request', passed: false, duration: 0 });
  }

  // Test 6: PII Masking
  try {
    const start = Date.now();
    const logData = { userId: '1234567890', nationalId: '0123456789', name: 'John Doe' };
    const masked = dataMinimizationService.maskForLogs(logData);
    const passed = masked.nationalId !== '0123456789' && masked.nationalId.includes('*');
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'PII Masking - Log Output', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'PII Masking - Log Output', passed: false, duration: 0 });
  }

  // Test 7: Data Inventory
  try {
    const start = Date.now();
    const asset = dataInventoryService.registerAsset({
      name: 'test_asset',
      type: 'database_table',
      location: 'test.table',
      owner: 'test_team',
      sensitivity: 'confidential',
      retentionPeriod: 365,
    });
    const passed = asset.id !== undefined;
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'Data Inventory - Register Asset', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'Data Inventory - Register Asset', passed: false, duration: 0 });
  }

  // Test 8: Data Lineage
  try {
    const start = Date.now();
    const lineage = dataLineageService.trackFlow({
      source: 'test.source',
      destination: 'test.destination',
      dataTypes: ['nationalId'],
      purpose: 'analytics',
      timestamp: new Date(),
    });
    const passed = lineage.id !== undefined;
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'Data Lineage - Track Flow', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'Data Lineage - Track Flow', passed: false, duration: 0 });
  }

  // Test 9: Data Retention
  try {
    const start = Date.now();
    const retention = dataRetentionService.checkRetention('test_asset');
    const passed = retention.periodDays > 0;
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'Data Retention - Check Policy', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'Data Retention - Check Policy', passed: false, duration: 0 });
  }

  // Test 10: Cross-Tenant Access Prevention
  try {
    const start = Date.now();
    const result = purposeBasedAccessService.checkAccess({
      userId: 'tenant-a-agent',
      tenantId: 'tenant-a',
      resourceTenantId: 'tenant-b',
      resource: 'policy',
      action: 'read',
      purpose: 'claims_processing',
    });
    const passed = result.granted === false && result.reason.includes('tenant');
    if (passed) passedTests++;
    else failedTests++;
    results.push({ scenario: 'Cross-Tenant Access Prevention', passed, duration: Date.now() - start });
  } catch (error) {
    failedTests++;
    results.push({ scenario: 'Cross-Tenant Access Prevention', passed: false, duration: 0 });
  }

  return {
    totalTests: 10,
    passedTests,
    failedTests,
    results,
  };
}

/**
 * Main test runner entry point
 */
if (require.main === module) {
  runDataGovernanceRuntimeTests()
    .then((results) => {
      console.log('Data Governance Runtime Test Results:');
      console.log(`Total Tests: ${results.totalTests}`);
      console.log(`Passed: ${results.passedTests}`);
      console.log(`Failed: ${results.failedTests}`);
      console.log('\nDetailed Results:');
      results.results.forEach((result) => {
        console.log(`- ${result.scenario}: ${result.passed ? 'PASS' : 'FAIL'} (${result.duration}ms)`);
      });
      process.exit(results.failedTests > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Error running tests:', error);
      process.exit(1);
    });
}
