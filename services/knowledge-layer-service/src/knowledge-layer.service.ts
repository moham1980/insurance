import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OutboxPublisher, applyCursorPagination } from '@insurance/shared';
import { v4 as uuidv4 } from 'uuid';
import { Document, DocumentStatus, DocumentType } from './entities/document.entity';
import { DocumentChunk } from './entities/document-chunk.entity';

export interface IndexDocumentParams {
  externalId: string;
  title: string;
  content: string;
  summary?: string;
  type: DocumentType;
  tags?: string[];
  language?: string;
  source?: string;
  sourceUrl?: string;
  version?: number;
  metadata?: Record<string, any>;
  // Tenant scoping (P0 fix): set from the authenticated request by the controller.
  tenantId?: string;
}

export interface SearchParams {
  query: string;
  type?: DocumentType;
  tags?: string[];
  language?: string;
  limit?: number;
  threshold?: number;
  // Tenant scoping (P0 fix): set from the authenticated request by the controller.
  tenantId?: string;
}

export interface SearchResult {
  documentId: string;
  externalId: string;
  title: string;
  summary: string;
  content: string;
  type: DocumentType;
  score: number;
  metadata: Record<string, any>;
  chunks: Array<{
    content: string;
    score: number;
    startPosition: number;
    endPosition: number;
  }>;
}

