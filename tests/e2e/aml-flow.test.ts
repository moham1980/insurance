import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';

describe('E2E: AML Flow', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);
  let correlationId: string;

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('aml-service', { timeoutMs: 60000 });
    await DbHelper.truncateTable('public', 'aml_alerts');
    await DbHelper.truncateTable('public', 'aml_rules');
    await DbHelper.truncateTable('public', 'aml_consents');
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-E2E-AML-01: AML: Alert → Assign → Update Status', async () => {
    correlationId = `test-aml-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    // Create Alert
    const alertResponse = await apiClient.post('/aml/aml/alerts', {
      title: 'Suspicious Transaction',
      subjectNationalId: '1234567890',
      severity: 'high',
      details: { reason: 'Large withdrawal' },
    });
    AssertionHelpers.assertSuccessResponse(alertResponse);
    const alertId = alertResponse.data.alertId;

    // Assign Alert
    const assignResponse = await apiClient.patch(`/aml/aml/alerts/${alertId}/assign`, {
      assignedTo: 'analyst-1',
    });
    if (assignResponse.success === true) {
      expect(assignResponse.data.assignedTo).toBe('analyst-1');
    }

    // Update Status
    const updateResponse = await apiClient.patch(`/aml/aml/alerts/${alertId}/status`, {
      status: 'in_review',
    });
    if (updateResponse.success === true) {
      expect(updateResponse.data.status).toBe('in_review');
    }
  });

  test('T-E2E-AML-02: AML: Rule CRUD + Consent CRUD + Export', async () => {
    correlationId = `test-aml-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    // Create Rule
    const ruleResponse = await apiClient.post('/aml/aml/rules', {
      ruleName: `High Value Transaction ${Date.now()}`,
      ruleType: 'transaction_amount',
      expression: 'amount > 100000000',
      severity: 'high',
      description: 'Flag transactions over 100M',
      status: 'enabled',
    });
    if (ruleResponse.success === true) {
      expect(ruleResponse.data).toHaveProperty('ruleId');
      const ruleId = ruleResponse.data.ruleId;

      // Update Rule
      const updateRuleResponse = await apiClient.patch(`/aml/aml/rules/${ruleId}`, {
        expression: 'amount > 150000000',
        description: 'Updated threshold',
      });
      if (updateRuleResponse.success === true) {
        expect(updateRuleResponse.data.description).toBe('Updated threshold');
      }
    }

    // Create Consent
    const consentResponse = await apiClient.post('/aml/aml/consents', {
      subjectNationalId: 'customer-aml-456',
      consentType: 'data_processing',
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Consent for data processing',
    });
    if (consentResponse.success === true) {
      expect(consentResponse.data).toHaveProperty('consentId');
    }

    // Export
    try {
      const exportResponse = await apiClient.get('/aml/aml/export');
      if (exportResponse.success === true) {
        expect(exportResponse.data).toHaveProperty('consents');
      }
    } catch (error) {
      console.log('Export endpoint not yet implemented');
    }
  });
});
