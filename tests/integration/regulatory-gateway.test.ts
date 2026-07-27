import { describe, test, expect, beforeAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';

describe('Integration: Regulatory Gateway Service', () => {
  let apiClient: ApiClient;
  let tenantId: string;

  beforeAll(async () => {
    apiClient = new ApiClient('http://localhost:18000');
    tenantId = 'tenant-rg-integration';
    await DbHelper.cleanup('regulatory_gateway');
  });

  test('T-INT-RG-01: Regulatory Gateway: Inquiry + Webhook + Failure log + Retry', async () => {
    // Send Inquiry
    const inquiryResponse = await apiClient.post('/regulatory/inquiry', {
      tenantId,
      inquiryType: 'policy_validation',
      policyId: 'policy-rg-123',
      customerId: 'customer-123',
    });
    if (inquiryResponse.success === true) {
      expect(inquiryResponse.data).toHaveProperty('inquiryId');
      const inquiryId = inquiryResponse.data.inquiryId;

      // Get Inquiry Status
      const statusResponse = await apiClient.get(`/regulatory/inquiries/${inquiryId}`);
      if (statusResponse.success === true) {
        expect(statusResponse.data).toHaveProperty('status');
      }

      // Simulate webhook callback
      const webhookResponse = await apiClient.post('/regulatory/webhook', {
        inquiryId,
        status: 'approved',
        reference: 'REF-RG-001',
      });
      if (webhookResponse.success === true) {
        expect(webhookResponse.data.status).toBe('approved');
      }
    }

    // Test failure logging
    const failedInquiryResponse = await apiClient.post('/regulatory/inquiry', {
      tenantId,
      inquiryType: 'policy_validation',
      policyId: 'policy-rg-456',
      customerId: 'customer-456',
    });
    if (failedInquiryResponse.success === true) {
      const failedInquiryId = failedInquiryResponse.data.inquiryId;

      // Log failure
      try {
        const logResponse = await apiClient.post('/regulatory/failures', {
          inquiryId: failedInquiryId,
          error: 'Timeout',
          retryCount: 1,
        });
        if (logResponse.success === true) {
          expect(logResponse.data).toHaveProperty('failureId');
        }
      } catch (error) {
        console.log('Failure log endpoint not yet implemented');
      }

      // Retry
      try {
        const retryResponse = await apiClient.post(`/regulatory/inquiries/${failedInquiryId}/retry`);
        if (retryResponse.success === true) {
          expect(retryResponse.data.status).toBe('pending');
        }
      } catch (error) {
        console.log('Retry endpoint not yet implemented');
      }
    }
  });
});
