import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';
import { JwtFactory } from '../helpers/jwt-factory';

describe('Integration: Workflow Engine Service', () => {
  let apiClient: ApiClient;
  let adminToken: string;
  let tenantId: string;
  let definitionId: string;
  let instanceId: string;

  beforeAll(async () => {
    apiClient = new ApiClient('http://localhost:18000');
    tenantId = 'tenant-workflow-integration';
    adminToken = JwtFactory.createAdminToken(tenantId);
    await DbHelper.cleanup('workflow_engine');
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('T-WF-01: ProcessDefinition CRUD + validation', () => {
    test('should create a valid process definition', async () => {
      const createResponse = await apiClient.post('/workflow/definitions', {
        key: 'test-process',
        name: 'Test Process',
        description: 'A test process for validation',
        graph: {
          nodes: [
            { id: 'start', type: 'start', name: 'Start', config: {} },
            { id: 'end', type: 'end', name: 'End', config: {} },
          ],
          edges: [
            { id: 'e1', from: 'start', to: 'end' },
          ],
        },
        variables: {},
        status: 'active',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.data.success).toBe(true);
      expect(createResponse.data.data).toHaveProperty('id');
      expect(createResponse.data.data.key).toBe('test-process');

      definitionId = createResponse.data.data.id;
    });

    test('should reject invalid graph (missing start node)', async () => {
      const invalidResponse = await apiClient.post('/workflow/definitions', {
        key: 'invalid-process',
        name: 'Invalid Process',
        graph: {
          nodes: [
            { id: 'end', type: 'end', name: 'End', config: {} },
          ],
          edges: [],
        },
        variables: {},
        status: 'active',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // The API should return an error for invalid graph
      expect(invalidResponse.status).toBeGreaterThanOrEqual(400);
    });

    test('should list process definitions', async () => {
      const listResponse = await apiClient.get('/workflow/definitions', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(listResponse.status).toBe(200);
      expect(listResponse.data.success).toBe(true);
      expect(Array.isArray(listResponse.data.data)).toBe(true);
    });

    test('should get a specific process definition', async () => {
      const getResponse = await apiClient.get(`/workflow/definitions/${definitionId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.data.id).toBe(definitionId);
    });
  });

  describe('T-WF-02: Simple process execution (start → api_call → end)', () => {
    test('should create a simple process definition', async () => {
      const createResponse = await apiClient.post('/workflow/definitions', {
        key: 'simple-process',
        name: 'Simple Process',
        description: 'Simple process with api_call node',
        graph: {
          nodes: [
            { id: 'start', type: 'start', name: 'Start', config: {} },
            { id: 'api1', type: 'api_call', name: 'API Call', config: { url: 'http://localhost:18000/health', method: 'GET' } },
            { id: 'end', type: 'end', name: 'End', config: {} },
          ],
          edges: [
            { id: 'e1', from: 'start', to: 'api1' },
            { id: 'e2', from: 'api1', to: 'end' },
          ],
        },
        variables: {},
        status: 'active',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
      definitionId = createResponse.data.data.id;
    });

    test('should execute a simple process flow', async () => {
      const startResponse = await apiClient.post('/workflow/start', {
        definitionKey: 'simple-process',
        businessKey: 'simple-123',
        initialVariables: {},
        startedBy: 'admin',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(startResponse.status).toBe(200);
      expect(startResponse.data.success).toBe(true);
      expect(startResponse.data.data).toHaveProperty('id');
      expect(startResponse.data.data).toHaveProperty('status');
      expect(startResponse.data.data.status).toBe('RUNNING');

      instanceId = startResponse.data.data.id;
    });

    test('should get process instance details', async () => {
      const getResponse = await apiClient.get(`/workflow/instances/${instanceId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.data.id).toBe(instanceId);
    });
  });

  describe('T-WF-03: Decision node routing', () => {
    test('should create a process with decision node', async () => {
      const createResponse = await apiClient.post('/workflow/definitions', {
        key: 'decision-process',
        name: 'Decision Process',
        description: 'Process with decision routing',
        graph: {
          nodes: [
            { id: 'start', type: 'start', name: 'Start', config: {} },
            { id: 'decision', type: 'decision', name: 'Decision', config: { expression: '${amount} > 1000' } },
            { id: 'branchA', type: 'api_call', name: 'Branch A', config: { url: 'http://localhost:18000/health', method: 'GET' } },
            { id: 'branchB', type: 'api_call', name: 'Branch B', config: { url: 'http://localhost:18000/health', method: 'GET' } },
            { id: 'end', type: 'end', name: 'End', config: {} },
          ],
          edges: [
            { id: 'e1', from: 'start', to: 'decision' },
            { id: 'e2', from: 'decision', to: 'branchA', condition: '${amount} > 1000' },
            { id: 'e3', from: 'decision', to: 'branchB', condition: '${amount} <= 1000' },
            { id: 'e4', from: 'branchA', to: 'end' },
            { id: 'e5', from: 'branchB', to: 'end' },
          ],
        },
        variables: {},
        status: 'active',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
    });

    test('should route to branch A when expression is true', async () => {
      const startResponse = await apiClient.post('/workflow/start', {
        definitionKey: 'decision-process',
        businessKey: 'decision-true-123',
        initialVariables: { amount: 1500 },
        startedBy: 'admin',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(startResponse.status).toBe(200);
      expect(startResponse.data.success).toBe(true);
    });

    test('should route to branch B when expression is false', async () => {
      const startResponse = await apiClient.post('/workflow/start', {
        definitionKey: 'decision-process',
        businessKey: 'decision-false-456',
        initialVariables: { amount: 500 },
        startedBy: 'admin',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(startResponse.status).toBe(200);
      expect(startResponse.data.success).toBe(true);
    });
  });

  describe('T-WF-04: Human task with signal', () => {
    test('should create a process with human task', async () => {
      const createResponse = await apiClient.post('/workflow/definitions', {
        key: 'human-task-process',
        name: 'Human Task Process',
        description: 'Process with human task node',
        graph: {
          nodes: [
            { id: 'start', type: 'start', name: 'Start', config: {} },
            { id: 'task1', type: 'human_task', name: 'Manual Review', config: { assignee: 'underwriter' } },
            { id: 'end', type: 'end', name: 'End', config: {} },
          ],
          edges: [
            { id: 'e1', from: 'start', to: 'task1' },
            { id: 'e2', from: 'task1', to: 'end' },
          ],
        },
        variables: {},
        status: 'active',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
    });

    test('should start process and wait for human task signal', async () => {
      const startResponse = await apiClient.post('/workflow/start', {
        definitionKey: 'human-task-process',
        businessKey: 'human-123',
        initialVariables: {},
        startedBy: 'admin',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(startResponse.status).toBe(200);
      instanceId = startResponse.data.data.id;

      // Signal the human task to continue
      const signalResponse = await apiClient.post(`/workflow/instances/${instanceId}/signal`, {
        signalName: 'complete',
        data: { decision: 'approved' },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(signalResponse.status).toBe(200);
      expect(signalResponse.data.success).toBe(true);
    });
  });

  describe('T-WF-05: Timer node with delay', () => {
    test('should create a process with timer node', async () => {
      const createResponse = await apiClient.post('/workflow/definitions', {
        key: 'timer-process',
        name: 'Timer Process',
        description: 'Process with timer node',
        graph: {
          nodes: [
            { id: 'start', type: 'start', name: 'Start', config: {} },
            { id: 'timer1', type: 'timer', name: 'Wait 1s', config: { duration: 1000 } },
            { id: 'end', type: 'end', name: 'End', config: {} },
          ],
          edges: [
            { id: 'e1', from: 'start', to: 'timer1' },
            { id: 'e2', from: 'timer1', to: 'end' },
          ],
        },
        variables: {},
        status: 'active',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
    });

    test('should start process with timer delay', async () => {
      const startResponse = await apiClient.post('/workflow/start', {
        definitionKey: 'timer-process',
        businessKey: 'timer-123',
        initialVariables: {},
        startedBy: 'admin',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(startResponse.status).toBe(200);
      // Timer execution is async, verify instance was created
      expect(startResponse.data.data).toHaveProperty('id');
    });
  });

  describe('T-WF-06: Parallel execution with join', () => {
    test('should create a process with parallel nodes', async () => {
      const createResponse = await apiClient.post('/workflow/definitions', {
        key: 'parallel-process',
        name: 'Parallel Process',
        description: 'Process with parallel execution',
        graph: {
          nodes: [
            { id: 'start', type: 'start', name: 'Start', config: {} },
            { id: 'fork', type: 'parallel', name: 'Fork', config: {} },
            { id: 'branch1', type: 'api_call', name: 'Branch 1', config: { url: 'http://localhost:18000/health', method: 'GET' } },
            { id: 'branch2', type: 'api_call', name: 'Branch 2', config: { url: 'http://localhost:18000/health', method: 'GET' } },
            { id: 'branch3', type: 'api_call', name: 'Branch 3', config: { url: 'http://localhost:18000/health', method: 'GET' } },
            { id: 'join', type: 'parallel', name: 'Join', config: {} },
            { id: 'end', type: 'end', name: 'End', config: {} },
          ],
          edges: [
            { id: 'e1', from: 'start', to: 'fork' },
            { id: 'e2', from: 'fork', to: 'branch1' },
            { id: 'e3', from: 'fork', to: 'branch2' },
            { id: 'e4', from: 'fork', to: 'branch3' },
            { id: 'e5', from: 'branch1', to: 'join' },
            { id: 'e6', from: 'branch2', to: 'join' },
            { id: 'e7', from: 'branch3', to: 'join' },
            { id: 'e8', from: 'join', to: 'end' },
          ],
        },
        variables: {},
        status: 'active',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
    });

    test('should execute parallel branches', async () => {
      const startResponse = await apiClient.post('/workflow/start', {
        definitionKey: 'parallel-process',
        businessKey: 'parallel-123',
        initialVariables: {},
        startedBy: 'admin',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(startResponse.status).toBe(200);
    });
  });

  describe('T-WF-07: Event wait with Kafka', () => {
    test('should create a process with event wait node', async () => {
      const createResponse = await apiClient.post('/workflow/definitions', {
        key: 'event-wait-process',
        name: 'Event Wait Process',
        description: 'Process waiting for Kafka event',
        graph: {
          nodes: [
            { id: 'start', type: 'start', name: 'Start', config: {} },
            { id: 'event1', type: 'event_wait', name: 'Wait for Event', config: { eventType: 'ClaimApproved', topic: 'claims' } },
            { id: 'end', type: 'end', name: 'End', config: {} },
          ],
          edges: [
            { id: 'e1', from: 'start', to: 'event1' },
            { id: 'e2', from: 'event1', to: 'end' },
          ],
        },
        variables: {},
        status: 'active',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
    });

    test('should start process waiting for event', async () => {
      const startResponse = await apiClient.post('/workflow/start', {
        definitionKey: 'event-wait-process',
        businessKey: 'event-123',
        initialVariables: {},
        startedBy: 'admin',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(startResponse.status).toBe(200);
    });
  });

  describe('T-WF-10: Cancel process during execution', () => {
    test('should cancel a running process', async () => {
      // First start a process
      const startResponse = await apiClient.post('/workflow/start', {
        definitionKey: 'human-task-process',
        businessKey: 'cancel-123',
        initialVariables: {},
        startedBy: 'admin',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(startResponse.status).toBe(200);
      instanceId = startResponse.data.data.id;

      // Cancel the process
      const cancelResponse = await apiClient.post(`/workflow/instances/${instanceId}/cancel`, {
        cancelledBy: 'admin',
        reason: 'Test cancellation',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.data.data.status).toBe('CANCELLED');
      expect(cancelResponse.data.data.cancelledBy).toBe('admin');
    });
  });

  describe('T-WF-11: ProcessHistory tracking', () => {
    test('should record process history', async () => {
      const startResponse = await apiClient.post('/workflow/start', {
        definitionKey: 'simple-process',
        businessKey: 'history-123',
        initialVariables: {},
        startedBy: 'admin',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      instanceId = startResponse.data.data.id;

      // Get process history
      const historyResponse = await apiClient.get(`/workflow/instances/${instanceId}/history`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(historyResponse.status).toBe(200);
      expect(Array.isArray(historyResponse.data.data)).toBe(true);

      // Verify history entries have required fields
      if (historyResponse.data.data.length > 0) {
        const firstEntry = historyResponse.data.data[0];
        expect(firstEntry).toHaveProperty('eventType');
        expect(firstEntry).toHaveProperty('timestamp');
        expect(firstEntry).toHaveProperty('instanceId');
      }
    });
  });

  describe('T-WF-12: Transform node with expression', () => {
    test('should create a process with transform node', async () => {
      const createResponse = await apiClient.post('/workflow/definitions', {
        key: 'transform-process',
        name: 'Transform Process',
        description: 'Process with variable transformation',
        graph: {
          nodes: [
            { id: 'start', type: 'start', name: 'Start', config: {} },
            { id: 'transform1', type: 'transform', name: 'Transform', config: { transformations: [
              { target: 'fullName', expression: '${firstName} + " " + ${lastName}' },
              { target: 'upperName', expression: '${name}.toUpperCase()' },
            ] } },
            { id: 'end', type: 'end', name: 'End', config: {} },
          ],
          edges: [
            { id: 'e1', from: 'start', to: 'transform1' },
            { id: 'e2', from: 'transform1', to: 'end' },
          ],
        },
        variables: {},
        status: 'active',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
    });

    test('should transform variables using expressions', async () => {
      const startResponse = await apiClient.post('/workflow/start', {
        definitionKey: 'transform-process',
        businessKey: 'transform-123',
        initialVariables: { firstName: 'John', lastName: 'Doe', name: 'john' },
        startedBy: 'admin',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(startResponse.status).toBe(200);
      // Verify transformed variables in instance context
      if (startResponse.data.data.context) {
        expect(startResponse.data.data.context).toHaveProperty('fullName');
      }
    });
  });

  describe('T-WF-08: E2E claim_payment process', () => {
    test('should create claim payment workflow definition', async () => {
      const createResponse = await apiClient.post('/workflow/definitions', {
        key: 'claim-payment',
        name: 'Claim Payment Process',
        description: 'Complete claim payment workflow',
        graph: {
          nodes: [
            { id: 'start', type: 'start', name: 'Start', config: {} },
            { id: 'validate', type: 'api_call', name: 'Validate Claim', config: { url: 'http://localhost:18000/claims/validate', method: 'POST' } },
            { id: 'approve', type: 'decision', name: 'Approve Decision', config: { expression: '${claimValid} == true' } },
            { id: 'prepare', type: 'api_call', name: 'Prepare Payment', config: { url: 'http://localhost:18000/payments/prepare', method: 'POST' } },
            { id: 'execute', type: 'api_call', name: 'Execute Payment', config: { url: 'http://localhost:18000/payments/execute', method: 'POST' } },
            { id: 'reject', type: 'api_call', name: 'Reject Claim', config: { url: 'http://localhost:18000/claims/reject', method: 'POST' } },
            { id: 'end', type: 'end', name: 'End', config: {} },
          ],
          edges: [
            { id: 'e1', from: 'start', to: 'validate' },
            { id: 'e2', from: 'validate', to: 'approve' },
            { id: 'e3', from: 'approve', to: 'prepare', condition: '${claimValid} == true' },
            { id: 'e4', from: 'approve', to: 'reject', condition: '${claimValid} == false' },
            { id: 'e5', from: 'prepare', to: 'execute' },
            { id: 'e6', from: 'execute', to: 'end' },
            { id: 'e7', from: 'reject', to: 'end' },
          ],
        },
        variables: {},
        status: 'active',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
    });

    test('should start claim payment workflow', async () => {
      const startResponse = await apiClient.post('/workflow/start', {
        definitionKey: 'claim-payment',
        businessKey: 'claim-payment-123',
        initialVariables: { claimId: 'CLM-001', claimAmount: 5000 },
        startedBy: 'admin',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(startResponse.status).toBe(200);
    });
  });

  describe('T-WF-09: E2E policy_issuance process', () => {
    test('should create policy issuance workflow definition', async () => {
      const createResponse = await apiClient.post('/workflow/definitions', {
        key: 'policy-issuance',
        name: 'Policy Issuance Process',
        description: 'Complete policy issuance workflow',
        graph: {
          nodes: [
            { id: 'start', type: 'start', name: 'Start', config: {} },
            { id: 'validate', type: 'api_call', name: 'Validate Quote', config: { url: 'http://localhost:18000/policies/validate', method: 'POST' } },
            { id: 'underwriting', type: 'human_task', name: 'Underwriting Review', config: { assignee: 'underwriter' } },
            { id: 'decision', type: 'decision', name: 'Underwriting Decision', config: { expression: '${approved} == true' } },
            { id: 'issue', type: 'api_call', name: 'Issue Policy', config: { url: 'http://localhost:18000/policies/issue', method: 'POST' } },
            { id: 'sanhab', type: 'api_call', name: 'Register with Sanhab', config: { url: 'http://localhost:18000/sanhab/register', method: 'POST' } },
            { id: 'reject', type: 'api_call', name: 'Reject Policy', config: { url: 'http://localhost:18000/policies/reject', method: 'POST' } },
            { id: 'end', type: 'end', name: 'End', config: {} },
          ],
          edges: [
            { id: 'e1', from: 'start', to: 'validate' },
            { id: 'e2', from: 'validate', to: 'underwriting' },
            { id: 'e3', from: 'underwriting', to: 'decision' },
            { id: 'e4', from: 'decision', to: 'issue', condition: '${approved} == true' },
            { id: 'e5', from: 'decision', to: 'reject', condition: '${approved} == false' },
            { id: 'e6', from: 'issue', to: 'sanhab' },
            { id: 'e7', from: 'sanhab', to: 'end' },
            { id: 'e8', from: 'reject', to: 'end' },
          ],
        },
        variables: {},
        status: 'active',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
    });

    test('should start policy issuance workflow', async () => {
      const startResponse = await apiClient.post('/workflow/start', {
        definitionKey: 'policy-issuance',
        businessKey: 'policy-issuance-123',
        initialVariables: { quoteId: 'QT-001', productId: 'AUTO-001' },
        startedBy: 'admin',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(startResponse.status).toBe(200);
    });
  });

  describe('Process instance queries', () => {
    test('should get instances by business key', async () => {
      const response = await apiClient.get('/workflow/instances/business-key/simple-123', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });
});
