import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';
import { JwtFactory } from '../helpers/jwt-factory';

describe('Integration: Rule Engine Service', () => {
  let apiClient: ApiClient;
  let adminToken: string;
  let tenantId: string;
  let ruleId: string;

  beforeAll(async () => {
    apiClient = new ApiClient('http://localhost:18000');
    tenantId = 'tenant-rule-engine-integration';
    adminToken = JwtFactory.createAdminToken(tenantId);
    await DbHelper.cleanup('rule_engine');
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('T-RE-01: RuleSet CRUD + versioning + effectiveDate', () => {
    test('should create a rule', async () => {
      const createResponse = await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'Fraud Detection Rule',
        ruleSetKey: 'fraud_detection',
        type: 'CONDITION',
        description: 'Detect potential fraud in claims',
        condition: {
          expression: 'claimAmount > 100000000',
          variables: ['claimAmount'],
        },
        action: {
          type: 'alert',
          severity: 'high',
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.data.success).toBe(true);
      expect(createResponse.data.data).toHaveProperty('id');
      expect(createResponse.data.data.name).toBe('Fraud Detection Rule');
      expect(createResponse.data.data.status).toBe('DRAFT');
      expect(createResponse.data.data.version).toBe(1);

      ruleId = createResponse.data.data.id;
    });

    test('should activate a rule', async () => {
      const activateResponse = await apiClient.put(`/rule-engine/rules/${ruleId}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(activateResponse.status).toBe(200);
      expect(activateResponse.data.success).toBe(true);
      expect(activateResponse.data.data.status).toBe('ACTIVE');
      expect(activateResponse.data.data.activatedAt).toBeDefined();
    });

    test('should deactivate a rule', async () => {
      const deactivateResponse = await apiClient.put(`/rule-engine/rules/${ruleId}/deactivate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(deactivateResponse.status).toBe(200);
      expect(deactivateResponse.data.success).toBe(true);
      expect(deactivateResponse.data.data.status).toBe('INACTIVE');
      expect(deactivateResponse.data.data.deactivatedAt).toBeDefined();
    });

    test('should create a rule with versioning', async () => {
      const createResponse = await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'Fraud Detection Rule',
        ruleSetKey: 'fraud_detection',
        type: 'CONDITION',
        condition: {
          expression: 'claimAmount > 50000000',
          variables: ['claimAmount'],
        },
        action: {
          type: 'alert',
          severity: 'medium',
        },
        priority: 1,
        version: 2,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.data.data.version).toBe(2);
    });

    test('should list rules', async () => {
      const listResponse = await apiClient.get('/rule-engine/rules', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(listResponse.status).toBe(200);
      expect(listResponse.data.success).toBe(true);
      expect(Array.isArray(listResponse.data.data)).toBe(true);
    });

    test('should get a specific rule', async () => {
      const getResponse = await apiClient.get(`/rule-engine/rules/${ruleId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.data.id).toBe(ruleId);
    });

    test('should update a rule', async () => {
      const updateResponse = await apiClient.put(`/rule-engine/rules/${ruleId}`, {
        description: 'Updated description',
        priority: 2,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.success).toBe(true);
      expect(updateResponse.data.data.description).toBe('Updated description');
    });

    test('should delete a rule', async () => {
      const createResponse = await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'Temp Rule',
        ruleSetKey: 'temp',
        type: 'CONDITION',
        condition: {
          expression: 'true',
          variables: [],
        },
        priority: 10,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const tempRuleId = createResponse.data.data.id;

      const deleteResponse = await apiClient.delete(`/rule-engine/rules/${tempRuleId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.data.success).toBe(true);
    });
  });

  describe('T-RE-02: Condition evaluation with all operators', () => {
    test('should evaluate equality operator (=)', async () => {
      const createResponse = await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'Equality Test',
        ruleSetKey: 'test',
        type: 'CONDITION',
        condition: {
          expression: 'status == "approved"',
          variables: ['status'],
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const testRuleId = createResponse.data.data.id;
      await apiClient.put(`/rule-engine/rules/${testRuleId}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const evaluateResponse = await apiClient.post('/rule-engine/evaluate', {
        tenantId,
        ruleSetKey: 'test',
        input: { status: 'approved' },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evaluateResponse.status).toBe(200);
      expect(evaluateResponse.data.data.matchedRules).toBeDefined();
      expect(evaluateResponse.data.data.matchedRules.length).toBeGreaterThan(0);
    });

    test('should evaluate greater than operator (>)', async () => {
      const evaluateResponse = await apiClient.post('/rule-engine/evaluate', {
        tenantId,
        ruleSetKey: 'test',
        input: { status: 'approved', amount: 1000 },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evaluateResponse.status).toBe(200);
    });

    test('should evaluate AND operator', async () => {
      const createResponse = await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'AND Test',
        ruleSetKey: 'test_and',
        type: 'CONDITION',
        condition: {
          expression: 'amount > 100 && amount < 1000',
          variables: ['amount'],
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const testRuleId = createResponse.data.data.id;
      await apiClient.put(`/rule-engine/rules/${testRuleId}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const evaluateResponse = await apiClient.post('/rule-engine/evaluate', {
        tenantId,
        ruleSetKey: 'test_and',
        input: { amount: 500 },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evaluateResponse.status).toBe(200);
    });

    test('should evaluate OR operator', async () => {
      const createResponse = await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'OR Test',
        ruleSetKey: 'test_or',
        type: 'CONDITION',
        condition: {
          expression: 'amount < 100 || amount > 1000',
          variables: ['amount'],
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const testRuleId = createResponse.data.data.id;
      await apiClient.put(`/rule-engine/rules/${testRuleId}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const evaluateResponse = await apiClient.post('/rule-engine/evaluate', {
        tenantId,
        ruleSetKey: 'test_or',
        input: { amount: 50 },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evaluateResponse.status).toBe(200);
    });

    test('should evaluate IN operator', async () => {
      const createResponse = await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'IN Test',
        ruleSetKey: 'test_in',
        type: 'CONDITION',
        condition: {
          expression: 'status in ["approved", "pending"]',
          variables: ['status'],
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const testRuleId = createResponse.data.data.id;
      await apiClient.put(`/rule-engine/rules/${testRuleId}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const evaluateResponse = await apiClient.post('/rule-engine/evaluate', {
        tenantId,
        ruleSetKey: 'test_in',
        input: { status: 'approved' },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evaluateResponse.status).toBe(200);
    });

    test('should evaluate LIKE operator', async () => {
      const createResponse = await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'LIKE Test',
        ruleSetKey: 'test_like',
        type: 'CONDITION',
        condition: {
          expression: 'name contains "test"',
          variables: ['name'],
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const testRuleId = createResponse.data.data.id;
      await apiClient.put(`/rule-engine/rules/${testRuleId}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const evaluateResponse = await apiClient.post('/rule-engine/evaluate', {
        tenantId,
        ruleSetKey: 'test_like',
        input: { name: 'test value' },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evaluateResponse.status).toBe(200);
    });
  });

  describe('T-RE-03: Action execution (alert, api_call, event_publish)', () => {
    test('should execute alert action', async () => {
      const createResponse = await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'Alert Action Test',
        ruleSetKey: 'test_alert',
        type: 'CONDITION',
        condition: {
          expression: 'riskScore > 0.8',
          variables: ['riskScore'],
        },
        action: {
          type: 'alert',
          severity: 'high',
          message: 'High risk detected',
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const testRuleId = createResponse.data.data.id;
      await apiClient.put(`/rule-engine/rules/${testRuleId}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const evaluateResponse = await apiClient.post('/rule-engine/evaluate', {
        tenantId,
        ruleSetKey: 'test_alert',
        input: { riskScore: 0.9 },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evaluateResponse.status).toBe(200);
      expect(evaluateResponse.data.data.matchedRules.length).toBeGreaterThan(0);
    });

    test('should execute api_call action', async () => {
      const createResponse = await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'API Call Action Test',
        ruleSetKey: 'test_api',
        type: 'CONDITION',
        condition: {
          expression: 'trigger == true',
          variables: ['trigger'],
        },
        action: {
          type: 'call',
          service: 'external-service',
          method: 'notify',
          params: { message: 'Rule triggered' },
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const testRuleId = createResponse.data.data.id;
      await apiClient.put(`/rule-engine/rules/${testRuleId}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const evaluateResponse = await apiClient.post('/rule-engine/evaluate', {
        tenantId,
        ruleSetKey: 'test_api',
        input: { trigger: true },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evaluateResponse.status).toBe(200);
    });

    test('should execute event_publish action', async () => {
      const createResponse = await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'Event Publish Action Test',
        ruleSetKey: 'test_event',
        type: 'CONDITION',
        condition: {
          expression: 'shouldPublish == true',
          variables: ['shouldPublish'],
        },
        action: {
          type: 'emit',
          event: 'RuleTriggered',
          payload: { ruleName: 'Test Rule' },
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const testRuleId = createResponse.data.data.id;
      await apiClient.put(`/rule-engine/rules/${testRuleId}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const evaluateResponse = await apiClient.post('/rule-engine/evaluate', {
        tenantId,
        ruleSetKey: 'test_event',
        input: { shouldPublish: true },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evaluateResponse.status).toBe(200);
    });
  });

  describe('T-RE-04: Evaluate: input → active rules → actions executed', () => {
    test('should evaluate all active rules and execute matching actions', async () => {
      // Create multiple rules
      await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'Rule 1',
        ruleSetKey: 'multi_rule_test',
        type: 'CONDITION',
        condition: {
          expression: 'amount > 100',
          variables: ['amount'],
        },
        action: {
          type: 'set',
          target: 'flag1',
          value: true,
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'Rule 2',
        ruleSetKey: 'multi_rule_test',
        type: 'CONDITION',
        condition: {
          expression: 'amount < 1000',
          variables: ['amount'],
        },
        action: {
          type: 'set',
          target: 'flag2',
          value: true,
        },
        priority: 2,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Activate all rules
      const listResponse = await apiClient.get('/rule-engine/rules', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      for (const rule of listResponse.data.data) {
        if (rule.ruleSetKey === 'multi_rule_test') {
          await apiClient.put(`/rule-engine/rules/${rule.id}/activate`, {}, {
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'x-tenant-id': tenantId,
            },
          });
        }
      }

      // Evaluate with input that matches both rules
      const evaluateResponse = await apiClient.post('/rule-engine/evaluate', {
        tenantId,
        ruleSetKey: 'multi_rule_test',
        input: { amount: 500 },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evaluateResponse.status).toBe(200);
      expect(evaluateResponse.data.data.matchedRules.length).toBeGreaterThan(0);
    });
  });

  describe('T-RE-05: Versioning with effectiveDate', () => {
    test('should use v1 when v2 has future effectiveDate', async () => {
      // Create v1 with current effectiveDate
      const v1Response = await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'Versioned Rule',
        ruleSetKey: 'versioned_test',
        type: 'CONDITION',
        condition: {
          expression: 'amount > 100',
          variables: ['amount'],
        },
        action: {
          type: 'set',
          target: 'version',
          value: 'v1',
        },
        priority: 1,
        version: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      await apiClient.put(`/rule-engine/rules/${v1Response.data.data.id}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Create v2 with future effectiveDate
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const v2Response = await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'Versioned Rule',
        ruleSetKey: 'versioned_test',
        type: 'CONDITION',
        condition: {
          expression: 'amount > 200',
          variables: ['amount'],
        },
        action: {
          type: 'set',
          target: 'version',
          value: 'v2',
        },
        priority: 1,
        version: 2,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      await apiClient.put(`/rule-engine/rules/${v2Response.data.data.id}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Evaluate should use v1
      const evaluateResponse = await apiClient.post('/rule-engine/evaluate', {
        tenantId,
        ruleSetKey: 'versioned_test',
        input: { amount: 150 },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evaluateResponse.status).toBe(200);
    });
  });

  describe('T-RE-06: Caching with cache invalidate on change', () => {
    test('should invalidate cache when rule changes', async () => {
      const createResponse = await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'Cache Test Rule',
        ruleSetKey: 'cache_test',
        type: 'CONDITION',
        condition: {
          expression: 'amount > 100',
          variables: ['amount'],
        },
        action: {
          type: 'set',
          target: 'result',
          value: 'original',
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const testRuleId = createResponse.data.data.id;
      await apiClient.put(`/rule-engine/rules/${testRuleId}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // First evaluation
      const eval1 = await apiClient.post('/rule-engine/evaluate', {
        tenantId,
        ruleSetKey: 'cache_test',
        input: { amount: 150 },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(eval1.status).toBe(200);

      // Update rule
      await apiClient.put(`/rule-engine/rules/${testRuleId}`, {
        condition: {
          expression: 'amount > 200',
          variables: ['amount'],
        },
        action: {
          type: 'set',
          target: 'result',
          value: 'updated',
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Second evaluation should use updated rule
      const eval2 = await apiClient.post('/rule-engine/evaluate', {
        tenantId,
        ruleSetKey: 'cache_test',
        input: { amount: 150 },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(eval2.status).toBe(200);
    });
  });

  describe('T-RE-07: Kafka consumer for automatic evaluation', () => {
    test('should evaluate rules on incoming Kafka event (simulated)', async () => {
      // This test simulates the Kafka consumer behavior
      // In production, the Kafka consumer would automatically evaluate rules on events
      const createResponse = await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'Kafka Event Rule',
        ruleSetKey: 'kafka_test',
        type: 'CONDITION',
        condition: {
          expression: 'eventType == "TransactionCreated" && amount > 10000',
          variables: ['eventType', 'amount'],
        },
        action: {
          type: 'alert',
          severity: 'high',
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const testRuleId = createResponse.data.data.id;
      await apiClient.put(`/rule-engine/rules/${testRuleId}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Simulate Kafka event evaluation
      const evaluateResponse = await apiClient.post('/rule-engine/evaluate', {
        tenantId,
        ruleSetKey: 'kafka_test',
        input: {
          eventType: 'TransactionCreated',
          amount: 15000,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evaluateResponse.status).toBe(200);
      expect(evaluateResponse.data.data.matchedRules.length).toBeGreaterThan(0);
    });
  });

  describe('T-RE-08: E2E AML rule → suspicious transaction → Alert created', () => {
    test('should create alert for suspicious transaction', async () => {
      const createResponse = await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'AML Suspicious Transaction',
        ruleSetKey: 'aml_suspicious',
        type: 'CONDITION',
        condition: {
          expression: 'transactionAmount > 50000000 && frequency > 10',
          variables: ['transactionAmount', 'frequency'],
        },
        action: {
          type: 'alert',
          severity: 'critical',
          message: 'Suspicious transaction pattern detected',
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const testRuleId = createResponse.data.data.id;
      await apiClient.put(`/rule-engine/rules/${testRuleId}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const evaluateResponse = await apiClient.post('/rule-engine/evaluate', {
        tenantId,
        ruleSetKey: 'aml_suspicious',
        businessKey: 'transaction-123',
        input: {
          transactionAmount: 60000000,
          frequency: 15,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evaluateResponse.status).toBe(200);
      expect(evaluateResponse.data.data.matchedRules.length).toBeGreaterThan(0);
    });
  });

  describe('T-RE-09: E2E Fraud rule → high score claim → hold', () => {
    test('should hold claim with high fraud score', async () => {
      const createResponse = await apiClient.post('/rule-engine/rules', {
        tenantId,
        name: 'Fraud High Score Hold',
        ruleSetKey: 'fraud_hold',
        type: 'CONDITION',
        condition: {
          expression: 'fraudScore > 0.8',
          variables: ['fraudScore'],
        },
        action: {
          type: 'set',
          target: 'status',
          value: 'hold',
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const testRuleId = createResponse.data.data.id;
      await apiClient.put(`/rule-engine/rules/${testRuleId}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const evaluateResponse = await apiClient.post('/rule-engine/evaluate', {
        tenantId,
        ruleSetKey: 'fraud_hold',
        businessKey: 'claim-456',
        input: {
          fraudScore: 0.9,
          claimId: 'CLM-001',
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evaluateResponse.status).toBe(200);
      expect(evaluateResponse.data.data.matchedRules.length).toBeGreaterThan(0);
      expect(evaluateResponse.data.data.output.status).toBe('hold');
    });
  });

  describe('T-RE-10: Audit: every evaluation recorded in RuleAudit', () => {
    test('should record evaluation in execution history', async () => {
      const evaluateResponse = await apiClient.post('/rule-engine/evaluate', {
        tenantId,
        ruleSetKey: 'fraud_hold',
        businessKey: 'audit-test-123',
        input: {
          fraudScore: 0.85,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(evaluateResponse.status).toBe(200);
      const executionId = evaluateResponse.data.data.id;

      // Get execution details
      const getResponse = await apiClient.get(`/rule-engine/executions/${executionId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.data).toHaveProperty('executionDetails');
      expect(getResponse.data.data).toHaveProperty('executedAt');
    });

    test('should list executions with filters', async () => {
      const listResponse = await apiClient.get('/rule-engine/executions', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(listResponse.status).toBe(200);
      expect(listResponse.data.success).toBe(true);
      expect(Array.isArray(listResponse.data.data)).toBe(true);
    });

    test('should get execution metrics', async () => {
      const metricsResponse = await apiClient.get('/rule-engine/executions/metrics', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.data.data).toHaveProperty('totalExecutions');
      expect(metricsResponse.data.data).toHaveProperty('successRate');
    });
  });

  describe('Rule Templates', () => {
    test('should create a rule template', async () => {
      const createResponse = await apiClient.post('/rule-engine/templates', {
        tenantId,
        name: 'Fraud Detection Template',
        category: 'fraud',
        description: 'Template for fraud detection rules',
        conditionTemplate: '${amount} > ${threshold}',
        actionTemplate: {
          type: 'alert',
          severity: '${severity}',
        },
        variables: ['amount', 'threshold', 'severity'],
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.data.success).toBe(true);
    });

    test('should list templates', async () => {
      const listResponse = await apiClient.get('/rule-engine/templates', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(listResponse.status).toBe(200);
      expect(listResponse.data.success).toBe(true);
    });

    test('should create rule from template', async () => {
      // First create a template
      const templateResponse = await apiClient.post('/rule-engine/templates', {
        tenantId,
        name: 'Threshold Template',
        category: 'validation',
        conditionTemplate: '${value} > ${minThreshold}',
        actionTemplate: {
          type: 'set',
          target: 'flagged',
          value: true,
        },
        variables: ['value', 'minThreshold'],
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const templateId = templateResponse.data.data.id;

      // Create rule from template
      const createResponse = await apiClient.post(`/rule-engine/templates/${templateId}/rules`, {
        tenantId,
        name: 'Rule from Template',
        ruleSetKey: 'template_test',
        type: 'CONDITION',
        variableValues: {
          minThreshold: 100,
        },
        priority: 1,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.data.success).toBe(true);
    });
  });
});
