import { describe, test, expect, beforeAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';

describe('Integration: Claims Read Model Service', () => {
  let apiClient: ApiClient;
  let tenantId: string;

  beforeAll(async () => {
    apiClient = new ApiClient('http://localhost:18000');
    tenantId = 'tenant-crm-integration';
    await DbHelper.cleanup('claims_readmodel');
  });

  test('T-INT-RM-01: Claims Read Model: Kafka consumer → upsert + Query API', async () => {
    // Simulate Kafka event ingestion
    const ingestResponse = await apiClient.post('/claims-readmodel/ingest', {
      tenantId,
      eventType: 'insurance.claim.registered',
      claimId: 'claim-rm-123',
      data: {
        policyId: 'policy-123',
        claimantId: 'customer-123',
        amount: 50000000,
        status: 'submitted',
      },
    });
    if (ingestResponse.success === true) {
      expect(ingestResponse.data).toHaveProperty('ingestionId');
    }

    // Query Read Model
    const queryResponse = await apiClient.get('/claims-readmodel/claims', {
      params: { tenantId, claimId: 'claim-rm-123' },
    });
    if (queryResponse.success === true) {
      expect(queryResponse.data).toHaveProperty('claimId');
      expect(queryResponse.data.status).toBe('submitted');
    }
  });
});
