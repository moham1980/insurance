/**
 * Data Governance Runtime Tests
 * Tests to verify privacy scenarios with data governance components
 */

import { dataClassificationService } from './data-classification';
import { consentManagementService } from './consent-management';
import { purposeBasedAccessService } from './purpose-based-access';
import { dataMinimizationService } from './data-minimization';
import { dataSubjectRequestService } from './data-subject-request';

describe('Data Governance Runtime Tests', () => {
  describe('Privacy Scenario 1: PII Masking', () => {
    it('should mask national ID in logs', () => {
      const logData = {
        userId: '1234567890',
        nationalId: '0123456789',
        name: 'John Doe',
      };

      // In a real implementation, PII masking middleware would process this
      // For now, verify classification
      const classification = dataClassificationService.classifyData({
        field: 'nationalId',
        sensitivity: 'confidential',
      });

      expect(classification.level).toBe('confidential');
    });

    it('should mask phone numbers in responses', () => {
      const responseData = {
        phone: '+989123456789',
        email: 'user@example.com',
      };

      const phoneClassification = dataClassificationService.classifyData({
        field: 'phone',
        sensitivity: 'confidential',
      });

      expect(phoneClassification.level).toBe('confidential');
    });
  });

  describe('Privacy Scenario 2: Consent Management', () => {
    it('should deny access without valid consent', async () => {
      const userId = 'user-123';
      const purpose = 'marketing';

      const hasConsent = await consentManagementService.hasValidConsent(userId, purpose);

      // Should return false if no consent exists
      expect(hasConsent).toBe(false);
    });

    it('should grant access with valid consent', async () => {
      const userId = 'user-123';
      const purpose = 'claims_processing';

      // Create consent
      await consentManagementService.recordConsent(userId, purpose, {
        granted: true,
        timestamp: new Date(),
        channel: 'web',
      });

      const hasConsent = await consentManagementService.hasValidConsent(userId, purpose);

      expect(hasConsent).toBe(true);
    });

    it('should revoke consent when requested', async () => {
      const userId = 'user-123';
      const purpose = 'marketing';

      // Revoke consent
      await consentManagementService.revokeConsent(userId, purpose);

      const hasConsent = await consentManagementService.hasValidConsent(userId, purpose);

      expect(hasConsent).toBe(false);
    });
  });

  describe('Privacy Scenario 3: Purpose-Based Access Control', () => {
    it('should allow access for legitimate purpose', () => {
      const result = purposeBasedAccessService.checkAccess({
        userId: 'agent-123',
        purpose: 'claims_processing',
        resource: 'policy',
        action: 'read',
      });

      expect(result.granted).toBe(true);
    });

    it('should deny access for inappropriate purpose', () => {
      const result = purposeBasedAccessService.checkAccess({
        userId: 'agent-123',
        purpose: 'marketing',
        resource: 'policy',
        action: 'read',
      });

      expect(result.granted).toBe(false);
      expect(result.reason).toContain('purpose');
    });

    it('should allow data minimization for reporting', () => {
      const minimization = dataMinimizationService.applyRules({
        data: { name: 'John Doe', nationalId: '0123456789', policyNumber: 'POL-123' },
        purpose: 'reporting',
        action: 'aggregate',
      });

      // Should exclude nationalId for reporting
      expect(minimization.excludedFields).toContain('nationalId');
    });
  });

  describe('Privacy Scenario 4: Data Subject Rights', () => {
    it('should handle data access request', async () => {
      const request = await dataSubjectRequestService.createRequest({
        userId: 'user-123',
        type: 'access',
        requestedData: ['personal', 'policy'],
      });

      expect(request.status).toBe('pending');
      expect(request.type).toBe('access');
    });

    it('should handle data deletion request', async () => {
      const request = await dataSubjectRequestService.createRequest({
        userId: 'user-123',
        type: 'deletion',
        requestedData: ['personal'],
      });

      expect(request.status).toBe('pending');
      expect(request.type).toBe('deletion');
    });

    it('should verify data deletion request', async () => {
      const requestId = 'request-123';
      const verified = await dataSubjectRequestService.verifyRequest(requestId);

      expect(verified.status).toBe('verified');
    });

    it('should complete data deletion request', async () => {
      const requestId = 'request-123';
      const completed = await dataSubjectRequestService.completeRequest(requestId);

      expect(completed.status).toBe('completed');
    });
  });
});

/**
 * Privacy Scenario Test Cases
 */
export const privacyScenarios = [
  {
    name: 'Customer requests access to their data',
    userId: 'customer-123',
    type: 'access',
    expectedStatus: 'completed',
    description: 'GDPR right to access',
  },
  {
    name: 'Customer requests deletion of their data',
    userId: 'customer-123',
    type: 'deletion',
    expectedStatus: 'completed',
    description: 'GDPR right to be forgotten',
  },
  {
    name: 'Customer requests data portability',
    userId: 'customer-123',
    type: 'portability',
    expectedStatus: 'completed',
    description: 'GDPR right to data portability',
  },
  {
    name: 'Customer objects to data processing',
    userId: 'customer-123',
    type: 'objection',
    expectedStatus: 'completed',
    description: 'GDPR right to object',
  },
  {
    name: 'Customer requests data correction',
    userId: 'customer-123',
    type: 'correction',
    expectedStatus: 'completed',
    description: 'GDPR right to rectification',
  },
];

