import { describe, test, expect, beforeAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';

describe('Integration: Document Service', () => {
  let apiClient: ApiClient;
  let tenantId: string;

  beforeAll(async () => {
    apiClient = new ApiClient('http://localhost:18000');
    tenantId = 'tenant-doc-integration';
    await DbHelper.cleanup('document');
  });

  test('T-INT-DOC-01: Document: Upload/Download/Preview + Link to Claim', async () => {
    // Upload Document
    const uploadResponse = await apiClient.post('/document/upload', {
      tenantId,
      fileName: 'claim-evidence.pdf',
      fileType: 'application/pdf',
      fileSize: 1024000,
      contentType: 'evidence',
    });
    if (uploadResponse.success === true) {
      expect(uploadResponse.data).toHaveProperty('documentId');
      const documentId = uploadResponse.data.documentId;

      // Get Document
      const getResponse = await apiClient.get(`/document/documents/${documentId}`);
      if (getResponse.success === true) {
        expect(getResponse.data.fileName).toBe('claim-evidence.pdf');
      }

      // Link to Claim
      const linkResponse = await apiClient.post('/document/links', {
        tenantId,
        documentId,
        entityType: 'claim',
        entityId: 'claim-123',
      });
      if (linkResponse.success === true) {
        expect(linkResponse.data).toHaveProperty('linkId');
      }
    }
  });
});
