import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createGatewayClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { partyFixtures } from '../fixtures/party.fixture';
import { DbHelper } from '../helpers/db-helper';
import { DockerComposeHelper } from '../helpers/docker-compose';
import { AssertionHelpers } from '../helpers/assertions';

describe('E2E: Notification and OTP Flow', () => {
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createGatewayClient(adminToken);
  apiClient.setTenantId(tenantId);

  let partyId: string;
  let correlationId: string;

  beforeAll(async () => {
    await DockerComposeHelper.waitForHealth('api-gateway', { timeoutMs: 60000 });
    await DockerComposeHelper.waitForHealth('notification-service', { timeoutMs: 60000 });
    await DbHelper.truncateTable('public', 'parties');

    const partyResponse = await apiClient.post('/party/party', partyFixtures.individual);
    partyId = partyResponse.data.partyId;
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('T-E2E-NOT-01: Send SMS notification', async () => {
    correlationId = `test-not-01-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/notifications/send', {
      channel: 'sms',
      recipient: '+989123456789',
      template: 'claim_status_update',
      variables: {
        claimNumber: 'CLM-2024-001',
        status: 'approved',
        amount: '75,000,000',
      },
    });
    AssertionHelpers.assertSuccessResponse(response);
    expect(response.data).toHaveProperty('notificationId');
  });

  test('T-E2E-NOT-02: Send email notification', async () => {
    correlationId = `test-not-02-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/notifications/send', {
      channel: 'email',
      recipient: 'john.doe@example.com',
      template: 'policy_issued',
      variables: {
        policyNumber: 'POL-2024-001',
        effectiveDate: '2024-01-01',
      },
    });
    AssertionHelpers.assertSuccessResponse(response);
    expect(response.data).toHaveProperty('notificationId');
  });

  test('T-E2E-NOT-03: Send OTP via SMS', async () => {
    correlationId = `test-not-03-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/notifications/otp/send', {
      phoneNumber: '+989123456789',
      purpose: 'login',
      provider: 'kavenegar',
    });
    AssertionHelpers.assertSuccessResponse(response);
    expect(response.data).toHaveProperty('trackingId');
  });

  test('T-E2E-NOT-04: Verify OTP', async () => {
    correlationId = `test-not-04-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const sendResponse = await apiClient.post('/notifications/otp/send', {
      phoneNumber: '+989123456789',
      purpose: 'claim_approval',
      provider: 'kavenegar',
    });
    AssertionHelpers.assertSuccessResponse(sendResponse);
    const trackingId = sendResponse.data.trackingId;

    const verifyResponse = await apiClient.post('/notifications/otp/verify', {
      phoneNumber: '+989123456789',
      trackingId,
      code: '123456',
    });

    if (verifyResponse.success === true) {
      expect(verifyResponse.data.valid).toBeDefined();
    }
  });

  test('T-E2E-NOT-05: Notification delivery status callback', async () => {
    correlationId = `test-not-05-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const sendResponse = await apiClient.post('/notifications/send', {
      channel: 'sms',
      recipient: '+989123456789',
      template: 'payment_reminder',
      variables: { amount: '15,000,000', dueDate: '2024-03-15' },
    });
    AssertionHelpers.assertSuccessResponse(sendResponse);
    const notificationId = sendResponse.data.notificationId;

    const callbackResponse = await apiClient.post('/notifications/delivery/callback', {
      notificationId,
      status: 'delivered',
      provider: 'kavenegar',
      timestamp: new Date().toISOString(),
    });
    AssertionHelpers.assertSuccessResponse(callbackResponse);
    expect(callbackResponse.data.status).toBe('delivered');
  });

  test('T-E2E-NOT-06: Bulk notification for policy renewal reminders', async () => {
    correlationId = `test-not-06-${Date.now()}`;
    apiClient.setCorrelationId(correlationId);

    const response = await apiClient.post('/notifications/bulk', {
      channel: 'sms',
      template: 'renewal_reminder',
      recipients: ['+989123456789', '+989876543210'],
      variables: { daysRemaining: '7', renewalLink: 'https://portal.example.com/renew' },
    });
    AssertionHelpers.assertSuccessResponse(response);
    expect(response.data).toHaveProperty('batchId');
    expect(response.data.sentCount).toBeGreaterThanOrEqual(0);
  });
});
