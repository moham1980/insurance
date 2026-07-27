import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';
import { JwtFactory } from '../helpers/jwt-factory';
import { partyFixtures } from '../fixtures/party.fixture';

describe('Integration: Party/KYC Service', () => {
  const serviceUrl = process.env.PARTY_KYC_URL || 'http://localhost:18006';
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createServiceClient(serviceUrl, adminToken);

  beforeAll(async () => {
    await DbHelper.truncateTable('party', 'parties');
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('Create individual party', async () => {
    const response = await apiClient.post('/party', partyFixtures.individual);
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('partyId');
    expect(response.data.type).toBe('individual');
    expect(response.data.fullName).toBe('John Doe');
  });

  test('Create legal party', async () => {
    const response = await apiClient.post('/party', {
      ...partyFixtures.legal,
      fullName: 'Test Company Ltd',
    });
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('partyId');
    expect(response.data.type).toBe('legal');
    expect(response.data.fullName).toBe('Test Company Ltd');
  });

  test('Get party by ID', async () => {
    const createResponse = await apiClient.post('/party', {
      ...partyFixtures.individual,
      nationalId: '5555555555',
    });
    const partyId = createResponse.data.partyId;

    const getResponse = await apiClient.get(`/party/${partyId}`);
    expect(getResponse.success).toBe(true);
    expect(getResponse.data.party.partyId).toBe(partyId);
  });

  test('List parties includes created party', async () => {
    const createResponse = await apiClient.post('/party', {
      ...partyFixtures.individual,
      nationalId: '6666666666',
    });
    const partyId = createResponse.data.partyId;

    const listResponse = await apiClient.get('/party', {
      params: { nationalId: '6666666666' },
    });

    expect(listResponse.success).toBe(true);
    expect(Array.isArray(listResponse.data)).toBe(true);
    expect(listResponse.data.some((p: any) => p.partyId === partyId)).toBe(true);
  });

  test('Search parties by national ID via list endpoint', async () => {
    const searchResponse = await apiClient.get('/party', {
      params: { nationalId: '1234567890' },
    });

    expect(searchResponse.success).toBe(true);
    expect(Array.isArray(searchResponse.data)).toBe(true);
  });
});