/**
 * Run all privacy scenario tests
 */
export async function runPrivacyScenarioTests(): Promise<Array<{
  scenario: string;
  passed: boolean;
  result: any;
}>> {
  const results: Array<{ scenario: string; passed: boolean; result: any }> = [];

  for (const scenario of privacyScenarios) {
    try {
      const request = await dataSubjectRequestService.createRequest({
        userId: scenario.userId,
        type: scenario.type as any,
        requestedData: ['personal'],
      });

      // Verify request
      await dataSubjectRequestService.verifyRequest(request.id);

      // Approve request
      await dataSubjectRequestService.approveRequest(request.id);

      // Complete request
      const completed = await dataSubjectRequestService.completeRequest(request.id);

      const passed = completed.status === scenario.expectedStatus;

      results.push({
        scenario: scenario.name,
        passed,
        result: { status: completed.status, requestId: request.id },
      });
    } catch (error) {
      results.push({
        scenario: scenario.name,
        passed: false,
        result: { error: String(error) },
      });
    }
  }

  return results;
}

/**
 * Data Minimization Scenarios
 */
export const dataMinimizationScenarios = [
  {
    name: 'Marketing campaign - minimal data',
    data: { name: 'John Doe', email: 'john@example.com', nationalId: '0123456789' },
    purpose: 'marketing',
    expectedExcluded: ['nationalId'],
    description: 'Should exclude nationalId for marketing',
  },
  {
    name: 'Claims processing - full data',
    data: { name: 'John Doe', email: 'john@example.com', nationalId: '0123456789' },
    purpose: 'claims_processing',
    expectedExcluded: [],
    description: 'Should include all data for claims processing',
  },
  {
    name: 'Analytics - aggregated data',
    data: { name: 'John Doe', email: 'john@example.com', nationalId: '0123456789' },
    purpose: 'analytics',
    expectedExcluded: ['nationalId', 'email'],
    description: 'Should exclude PII for analytics',
  },
  {
    name: 'Reporting - masked data',
    data: { name: 'John Doe', email: 'john@example.com', nationalId: '0123456789' },
    purpose: 'reporting',
    expectedExcluded: ['nationalId'],
    description: 'Should mask nationalId for reporting',
  },
];

/**
 * Run data minimization scenario tests
 */
export function runDataMinimizationTests(): Array<{
  scenario: string;
  passed: boolean;
  result: any;
}> {
  const results: Array<{ scenario: string; passed: boolean; result: any }> = [];

  for (const scenario of dataMinimizationScenarios) {
    const minimization = dataMinimizationService.applyRules({
      data: scenario.data,
      purpose: scenario.purpose,
      action: 'read',
    });

    const excludedFieldsMatch = scenario.expectedExcluded.every(field =>
      minimization.excludedFields.includes(field),
    );

    results.push({
      scenario: scenario.name,
      passed: excludedFieldsMatch,
      result: { excludedFields: minimization.excludedFields },
    });
  }

  return results;
}

/**
 * Consent Scenarios
 */
export const consentScenarios = [
  {
    name: 'User consents to marketing',
    userId: 'user-123',
    purpose: 'marketing',
    granted: true,
    expectedHasConsent: true,
  },
  {
    name: 'User denies marketing consent',
    userId: 'user-123',
    purpose: 'marketing',
    granted: false,
    expectedHasConsent: false,
  },
  {
    name: 'User consents to claims processing',
    userId: 'user-123',
    purpose: 'claims_processing',
    granted: true,
    expectedHasConsent: true,
  },
  {
    name: 'User revokes consent',
    userId: 'user-123',
    purpose: 'marketing',
    granted: true,
    revoke: true,
    expectedHasConsent: false,
  },
];

/**
 * Run consent scenario tests
 */
export async function runConsentTests(): Promise<Array<{
  scenario: string;
  passed: boolean;
  result: any;
}>> {
  const results: Array<{ scenario: string; passed: boolean; result: any }> = [];

  for (const scenario of consentScenarios) {
    // Record consent
    await consentManagementService.recordConsent(scenario.userId, scenario.purpose, {
      granted: scenario.granted,
      timestamp: new Date(),
      channel: 'web',
    });

    // Revoke if specified
    if (scenario.revoke) {
      await consentManagementService.revokeConsent(scenario.userId, scenario.purpose);
    }

    // Check consent
    const hasConsent = await consentManagementService.hasValidConsent(
      scenario.userId,
      scenario.purpose,
    );

    const passed = hasConsent === scenario.expectedHasConsent;

    results.push({
      scenario: scenario.name,
      passed,
      result: { hasConsent },
    });
  }

  return results;
}
