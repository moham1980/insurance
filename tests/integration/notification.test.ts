import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';

describe('Integration: Notification Service', () => {
  const serviceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:18037';
  const apiClient = createServiceClient(serviceUrl);
  const tenantId = 'test-tenant';

  beforeAll(async () => {
    await DbHelper.truncateTable('notifications', 'notifications');
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('Send SMS notification', async () => {
    const response = await apiClient.post('/notifications/send', {
      tenantId,
      type: 'sms',
      recipient: '+989123456789',
      template: 'claim_status_update',
      data: {
        claimId: 'CLM-123',
        status: 'approved',
      },
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('id');
    expect(response.data.type).toBe('sms');
  });

  test('Send email notification', async () => {
    const response = await apiClient.post('/notifications/send', {
      tenantId,
      type: 'email',
      recipient: 'customer@example.com',
      template: 'policy_issued',
      data: {
        policyNumber: 'POL-123',
        amount: 15000000,
      },
    });

    expect(response.success).toBe(true);
    expect(response.data.type).toBe('email');
  });

  test('Get notification by ID', async () => {
    const createResponse = await apiClient.post('/notifications/send', {
      tenantId,
      type: 'sms',
      recipient: '+989876543210',
      template: 'payment_reminder',
    });
    const notificationId = createResponse.data.id;

    const getResponse = await apiClient.get(`/notifications/${notificationId}`);
    expect(getResponse.success).toBe(true);
    expect(getResponse.data.id).toBe(notificationId);
  });

  test('List notifications', async () => {
    const listResponse = await apiClient.get('/notifications', {
      params: { tenantId },
    });

    expect(listResponse.success).toBe(true);
    expect(Array.isArray(listResponse.data)).toBe(true);
  });
});
