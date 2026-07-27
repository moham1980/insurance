import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';

describe('Integration: Agent Portal Service', () => {
  const serviceUrl = process.env.AGENT_PORTAL_URL || 'http://localhost:18031';
  const apiClient = createServiceClient(serviceUrl);
  const tenantId = 'test-tenant';
  const agentId = 'agent-123';

  beforeAll(async () => {
    await DbHelper.truncateTable('agent_portal', 'agent_sessions');
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('Create agent session', async () => {
    const response = await apiClient.post('/agent-portal/session', {
      tenantId,
      agentId,
      jwtToken: 'test-jwt-token-123',
      expiresIn: '8h',
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('id');
    expect(response.data.agentId).toBe(agentId);
    expect(response.data.status).toBe('active');
  });

  test('Validate agent session', async () => {
    const createResponse = await apiClient.post('/agent-portal/session', {
      tenantId,
      agentId,
      jwtToken: 'test-jwt-token-456',
      expiresIn: '8h',
    });
    const sessionId = createResponse.data.id;

    const validateResponse = await apiClient.post('/agent-portal/session/validate', {
      sessionId,
      jwtToken: 'test-jwt-token-456',
    });

    expect(validateResponse.success).toBe(true);
    expect(validateResponse.data.valid).toBe(true);
  });

  test('Revoke agent session', async () => {
    const createResponse = await apiClient.post('/agent-portal/session', {
      tenantId,
      agentId,
      jwtToken: 'test-jwt-token-789',
      expiresIn: '8h',
    });
    const sessionId = createResponse.data.id;

    const revokeResponse = await apiClient.delete(`/agent-portal/session/${sessionId}`);
    expect(revokeResponse.success).toBe(true);
    expect(revokeResponse.data.revoked).toBe(true);
  });

  test('Revoke all agent sessions', async () => {
    // Create multiple sessions
    await apiClient.post('/agent-portal/session', {
      tenantId,
      agentId,
      jwtToken: 'test-jwt-token-111',
      expiresIn: '8h',
    });

    await apiClient.post('/agent-portal/session', {
      tenantId,
      agentId,
      jwtToken: 'test-jwt-token-222',
      expiresIn: '8h',
    });

    const revokeAllResponse = await apiClient.delete('/agent-portal/sessions', {
      params: { agentId },
    });

    expect(revokeAllResponse.success).toBe(true);
    expect(revokeAllResponse.data.revokedCount).toBeGreaterThanOrEqual(2);
  });
});
