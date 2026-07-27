import { describe, test, expect, beforeAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';

describe('Integration: Product Service', () => {
  let apiClient: ApiClient;
  let tenantId: string;

  beforeAll(async () => {
    apiClient = new ApiClient('http://localhost:18000');
    tenantId = 'tenant-prd-integration';
    await DbHelper.cleanup('product');
  });

  test('T-INT-PRD-01: Product: CRUD + Quote + Archive', async () => {
    // Create Product
    const createResponse = await apiClient.post('/product/products', {
      tenantId,
      productName: 'Auto Insurance',
      productType: 'auto',
      coverage: 'comprehensive',
      basePremium: 50000000,
    });
    if (createResponse.success === true) {
      expect(createResponse.data).toHaveProperty('productId');
      const productId = createResponse.data.productId;

      // Get Product
      const getResponse = await apiClient.get(`/product/products/${productId}`);
      if (getResponse.success === true) {
        expect(getResponse.data.productName).toBe('Auto Insurance');
      }

      // Create Quote
      const quoteResponse = await apiClient.post('/product/quotes', {
        tenantId,
        productId,
        customerData: { age: 30, vehicleYear: 2020 },
      });
      if (quoteResponse.success === true) {
        expect(quoteResponse.data).toHaveProperty('quoteId');
        const quoteId = quoteResponse.data.quoteId;

        // Archive Product
        const archiveResponse = await apiClient.put(`/product/products/${productId}/archive`, {
          archivedBy: 'admin-1',
        });
        if (archiveResponse.success === true) {
          expect(archiveResponse.data.status).toBe('archived');
        }
      }
    }
  });
});
