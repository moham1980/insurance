import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';

describe('Integration: Workflow Service', () => {
  const serviceUrl = process.env.WORKFLOW_SERVICE_URL || 'http://localhost:18028';
  const apiClient = createServiceClient(serviceUrl);
  const tenantId = 'test-tenant';

  beforeAll(async () => {
    await DbHelper.truncateTable('workflow', 'workflow_definitions');
    await DbHelper.truncateTable('workflow', 'workflow_instances');
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('Create workflow definition', async () => {
    const response = await apiClient.post('/workflow/definitions', {
      tenantId,
      name: 'Policy Issuance Flow',
      description: '5-stage policy issuance workflow',
      stages: ['stage1', 'stage2', 'stage3', 'issue'],
      transitions: [
        { from: 'stage1', to: 'stage2', condition: 'documents_submitted' },
        { from: 'stage2', to: 'stage3', condition: 'risk_assessed' },
        { from: 'stage3', to: 'issue', condition: 'underwriting_approved' },
      ],
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('id');
    expect(response.data.name).toBe('Policy Issuance Flow');
    expect(response.data.status).toBe('draft');
  });

  test('Activate workflow definition', async () => {
    const createResponse = await apiClient.post('/workflow/definitions', {
      tenantId,
      name: 'Claims Processing Flow',
      description: 'Claims assessment and approval workflow',
      stages: ['registered', 'assessed', 'approved', 'paid', 'closed'],
      transitions: [
        { from: 'registered', to: 'assessed', condition: 'documents_complete' },
        { from: 'assessed', to: 'approved', condition: 'assessment_positive' },
        { from: 'approved', to: 'paid', condition: 'payment_processed' },
        { from: 'paid', to: 'closed', condition: 'payment_confirmed' },
      ],
    });
    const definitionId = createResponse.data.id;

    const activateResponse = await apiClient.put(`/workflow/definitions/${definitionId}/activate`);
    expect(activateResponse.success).toBe(true);
    expect(activateResponse.data.status).toBe('active');
  });

  test('Start workflow instance', async () => {
    const createResponse = await apiClient.post('/workflow/definitions', {
      tenantId,
      name: 'Test Flow',
      description: 'Test workflow',
      stages: ['start', 'end'],
      transitions: [{ from: 'start', to: 'end', condition: 'always' }],
    });
    const definitionId = createResponse.data.id;

    await apiClient.put(`/workflow/definitions/${definitionId}/activate`);

    const startResponse = await apiClient.post('/workflow/instances', {
      tenantId,
      definitionId,
      businessKey: 'test-business-123',
      context: { testData: 'value' },
    });

    expect(startResponse.success).toBe(true);
    expect(startResponse.data).toHaveProperty('id');
    expect(startResponse.data.currentStage).toBe('start');
  });

  test('Advance workflow instance', async () => {
    const createResponse = await apiClient.post('/workflow/definitions', {
      tenantId,
      name: 'Advance Test Flow',
      description: 'Test workflow for advancing',
      stages: ['step1', 'step2', 'step3'],
      transitions: [
        { from: 'step1', to: 'step2', condition: 'ready' },
        { from: 'step2', to: 'step3', condition: 'complete' },
      ],
    });
    const definitionId = createResponse.data.id;

    await apiClient.put(`/workflow/definitions/${definitionId}/activate`);

    const startResponse = await apiClient.post('/workflow/instances', {
      tenantId,
      definitionId,
      businessKey: 'advance-test-123',
    });
    const instanceId = startResponse.data.id;

    const advanceResponse = await apiClient.put(`/workflow/instances/${instanceId}/advance`, {
      toStage: 'step2',
      reason: 'Ready to advance',
    });

    expect(advanceResponse.success).toBe(true);
    expect(advanceResponse.data.currentStage).toBe('step2');
  });

  test('List workflow definitions', async () => {
    const listResponse = await apiClient.get('/workflow/definitions', {
      params: { tenantId },
    });

    expect(listResponse.success).toBe(true);
    expect(Array.isArray(listResponse.data)).toBe(true);
  });

  test('List workflow instances', async () => {
    const listResponse = await apiClient.get('/workflow/instances', {
      params: { tenantId },
    });

    expect(listResponse.success).toBe(true);
    expect(Array.isArray(listResponse.data)).toBe(true);
  });
});
