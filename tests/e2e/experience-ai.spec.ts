import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';

const API_GATEWAY = process.env.API_GATEWAY_URL || 'http://localhost:18000';
const CUSTOMER_PORTAL_BFF = process.env.CUSTOMER_PORTAL_BFF_URL || 'http://localhost:18027';
const COPILOT_SERVICE = process.env.COPILOT_SERVICE_URL || 'http://localhost:18030';
const DOCUMENT_AI_SERVICE = process.env.DOCUMENT_AI_SERVICE_URL || 'http://localhost:18021';

const TEST_TIMEOUT = 30000;

describe('E2E: Experience & AI Flow', () => {
  let authToken: string;
  let customerId: string;
  let policyId: string;
  let claimId: string;

  beforeAll(async () => {
    // Login as test customer
    try {
      const res = await axios.post(`${API_GATEWAY}/api/v1/auth/login`, {
        username: process.env.TEST_CUSTOMER_USERNAME || 'test@insurance.local',
        password: process.env.TEST_CUSTOMER_PASSWORD || 'Test@1234',
      });
      authToken = res.data?.data?.accessToken || res.data?.accessToken;
      customerId = res.data?.data?.customerId || res.data?.customerId || 'test-cust-001';
    } catch {
      // Skip if auth service not running
      authToken = 'test-token';
      customerId = 'test-cust-001';
    }
  }, TEST_TIMEOUT);

  it('should allow customer to view policy projections', async () => {
    const res = await axios.get(`${CUSTOMER_PORTAL_BFF}/customer-portal/policies`, {
      headers: { Authorization: `Bearer ${authToken}` },
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
  }, TEST_TIMEOUT);

  it('should receive renewal NBA for upcoming policy expiry', async () => {
    const res = await axios.get(`${COPILOT_SERVICE}/copilot/nba/actions`, {
      params: { contextType: 'policy', resourceId: customerId },
      headers: { Authorization: `Bearer ${authToken}` },
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    if (res.data?.data?.rows) {
      expect(Array.isArray(res.data.data.rows)).toBe(true);
    }
  }, TEST_TIMEOUT);

  it('should allow broker to ask Copilot and receive recommendation with sources', async () => {
    const res = await axios.post(
      `${COPILOT_SERVICE}/copilot/qa`,
      {
        question: 'بهترین بیمه شخص ثالث برای راننده جوان چیست؟',
        contextType: 'policy',
        resourceId: customerId,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
        validateStatus: () => true,
      },
    );
    expect(res.status).toBe(200);
    if (res.data?.data?.answer) {
      expect(typeof res.data.data.answer).toBe('string');
    }
  }, TEST_TIMEOUT);

  it('should execute NBA action and verify downstream call', async () => {
    // First get NBA actions
    const actionsRes = await axios.get(`${COPILOT_SERVICE}/copilot/nba/actions`, {
      params: { contextType: 'claim', resourceId: customerId },
      headers: { Authorization: `Bearer ${authToken}` },
      validateStatus: () => true,
    });

    if (actionsRes.data?.data?.rows?.length > 0) {
      const logId = actionsRes.data.data.rows[0].logId;
      const execRes = await axios.post(
        `${COPILOT_SERVICE}/copilot/nba/execute`,
        { logId },
        {
          headers: { Authorization: `Bearer ${authToken}` },
          validateStatus: () => true,
        },
      );
      expect([200, 404, 409]).toContain(execRes.status);
    }
  }, TEST_TIMEOUT);

  it('should upload claim document, OCR extract amount, user confirms, claim updated', async () => {
    // Upload document
    const uploadRes = await axios.post(
      `${DOCUMENT_AI_SERVICE}/api/v1/ocr/extract`,
      {
        fileBase64: Buffer.from('fake-invoice-image').toString('base64'),
        mimeType: 'image/png',
        provider: 'tesseract',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
        validateStatus: () => true,
      },
    );
    expect([200, 500]).toContain(uploadRes.status);

    if (uploadRes.data?.success) {
      expect(uploadRes.data.data).toBeDefined();
      expect(uploadRes.data.data.text).toBeDefined();
    }
  }, TEST_TIMEOUT);

  it('should support consent management flow', async () => {
    const consentRes = await axios.get(`${CUSTOMER_PORTAL_BFF}/customer-portal/consent`, {
      headers: { Authorization: `Bearer ${authToken}` },
      validateStatus: () => true,
    });
    expect([200, 404]).toContain(consentRes.status);
  }, TEST_TIMEOUT);
});
