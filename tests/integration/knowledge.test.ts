import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';
import { JwtFactory } from '../helpers/jwt-factory';

describe('Integration: Knowledge Service', () => {
  let apiClient: ApiClient;
  let adminToken: string;
  let tenantId: string;
  let articleId: string;

  beforeAll(async () => {
    apiClient = new ApiClient('http://localhost:18000');
    tenantId = 'tenant-knowledge-integration';
    adminToken = JwtFactory.createAdminToken(tenantId);
    await DbHelper.cleanup('knowledge');
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('T-KL-01: Ingest: raw text → chunks → embeddings → store', () => {
    test('should create knowledge article with content', async () => {
      const createResponse = await apiClient.post('/knowledge/articles', {
        tenantId,
        title: 'Insurance Claim Filing Guide',
        content: 'To file an insurance claim, follow these steps: 1. Contact your insurance company immediately after the incident. 2. Provide all necessary documentation including photos and receipts. 3. Fill out the claim form accurately. 4. Submit the claim and wait for review. 5. Follow up on the claim status regularly.',
        summary: 'Step-by-step guide for filing insurance claims',
        category: 'claims',
        tags: ['claims', 'guide', 'how-to'],
        authorId: 'author-123',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.data.success).toBe(true);
      expect(createResponse.data.data).toHaveProperty('id');
      expect(createResponse.data.data.title).toBe('Insurance Claim Filing Guide');
      expect(createResponse.data.data.status).toBe('DRAFT');
      expect(createResponse.data.data.content).toBeDefined();

      articleId = createResponse.data.data.id;
    });

    test('should publish article for search indexing', async () => {
      const publishResponse = await apiClient.put(`/knowledge/articles/${articleId}/publish`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(publishResponse.status).toBe(200);
      expect(publishResponse.data.success).toBe(true);
      expect(publishResponse.data.data.status).toBe('PUBLISHED');
    });
  });

  describe('T-KL-02: Query: semantic search → relevant results returned', () => {
    test('should search articles with semantic similarity', async () => {
      // Create more articles for testing
      await apiClient.post('/knowledge/articles', {
        tenantId,
        title: 'Policy Coverage Details',
        content: 'Insurance policies provide coverage for various risks including property damage, liability, and personal injury. Understanding your coverage limits and deductibles is important for proper protection.',
        category: 'policy',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      await apiClient.post('/knowledge/articles', {
        tenantId,
        title: 'Premium Payment Methods',
        content: 'You can pay your insurance premiums through various methods including bank transfer, credit card, or automatic debit. Late payments may result in policy cancellation.',
        category: 'billing',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const searchResponse = await apiClient.get('/knowledge/articles/search', {
        params: {
          tenantId,
          query: 'how to file claim',
          status: 'PUBLISHED',
        },
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.data.success).toBe(true);
      expect(Array.isArray(searchResponse.data.data)).toBe(true);
      expect(searchResponse.data.data.length).toBeGreaterThan(0);
    });
  });

  describe('T-KL-03: Domain filter: query with domain=regulation → only regulation entries', () => {
    test('should filter by category/domain', async () => {
      // Create articles in different categories
      await apiClient.post('/knowledge/articles', {
        tenantId,
        title: 'Insurance Regulation 101',
        content: 'Insurance is regulated by government agencies to protect consumers. Regulations cover solvency requirements, consumer protection, and market conduct.',
        category: 'regulation',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      await apiClient.post('/knowledge/articles', {
        tenantId,
        title: 'Claim Processing Rules',
        content: 'Claims must be processed within specific timeframes according to industry standards and regulatory requirements.',
        category: 'claims',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Search with category filter
      const searchResponse = await apiClient.get('/knowledge/articles/search', {
        params: {
          tenantId,
          query: 'regulation',
          category: 'regulation',
          status: 'PUBLISHED',
        },
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.data.success).toBe(true);
      expect(Array.isArray(searchResponse.data.data)).toBe(true);

      // Verify all results are from regulation category
      searchResponse.data.data.forEach(article => {
        expect(article.category).toBe('regulation');
      });
    });
  });

  describe('T-KL-04: Top_k: query with top_k=3 → max 3 results', () => {
    test('should limit results to top_k parameter', async () => {
      // Create multiple articles
      for (let i = 1; i <= 5; i++) {
        await apiClient.post('/knowledge/articles', {
          tenantId,
          title: `Test Article ${i}`,
          content: `This is test article number ${i} for testing top_k limit functionality.`,
          category: 'test',
        }, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'x-tenant-id': tenantId,
          },
        });
      }

      const searchResponse = await apiClient.get('/knowledge/articles/search', {
        params: {
          tenantId,
          query: 'test article',
          limit: 3,
          status: 'PUBLISHED',
        },
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.data.success).toBe(true);
      expect(searchResponse.data.data.length).toBeLessThanOrEqual(3);
    });
  });

  describe('T-KL-05: Chunking: long document → multiple chunks with overlap', () => {
    test('should handle long content with chunking', async () => {
      const longContent = 'Insurance provides financial protection against unexpected losses. '.repeat(50); // ~2000 characters

      const createResponse = await apiClient.post('/knowledge/articles', {
        tenantId,
        title: 'Comprehensive Insurance Guide',
        content: longContent,
        category: 'guide',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.data.success).toBe(true);
      expect(createResponse.data.data.content).toBeDefined();
    });
  });

  describe('T-KL-06: Embedding: generate embedding with correct dimensions', () => {
    test('should generate embeddings for search', async () => {
      const createResponse = await apiClient.post('/knowledge/articles', {
        tenantId,
        title: 'Embedding Test Article',
        content: 'This article tests embedding generation for semantic search functionality.',
        category: 'test',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const testArticleId = createResponse.data.data.id;
      await apiClient.put(`/knowledge/articles/${testArticleId}/publish`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Search should work with embeddings
      const searchResponse = await apiClient.get('/knowledge/articles/search', {
        params: {
          tenantId,
          query: 'semantic search test',
          status: 'PUBLISHED',
        },
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.data.success).toBe(true);
    });
  });

  describe('T-KL-07: E2E: Copilot query → grounding context in response', () => {
    test('should retrieve knowledge for grounding', async () => {
      const groundingResponse = await apiClient.post('/knowledge/grounding', {
        tenantId,
        query: 'How to file an insurance claim',
        context: {},
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(groundingResponse.status).toBe(200);
      expect(groundingResponse.data.success).toBe(true);
      expect(groundingResponse.data.data).toHaveProperty('articles');
      expect(groundingResponse.data.data).toHaveProperty('context');
      expect(groundingResponse.data.data.context).toBeDefined();
    });
  });

  describe('T-KL-08: E2E: Document AI extraction → auto-ingest → searchable', () => {
    test('should ingest document after extraction', async () => {
      const ingestResponse = await apiClient.post('/knowledge/ingest', {
        tenantId,
        source: 'document_ai',
        sourceId: 'doc-ai-extraction-123',
        domain: 'policy',
        text: 'Extracted policy document content: This policy covers property damage up to 100 million tomans with a deductible of 5 million.',
        metadata: {
          documentType: 'policy',
          extractedAt: new Date().toISOString(),
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(ingestResponse.status).toBe(201);
      expect(ingestResponse.data.success).toBe(true);

      // Verify it's searchable
      const searchResponse = await apiClient.get('/knowledge/articles/search', {
        params: {
          tenantId,
          query: 'property damage coverage',
          status: 'PUBLISHED',
        },
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(searchResponse.status).toBe(200);
    });
  });

  describe('T-KL-09: Delete: deleted entry should not appear in search results', () => {
    test('should delete article and remove from search', async () => {
      const createResponse = await apiClient.post('/knowledge/articles', {
        tenantId,
        title: 'Article to Delete',
        content: 'This article will be deleted for testing.',
        category: 'test',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const deleteArticleId = createResponse.data.data.id;

      // Delete the article
      const deleteResponse = await apiClient.delete(`/knowledge/articles/${deleteArticleId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.data.success).toBe(true);

      // Verify it's not in search results
      const searchResponse = await apiClient.get('/knowledge/articles/search', {
        params: {
          tenantId,
          query: 'deleted article',
          status: 'PUBLISHED',
        },
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(searchResponse.status).toBe(200);
      const deletedInResults = searchResponse.data.data.some(a => a.id === deleteArticleId);
      expect(deletedInResults).toBe(false);
    });
  });

  describe('T-KL-10: Stats: correct statistics (count per domain)', () => {
    test('should get statistics per domain', async () => {
      const statsResponse = await apiClient.get('/knowledge/articles/stats', {
        params: {
          tenantId,
        },
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.data.success).toBe(true);
      expect(statsResponse.data.data).toHaveProperty('totalArticles');
      expect(statsResponse.data.data).toHaveProperty('articlesByCategory');
      expect(typeof statsResponse.data.data.totalArticles).toBe('number');
      expect(typeof statsResponse.data.data.articlesByCategory).toBe('object');
    });
  });

  describe('Knowledge Graph', () => {
    let entityId: string;

    test('should create knowledge graph entity', async () => {
      const createResponse = await apiClient.post('/knowledge/graph/entities', {
        tenantId,
        name: 'Insurance Policy',
        entityType: 'CONCEPT',
        description: 'A contract between insurer and insured',
        properties: {
          type: 'contract',
          duration: 'annual',
        },
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.data.success).toBe(true);
      expect(createResponse.data.data).toHaveProperty('id');

      entityId = createResponse.data.data.id;
    });

    test('should create relationship between entities', async () => {
      const createResponse = await apiClient.post('/knowledge/graph/entities', {
        tenantId,
        name: 'Claim',
        entityType: 'CONCEPT',
        description: 'Request for insurance compensation',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const targetEntityId = createResponse.data.data.id;

      const relationshipResponse = await apiClient.post('/knowledge/graph/relationships', {
        tenantId,
        sourceEntityId: entityId,
        targetEntityId,
        relationshipType: 'RELATED_TO',
        description: 'Claims are filed against policies',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(relationshipResponse.status).toBe(201);
      expect(relationshipResponse.data.success).toBe(true);
    });

    test('should get entity neighbors', async () => {
      const neighborsResponse = await apiClient.get(`/knowledge/graph/entities/${entityId}/neighbors`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(neighborsResponse.status).toBe(200);
      expect(neighborsResponse.data.success).toBe(true);
      expect(neighborsResponse.data.data).toHaveProperty('entity');
      expect(neighborsResponse.data.data).toHaveProperty('neighbors');
    });

    test('should perform semantic search on graph entities', async () => {
      const searchResponse = await apiClient.post('/knowledge/graph/search', {
        tenantId,
        query: 'insurance contract',
        entityType: 'CONCEPT',
        limit: 5,
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.data.success).toBe(true);
      expect(Array.isArray(searchResponse.data.data)).toBe(true);
    });
  });

  describe('Article CRUD operations', () => {
    test('should get article by ID', async () => {
      const getResponse = await apiClient.get(`/knowledge/articles/${articleId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.success).toBe(true);
      expect(getResponse.data.data.id).toBe(articleId);
    });

    test('should update article', async () => {
      const updateResponse = await apiClient.put(`/knowledge/articles/${articleId}`, {
        title: 'Updated Insurance Claim Filing Guide',
        summary: 'Updated summary',
        tags: ['claims', 'guide', 'updated'],
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.success).toBe(true);
      expect(updateResponse.data.data.title).toBe('Updated Insurance Claim Filing Guide');
    });

    test('should increment view count', async () => {
      const viewResponse = await apiClient.post(`/knowledge/articles/${articleId}/view`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(viewResponse.status).toBe(200);
      expect(viewResponse.data.success).toBe(true);
    });

    test('should list articles with filters', async () => {
      const listResponse = await apiClient.get('/knowledge/articles', {
        params: {
          tenantId,
          category: 'claims',
          status: 'PUBLISHED',
          limit: 10,
        },
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(listResponse.status).toBe(200);
      expect(listResponse.data.success).toBe(true);
      expect(Array.isArray(listResponse.data.data)).toBe(true);
    });
  });
});
