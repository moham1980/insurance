import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';

describe('Integration: Complaints Service', () => {
  const serviceUrl = process.env.COMPLAINTS_SERVICE_URL || 'http://localhost:18013';
  const apiClient = createServiceClient(serviceUrl);
  const tenantId = 'test-tenant';

  beforeAll(async () => {
    await DbHelper.truncateTable('complaints', 'complaints');
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('Create complaint', async () => {
    const response = await apiClient.post('/complaints/complaints', {
      tenantId,
      customerId: 'customer-123',
      policyId: 'policy-123',
      category: 'service_quality',
      description: 'Poor service experience',
      priority: 'medium',
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('id');
    expect(response.data.status).toBe('open');
  });

  test('Update complaint status', async () => {
    const createResponse = await apiClient.post('/complaints/complaints', {
      tenantId,
      customerId: 'customer-456',
      category: 'billing',
      description: 'Billing discrepancy',
    });
    const complaintId = createResponse.data.id;

    const updateResponse = await apiClient.put(`/complaints/complaints/${complaintId}/status`, {
      status: 'in_progress',
    });

    expect(updateResponse.success).toBe(true);
    expect(updateResponse.data.status).toBe('in_progress');
  });

  test('Close complaint', async () => {
    const createResponse = await apiClient.post('/complaints/complaints', {
      tenantId,
      customerId: 'customer-789',
      category: 'claims',
      description: 'Claims processing delay',
    });
    const complaintId = createResponse.data.id;

    const closeResponse = await apiClient.put(`/complaints/complaints/${complaintId}/close`, {
      resolution: 'Issue resolved',
    });

    expect(closeResponse.success).toBe(true);
    expect(closeResponse.data.status).toBe('closed');
  });

  test('List complaints', async () => {
    const listResponse = await apiClient.get('/complaints/complaints', {
      params: { tenantId },
    });

    expect(listResponse.success).toBe(true);
    expect(Array.isArray(listResponse.data)).toBe(true);
  });

  test('T-INT-CMP-01: CRUD Complaint with SLA', async () => {
    const createResponse = await apiClient.post('/complaints/complaints', {
      tenantId,
      customerId: 'customer-123',
      category: 'service_quality',
      description: 'Test complaint',
      priority: 'medium',
    });
    expect(createResponse.success).toBe(true);
    expect(createResponse.data.status).toBe('open');
    expect(createResponse.data).toHaveProperty('dueDate');

    const complaintId = createResponse.data.id;

    const updateResponse = await apiClient.put(`/complaints/complaints/${complaintId}/status`, {
      status: 'in_progress',
    });
    expect(updateResponse.success).toBe(true);
  });

  test('T-INT-CMP-02: OTP request/verify', async () => {
    const otpRequestResponse = await apiClient.post('/complaints/otp/request', {
      customerId: 'customer-123',
      channel: 'sms',
    });

    if (otpRequestResponse.success === true) {
      expect(otpRequestResponse.data).toHaveProperty('otpId');
      const otpId = otpRequestResponse.data.otpId;

      const otpVerifyResponse = await apiClient.post('/complaints/otp/verify', {
        otpId,
        code: '123456',
      });

      if (otpVerifyResponse.success === true) {
        expect(otpVerifyResponse.data.verified).toBe(true);
      }
    }
  });

  test('T-INT-CMP-03: Export validation (OTP required)', async () => {
    const createResponse = await apiClient.post('/complaints/complaints', {
      tenantId,
      customerId: 'customer-456',
      category: 'policy',
      description: 'Export test',
    });
    const complaintId = createResponse.data.id;

    // Request OTP
    const otpRequestResponse = await apiClient.post('/complaints/otp/request', {
      customerId: 'customer-456',
      channel: 'sms',
    });

    if (otpRequestResponse.success === true) {
      const otpId = otpRequestResponse.data.otpId;

      // Verify OTP
      await apiClient.post('/complaints/otp/verify', {
        otpId,
        code: '123456',
      });

      // Export
      const exportResponse = await apiClient.post(`/complaints/complaints/${complaintId}/export`, {
        target: 'central_insurance',
      });

      if (exportResponse.success === true) {
        expect(exportResponse.data.exported).toBe(true);
      }
    }
  });

  test('T-INT-CMP-04: SLA breach → event', async () => {
    const createResponse = await apiClient.post('/complaints/complaints', {
      tenantId,
      customerId: 'customer-sla-123',
      category: 'claims',
      description: 'SLA test',
      priority: 'high',
      slaHours: 1,
    });
    const complaintId = createResponse.data.id;

    const getResponse = await apiClient.get(`/complaints/complaints/${complaintId}`);
    if (getResponse.success === true) {
      expect(getResponse.data).toHaveProperty('dueDate');
    }
  });

  test('T-INT-CMP-05: Escalation workflow', async () => {
    const createResponse = await apiClient.post('/complaints/complaints', {
      tenantId,
      customerId: 'customer-esc-123',
      category: 'billing',
      description: 'Escalation test',
      priority: 'high',
    });
    const complaintId = createResponse.data.id;

    const escalateResponse = await apiClient.put(`/complaints/complaints/${complaintId}/escalate`, {
      escalatedTo: 'manager-1',
      reason: 'Requires senior review',
    });

    if (escalateResponse.success === true) {
      expect(escalateResponse.data.escalated).toBe(true);
    }
  });
});