@Injectable()
export class KnowledgeLayerService {
  private readonly logger = new Logger(KnowledgeLayerService.name);
  private readonly chunkSize = 500; // characters
  private readonly chunkOverlap = 50; // characters

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(DocumentChunk)
    private readonly chunkRepository: Repository<DocumentChunk>,
  ) {}

  async indexDocument(params: IndexDocumentParams): Promise<Document> {
    this.logger.log(`Indexing document: ${params.externalId}`);

    // Tenant scoping (P0 fix): dedup/upsert must be scoped to (externalId, tenantId)
    // so that two tenants with the same externalId do not share a document.
    const existingDoc = await this.documentRepository.findOne({
      where: { externalId: params.externalId, tenantId: params.tenantId ?? null },
    });

    if (existingDoc) {
      // Update existing document + delete old chunks atomically
      await this.dataSource.transaction(async (manager) => {
        existingDoc.title = params.title;
        existingDoc.content = params.content;
        existingDoc.summary = params.summary || existingDoc.summary;
        existingDoc.type = params.type;
        existingDoc.tags = params.tags || existingDoc.tags;
        existingDoc.language = params.language || existingDoc.language;
        existingDoc.source = params.source || existingDoc.source;
        existingDoc.sourceUrl = params.sourceUrl || existingDoc.sourceUrl;
        existingDoc.version = params.version || existingDoc.version;
        existingDoc.metadata = params.metadata || existingDoc.metadata;
        // Tenant scoping (P0 fix): keep tenantId in sync with the request.
        existingDoc.tenantId = params.tenantId ?? existingDoc.tenantId;
        existingDoc.status = DocumentStatus.PENDING;
        existingDoc.updatedAt = new Date();
        
        await manager.save(existingDoc);
        await manager.delete(DocumentChunk, { documentId: existingDoc.id });
        const outbox = new OutboxPublisher(manager);
        await outbox.publish({
          topic: 'insurance.knowledge.document.reindexed',
          eventType: 'KnowledgeDocumentReindexed',
          eventVersion: 1,
          correlationId: uuidv4(),
          subject: { documentId: existingDoc.id, externalId: existingDoc.externalId },
          payload: {
            documentId: existingDoc.id,
            externalId: existingDoc.externalId,
            title: existingDoc.title,
            status: existingDoc.status,
          },
        });
      });
      
      // Process document (involves external embedding calls, done outside tx)
      await this.processDocument(existingDoc);
      
      return existingDoc;
    }

    // Create new document
    const document = await this.dataSource.transaction(async (manager) => {
      const doc = manager.create(Document, {
        externalId: params.externalId,
        title: params.title,
        content: params.content,
        summary: params.summary || this.generateSummary(params.content),
        type: params.type,
        status: DocumentStatus.PENDING,
        tags: params.tags || [],
        language: params.language || 'fa',
        source: params.source,
        sourceUrl: params.sourceUrl,
        version: params.version || 1,
        metadata: params.metadata || {},
      });
      const saved = await manager.save(doc);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.knowledge.document.indexed',
        eventType: 'KnowledgeDocumentIndexed',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { documentId: saved.id, externalId: saved.externalId },
        payload: {
          documentId: saved.id,
          externalId: saved.externalId,
          title: saved.title,
          type: saved.type,
          status: saved.status,
        },
      });
      return saved;
    });

    // Process document (involves external embedding calls, done outside tx)
    await this.processDocument(document);

    return document;
  }

  private async processDocument(document: Document): Promise<void> {
    try {
      // Chunk the document
      const chunks = this.chunkDocument(document.content);
      
      // Save chunks and generate per-chunk embeddings
      for (const chunk of chunks) {
        const chunkEmbeddings = await this.generateEmbeddings(chunk.content);
        const documentChunk = this.chunkRepository.create({
          documentId: document.id,
          chunkIndex: chunk.index,
          content: chunk.content,
          startPosition: chunk.startPosition,
          endPosition: chunk.endPosition,
          embeddings: chunkEmbeddings,
          metadata: {
            documentTitle: document.title,
            documentType: document.type,
            language: document.language,
          },
        });
        await this.chunkRepository.save(documentChunk);
      }

      // Generate document-level embeddings using real embedding service
      const embeddings = await this.generateEmbeddings(document.content);
      document.embeddings = embeddings;
      document.status = DocumentStatus.INDEXED;
      document.indexedAt = new Date();
      document.indexingResult = {
        success: true,
        indexedAt: new Date(),
      };
      await this.documentRepository.save(document);

      this.logger.log(`Document indexed successfully: ${document.externalId}`);
    } catch (error) {
      this.logger.error(`Error processing document ${document.externalId}:`, error);
      
      document.status = DocumentStatus.FAILED;
      document.lastError = error.message;
      document.indexingResult = {
        success: false,
        error: error.message,
      };
      await this.documentRepository.save(document);
      
      throw error;
    }
  }

  private chunkDocument(content: string): Array<{
    index: number;
    content: string;
    startPosition: number;
    endPosition: number;
  }> {
    const chunks: Array<{
      index: number;
      content: string;
      startPosition: number;
      endPosition: number;
    }> = [];

    let index = 0;
    let position = 0;

    while (position < content.length) {
      const endPosition = Math.min(position + this.chunkSize, content.length);
      let chunkContent = content.substring(position, endPosition);

      // Try to break at word boundary
      if (endPosition < content.length) {
        const lastSpace = chunkContent.lastIndexOf(' ');
        if (lastSpace > this.chunkSize - this.chunkOverlap) {
          chunkContent = chunkContent.substring(0, lastSpace);
        }
      }

      chunks.push({
        index: index++,
        content: chunkContent.trim(),
        startPosition: position,
        endPosition: position + chunkContent.length,
      });

      position += chunkContent.length - this.chunkOverlap;
      if (position < 0) position = 0;
    }

    return chunks;
  }

  private generateSummary(content: string): string {
    // Simple summary generation (first 200 characters)
    return content.substring(0, 200) + '...';
  }

  private async generateEmbeddings(content: string): Promise<number[]> {
    const embeddingApiUrl = process.env.EMBEDDING_API_URL;
    const embeddingApiKey = process.env.EMBEDDING_API_KEY;
    const embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    const embeddingSize = parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10);
    const isProduction = process.env.NODE_ENV === 'production';

    if (!embeddingApiUrl) {
      if (isProduction) {
        // In production, mock embeddings must never be used — they produce
        // meaningless vectors that corrupt semantic search results.
        this.logger.error('EMBEDDING_API_URL not configured in production; refusing to generate mock embeddings');
        throw new Error('EMBEDDING_API_URL not configured in production — cannot generate embeddings');
      }
      this.logger.warn('EMBEDDING_API_URL not configured, falling back to mock embeddings (non-production only)');
      return this.generateMockEmbeddings(content, embeddingSize);
    }

    try {
      const response = await fetch(embeddingApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(embeddingApiKey ? { 'Authorization': `Bearer ${embeddingApiKey}` } : {}),
        },
        body: JSON.stringify({
          input: content,
          model: embeddingModel,
          ...(embeddingSize ? { dimensions: embeddingSize } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      const embedding = data.data?.[0]?.embedding || data.embedding;

      if (!Array.isArray(embedding)) {
        throw new Error('Invalid embedding response format');
      }

      return embedding;
    } catch (error) {
      if (isProduction) {
        // In production, never fall back to mock embeddings on API failure —
        // silently using random vectors would corrupt the search index.
        this.logger.error('Failed to generate embeddings from API in production; refusing mock fallback', error);
        throw new Error('Failed to generate embeddings from API in production — cannot fall back to mock');
      }
      this.logger.error('Failed to generate embeddings from API, falling back to mock (non-production only)', error);
      return this.generateMockEmbeddings(content, embeddingSize);
    }
  }

  private generateMockEmbeddings(content: string, embeddingSize: number = 1536): number[] {
    const embeddings: number[] = [];
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i);
      hash |= 0;
    }
    const random = this.seededRandom(hash);
    for (let i = 0; i < embeddingSize; i++) {
      embeddings.push(random());
    }
    const magnitude = Math.sqrt(embeddings.reduce((sum, val) => sum + val * val, 0));
    return embeddings.map(val => val / magnitude);
  }

  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  async search(params: SearchParams): Promise<SearchResult[]> {
    this.logger.log(`Searching documents: ${params.query}`);

    // Generate query embedding using real embedding service (falls back to mock if not configured)
    const queryEmbedding = await this.generateEmbeddings(params.query);

    // Build query
    const queryBuilder = this.documentRepository.createQueryBuilder('doc')
      .where('doc.status = :status', { status: DocumentStatus.INDEXED });

    // Tenant scoping (P0 fix): filter by tenantId so cross-tenant search is impossible.
    if (params.tenantId) {
      queryBuilder.andWhere('doc.tenantId = :tenantId', { tenantId: params.tenantId });
    }

    if (params.type) {
      queryBuilder.andWhere('doc.type = :type', { type: params.type });
    }

    if (params.language) {
      queryBuilder.andWhere('doc.language = :language', { language: params.language });
    }

    if (params.tags && params.tags.length > 0) {
      queryBuilder.andWhere(':tag = ANY(doc.tags)', { tag: params.tags[0] });
    }

    const documents = await queryBuilder.getMany();

    // Calculate similarity scores
    const results: SearchResult[] = [];
    const threshold = params.threshold || 0.7;

    for (const document of documents) {
      const score = this.cosineSimilarity(queryEmbedding, document.embeddings);
      
      if (score >= threshold) {
        // Get matching chunks
        const chunks = await this.chunkRepository.find({
          where: { documentId: document.id },
        });

        const chunkScores = chunks.map(chunk => ({
          content: chunk.content,
          score: this.cosineSimilarity(queryEmbedding, chunk.embeddings),
          startPosition: chunk.startPosition,
          endPosition: chunk.endPosition,
        })).filter(c => c.score >= threshold);

        if (chunkScores.length > 0) {
          results.push({
            documentId: document.id,
            externalId: document.externalId,
            title: document.title,
            summary: document.summary,
            content: document.content,
            type: document.type,
            score: Math.max(...chunkScores.map(c => c.score)),
            metadata: document.metadata,
            chunks: chunkScores.sort((a, b) => b.score - a.score).slice(0, 5),
          });
        }
      }
    }

    // Sort by score and limit results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, params.limit || 10);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length === 0 || b.length === 0) return 0;
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  async getDocument(id: string, tenantId?: string): Promise<Document> {
    // Tenant scoping (P0 fix): filter by tenantId when provided.
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;
    return this.documentRepository.findOne({
      where,
      relations: ['chunks'],
    });
  }

  async getDocumentByExternalId(externalId: string, tenantId?: string): Promise<Document> {
    // Tenant scoping (P0 fix): filter by tenantId when provided.
    const where: any = { externalId };
    if (tenantId) where.tenantId = tenantId;
    return this.documentRepository.findOne({
      where,
      relations: ['chunks'],
    });
  }

  async deleteDocument(id: string, tenantId?: string): Promise<void> {
    // Tenant scoping (P0 fix): filter by tenantId so cross-tenant deletion is impossible.
    await this.dataSource.transaction(async (manager) => {
      const findWhere: any = { id };
      if (tenantId) findWhere.tenantId = tenantId;
      const doc = await manager.findOne(Document, { where: findWhere });
      if (!doc) {
        // No document found for this tenant — nothing to delete.
        return;
      }
      await manager.delete(DocumentChunk, { documentId: id });
      await manager.delete(Document, { id });
      if (doc) {
        const outbox = new OutboxPublisher(manager);
        await outbox.publish({
          topic: 'insurance.knowledge.document.deleted',
          eventType: 'KnowledgeDocumentDeleted',
          eventVersion: 1,
          correlationId: uuidv4(),
          subject: { documentId: id, externalId: doc.externalId },
          payload: {
            documentId: id,
            externalId: doc.externalId,
            title: doc.title,
          },
        });
      }
    });
  }

  async getDocuments(params: {
    type?: DocumentType;
    status?: DocumentStatus;
    language?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
    cursor?: string; // P1 #8: cursor-based pagination
    // Tenant scoping (P0 fix): set from the authenticated request by the controller.
    tenantId?: string;
  }): Promise<{ items: Document[]; total: number; hasNext?: boolean; nextCursor?: string | null }> {
    const queryBuilder = this.documentRepository.createQueryBuilder('doc');

    // Tenant scoping (P0 fix): filter by tenantId so cross-tenant listing is impossible.
    if (params.tenantId) {
      queryBuilder.andWhere('doc.tenantId = :tenantId', { tenantId: params.tenantId });
    }

    if (params.type) {
      queryBuilder.andWhere('doc.type = :type', { type: params.type });
    }

    if (params.status) {
      queryBuilder.andWhere('doc.status = :status', { status: params.status });
    }

    if (params.language) {
      queryBuilder.andWhere('doc.language = :language', { language: params.language });
    }

    if (params.tags && params.tags.length > 0) {
      queryBuilder.andWhere(':tag = ANY(doc.tags)', { tag: params.tags[0] });
    }

    // P1 #8: cursor-based pagination (backward compatible — falls back to offset if no cursor)
    if (params.cursor) {
      const result = await applyCursorPagination<Document>(queryBuilder, params.cursor, params.limit || 50, 'DESC', 'doc', 'createdAt', 'id');
      return { items: result.items, total: result.items.length, hasNext: result.hasNext, nextCursor: result.nextCursor };
    }

    const limit = params.limit || 50;
    const offset = params.offset || 0;

    queryBuilder.orderBy('doc.createdAt', 'DESC').take(limit).skip(offset);

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }

  async reindexDocument(id: string, tenantId?: string): Promise<Document> {
    // Tenant scoping (P0 fix): filter by tenantId so cross-tenant reindex is impossible.
    const findWhere: any = { id };
    if (tenantId) findWhere.tenantId = tenantId;
    const document = await this.documentRepository.findOne({ where: findWhere });
    if (!document) {
      throw new Error(`Document not found: ${id}`);
    }

    await this.dataSource.transaction(async (manager) => {
      document.status = DocumentStatus.PENDING;
      await manager.save(document);
    });

    await this.processDocument(document);

    return document;
  }

  async getStats(tenantId?: string): Promise<{
    totalDocuments: number;
    indexedDocuments: number;
    pendingDocuments: number;
    failedDocuments: number;
    documentsByType: Record<DocumentType, number>;
    documentsByLanguage: Record<string, number>;
  }> {
    // Tenant scoping (P0 fix): filter all counts by tenantId when provided.
    const tenantWhere = tenantId ? { tenantId } : {};

    const [total, indexed, pending, failed] = await Promise.all([
      this.documentRepository.count({ where: tenantWhere }),
      this.documentRepository.count({ where: { ...tenantWhere, status: DocumentStatus.INDEXED } }),
      this.documentRepository.count({ where: { ...tenantWhere, status: DocumentStatus.PENDING } }),
      this.documentRepository.count({ where: { ...tenantWhere, status: DocumentStatus.FAILED } }),
    ]);

    const documentsByType: Record<DocumentType, number> = {
      [DocumentType.POLICY]: 0,
      [DocumentType.CLAIM]: 0,
      [DocumentType.CONTRACT]: 0,
      [DocumentType.REGULATION]: 0,
      [DocumentType.FAQ]: 0,
      [DocumentType.MANUAL]: 0,
      [DocumentType.OTHER]: 0,
    };

    for (const type of Object.values(DocumentType)) {
      documentsByType[type] = await this.documentRepository.count({ where: { ...tenantWhere, type } });
    }

    const documentsByLanguage: Record<string, number> = {};
    const docs = await this.documentRepository.find({ select: ['language'], where: tenantWhere });
    for (const doc of docs) {
      if (doc.language) {
        documentsByLanguage[doc.language] = (documentsByLanguage[doc.language] || 0) + 1;
      }
    }

    return {
      totalDocuments: total,
      indexedDocuments: indexed,
      pendingDocuments: pending,
      failedDocuments: failed,
      documentsByType,
      documentsByLanguage,
    };
  }
}
