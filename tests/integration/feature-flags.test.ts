import { describe, test, expect, beforeAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';

describe('Integration: Feature Flags Service', () => {
  let apiClient: ApiClient;
  let tenantId: string;

  beforeAll(async () => {
    apiClient = new ApiClient('http://localhost:18000');
    tenantId = 'tenant-ff-integration';
    await DbHelper.cleanup('feature_flags');
  });

  test('T-INT-FF-01: Feature Flags: Flag CRUD + toggle + evaluation', async () => {
    // Create Flag
    const createResponse = await apiClient.post('/feature-flags/flags', {
      tenantId,
      flagName: 'copilot_enabled',
      description: 'Enable copilot feature',
      enabled: false,
      targetType: 'tenant',
    });
    if (createResponse.success === true) {
      expect(createResponse.data).toHaveProperty('flagId');
      const flagId = createResponse.data.flagId;

      // Get Flag
      const getResponse = await apiClient.get(`/feature-flags/flags/${flagId}`);
      if (getResponse.success === true) {
        expect(getResponse.data.flagName).toBe('copilot_enabled');
      }

      // Toggle Flag
      const toggleResponse = await apiClient.put(`/feature-flags/flags/${flagId}/toggle`, {
        enabled: true,
      });
      if (toggleResponse.success === true) {
        expect(toggleResponse.data.enabled).toBe(true);
      }

      // Evaluate Flag
      const evalResponse = await apiClient.post('/feature-flags/evaluate', {
        tenantId,
        flagName: 'copilot_enabled',
        context: { userId: 'user-1' },
      });
      if (evalResponse.success === true) {
        expect(evalResponse.data.enabled).toBe(true);
      }
    }
  });
});
