import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Like } from 'typeorm';
import { OutboxPublisher } from '@insurance/shared';
import { v4 as uuidv4 } from 'uuid';
import { KnowledgeArticle, ArticleStatus, ArticleCategory } from './entities/KnowledgeArticle';
import { KnowledgeGraphEntity, EntityType } from './entities/KnowledgeGraphEntity';
import { KnowledgeGraphRelationship, RelationshipType } from './entities/KnowledgeGraphRelationship';
import { NextBestAction } from './entities/NextBestAction';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(KnowledgeArticle)
    private articleRepo: Repository<KnowledgeArticle>,
    @InjectRepository(KnowledgeGraphEntity)
    private entityRepo: Repository<KnowledgeGraphEntity>,
    @InjectRepository(KnowledgeGraphRelationship)
    private relationshipRepo: Repository<KnowledgeGraphRelationship>,
    @InjectRepository(NextBestAction)
    private nbaRepo: Repository<NextBestAction>,
  ) {}

  async createArticle(params: {
    tenantId: string;
    title: string;
    content: string;
    summary?: string;
    category: ArticleCategory;
    tags?: string[];
    authorId?: string;
    metadata?: Record<string, any>;
  }): Promise<KnowledgeArticle> {
    return await this.dataSource.transaction(async (manager) => {
      const article = manager.create(KnowledgeArticle, {
        tenantId: params.tenantId,
        title: params.title,
        content: params.content,
        summary: params.summary || null,
        category: params.category,
        tags: params.tags || null,
        status: ArticleStatus.DRAFT,
        authorId: params.authorId || null,
        viewCount: 0,
        metadata: params.metadata || null,
      });
      const saved = await manager.save(article);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.knowledge.article.created',
        eventType: 'KnowledgeArticleCreated',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { articleId: saved.id, tenantId: params.tenantId },
        payload: {
          articleId: saved.id,
          title: saved.title,
          category: saved.category,
          status: saved.status,
          tenantId: saved.tenantId,
        },
      });
      return saved;
    });
  }

  async publishArticle(id: string): Promise<KnowledgeArticle> {
    return await this.dataSource.transaction(async (manager) => {
      const article = await manager.findOne(KnowledgeArticle, { where: { id } });
      if (!article) throw new Error('Article not found');
      article.status = ArticleStatus.PUBLISHED;
      const saved = await manager.save(article);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.knowledge.article.published',
        eventType: 'KnowledgeArticlePublished',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { articleId: saved.id },
        payload: {
          articleId: saved.id,
          title: saved.title,
          status: saved.status,
        },
      });
      return saved;
    });
  }

  async searchArticles(params: {
    tenantId: string;
    query?: string;
    category?: ArticleCategory;
    tags?: string[];
    status?: ArticleStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ items: KnowledgeArticle[]; total: number }> {
    const qb = this.articleRepo.createQueryBuilder('a')
      .where('a.tenantId = :tenantId', { tenantId: params.tenantId });

    if (params.status) {
      qb.andWhere('a.status = :status', { status: params.status });
    } else {
      // Default to published for search
      qb.andWhere('a.status = :status', { status: ArticleStatus.PUBLISHED });
    }

    if (params.category) {
      qb.andWhere('a.category = :category', { category: params.category });
    }

    if (params.tags && params.tags.length > 0) {
      qb.andWhere('a.tags @> :tags', { tags: JSON.stringify(params.tags) });
    }

    if (params.query) {
      // Full-text search using PostgreSQL tsvector
      qb.andWhere(`
        to_tsvector('english', a.title) @@ to_tsquery('english', :query) OR
        to_tsvector('english', a.content) @@ to_tsquery('english', :query)
      `, { query: this.buildTsQuery(params.query) });
    }

    const limit = Math.min(params.limit || 20, 100);
    const offset = params.offset || 0;

    qb.orderBy('a.updatedAt', 'DESC').take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  private buildTsQuery(query: string): string {
    // Convert simple query to tsquery format
    return query
      .trim()
      .split(/\s+/)
      .map((word) => word + ':*')
      .join(' & ');
  }

  async getArticle(id: string): Promise<KnowledgeArticle | null> {
    return this.articleRepo.findOne({ where: { id } });
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.articleRepo.increment({ id }, 'viewCount', 1);
  }

  async updateArticle(id: string, params: {
    title?: string;
    content?: string;
    summary?: string;
    category?: ArticleCategory;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<KnowledgeArticle> {
    const article = await this.articleRepo.findOne({ where: { id } });
    if (!article) throw new Error('Article not found');

    if (params.title !== undefined) article.title = params.title;
    if (params.content !== undefined) article.content = params.content;
    if (params.summary !== undefined) article.summary = params.summary;
    if (params.category !== undefined) article.category = params.category;
    if (params.tags !== undefined) article.tags = params.tags;
    if (params.metadata !== undefined) article.metadata = params.metadata;

    return this.articleRepo.save(article);
  }

  async deleteArticle(id: string): Promise<void> {
    await this.articleRepo.delete({ id });
  }

  async listArticles(params: {
    tenantId: string;
    category?: ArticleCategory;
    status?: ArticleStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ items: KnowledgeArticle[]; total: number }> {
    const qb = this.articleRepo.createQueryBuilder('a')
      .where('a.tenantId = :tenantId', { tenantId: params.tenantId });

    if (params.category) {
      qb.andWhere('a.category = :category', { category: params.category });
    }
    if (params.status) {
      qb.andWhere('a.status = :status', { status: params.status });
    }

    const limit = Math.min(params.limit || 20, 100);
    const offset = params.offset || 0;

    qb.orderBy('a.updatedAt', 'DESC').take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  // Knowledge Graph Methods

  async createEntity(params: {
    tenantId: string;
    name: string;
    entityType: EntityType;
    description?: string;
    aliases?: string[];
    properties?: Record<string, any>;
    embedding?: number[];
    embeddingModel?: string;
    metadata?: Record<string, any>;
  }): Promise<KnowledgeGraphEntity> {
    const entity = this.entityRepo.create();
    entity.tenantId = params.tenantId;
    entity.name = params.name;
    entity.entityType = params.entityType;
    entity.description = params.description || null;
    entity.aliases = params.aliases || [];
    entity.properties = params.properties || null;
    entity.embedding = params.embedding || null;
    entity.embeddingModel = params.embeddingModel || null;
    entity.metadata = params.metadata || null;
    return this.entityRepo.save(entity);
  }

  async getEntity(id: string): Promise<KnowledgeGraphEntity | null> {
    return this.entityRepo.findOne({ where: { id } });
  }

  async listEntities(params: {
    tenantId: string;
    entityType?: EntityType;
    limit?: number;
    offset?: number;
  }): Promise<{ items: KnowledgeGraphEntity[]; total: number }> {
    const qb = this.entityRepo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId: params.tenantId });

    if (params.entityType) {
      qb.andWhere('e.entityType = :entityType', { entityType: params.entityType });
    }

    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;

    qb.orderBy('e.createdAt', 'DESC').take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async updateEntity(id: string, params: {
    name?: string;
    description?: string;
    aliases?: string[];
    properties?: Record<string, any>;
    embedding?: number[];
    embeddingModel?: string;
    metadata?: Record<string, any>;
  }): Promise<KnowledgeGraphEntity> {
    const entity = await this.entityRepo.findOne({ where: { id } });
    if (!entity) throw new Error('Entity not found');

    if (params.name !== undefined) entity.name = params.name;
    if (params.description !== undefined) entity.description = params.description;
    if (params.aliases !== undefined) entity.aliases = params.aliases;
    if (params.properties !== undefined) entity.properties = params.properties;
    if (params.embedding !== undefined) entity.embedding = params.embedding;
    if (params.embeddingModel !== undefined) entity.embeddingModel = params.embeddingModel;
    if (params.metadata !== undefined) entity.metadata = params.metadata;

    return this.entityRepo.save(entity);
  }

  async deleteEntity(id: string): Promise<void> {
    await this.entityRepo.delete({ id });
  }

  async createRelationship(params: {
    tenantId: string;
    sourceEntityId: string;
    targetEntityId: string;
    relationshipType: RelationshipType;
    description?: string;
    weight?: number;
    properties?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<KnowledgeGraphRelationship> {
    const relationship = this.relationshipRepo.create();
    relationship.tenantId = params.tenantId;
    relationship.sourceEntityId = params.sourceEntityId;
    relationship.targetEntityId = params.targetEntityId;
    relationship.relationshipType = params.relationshipType;
    relationship.description = params.description || null;
    relationship.weight = params.weight || null;
    relationship.properties = params.properties || null;
    relationship.metadata = params.metadata || null;
    return this.relationshipRepo.save(relationship);
  }

  async getRelationship(id: string): Promise<KnowledgeGraphRelationship | null> {
    return this.relationshipRepo.findOne({ where: { id } });
  }

  async listRelationships(params: {
    tenantId: string;
    sourceEntityId?: string;
    targetEntityId?: string;
    relationshipType?: RelationshipType;
    limit?: number;
    offset?: number;
  }): Promise<{ items: KnowledgeGraphRelationship[]; total: number }> {
    const qb = this.relationshipRepo.createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId: params.tenantId });

    if (params.sourceEntityId) {
      qb.andWhere('r.sourceEntityId = :sourceEntityId', { sourceEntityId: params.sourceEntityId });
    }
    if (params.targetEntityId) {
      qb.andWhere('r.targetEntityId = :targetEntityId', { targetEntityId: params.targetEntityId });
    }
    if (params.relationshipType) {
      qb.andWhere('r.relationshipType = :relationshipType', { relationshipType: params.relationshipType });
    }

    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;

    qb.orderBy('r.createdAt', 'DESC').take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async deleteRelationship(id: string): Promise<void> {
    await this.relationshipRepo.delete({ id });
  }

  async getEntityNeighbors(entityId: string, maxDepth: number = 1): Promise<{
    entity: KnowledgeGraphEntity;
    neighbors: Array<{
      relationship: KnowledgeGraphRelationship;
      entity: KnowledgeGraphEntity;
    }>;
  }> {
    const entity = await this.entityRepo.findOne({ where: { id: entityId } });
    if (!entity) throw new Error('Entity not found');

    const relationships = await this.relationshipRepo
      .createQueryBuilder('r')
      .where('r.sourceEntityId = :entityId', { entityId })
      .getMany();

    const neighbors: Array<{
      relationship: KnowledgeGraphRelationship;
      entity: KnowledgeGraphEntity;
    }> = [];

    for (const rel of relationships) {
      const targetEntity = await this.entityRepo.findOne({ where: { id: rel.targetEntityId } });
      if (targetEntity) {
        neighbors.push({ relationship: rel, entity: targetEntity });
      }
    }

    return { entity, neighbors };
  }

  async semanticSearch(params: {
    tenantId: string;
    queryEmbedding: number[];
    entityType?: EntityType;
    limit?: number;
    threshold?: number;
  }): Promise<Array<{
    entity: KnowledgeGraphEntity;
    similarity: number;
  }>> {
    const qb = this.entityRepo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId: params.tenantId })
      .andWhere('e.embedding IS NOT NULL');

    if (params.entityType) {
      qb.andWhere('e.entityType = :entityType', { entityType: params.entityType });
    }

    const entities = await qb.getMany();

    const results: Array<{
      entity: KnowledgeGraphEntity;
      similarity: number;
    }> = [];

    for (const entity of entities) {
      if (entity.embedding) {
        const similarity = this.cosineSimilarity(params.queryEmbedding, entity.embedding);
        if (similarity >= (params.threshold || 0.7)) {
          results.push({ entity, similarity });
        }
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, params.limit || 10);
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  async retrieveKnowledgeForGrounding(params: {
    tenantId: string;
    query: string;
    queryEmbedding?: number[];
    entityType?: EntityType;
    limit?: number;
  }): Promise<{
    articles: KnowledgeArticle[];
    entities: Array<{
      entity: KnowledgeGraphEntity;
      similarity?: number;
    }>;
    context: string;
  }> {
    // Search articles with full-text search
    const articlesResult = await this.searchArticles({
      tenantId: params.tenantId,
      query: params.query,
      status: ArticleStatus.PUBLISHED,
      limit: params.limit || 5,
    });

    // Search entities with semantic search if embedding provided
    let entitiesResult: Array<{
      entity: KnowledgeGraphEntity;
      similarity?: number;
    }> = [];

    if (params.queryEmbedding) {
      const semanticResults = await this.semanticSearch({
        tenantId: params.tenantId,
        queryEmbedding: params.queryEmbedding,
        entityType: params.entityType,
        limit: params.limit || 5,
      });
      entitiesResult = semanticResults.map(r => ({ entity: r.entity, similarity: r.similarity }));
    } else {
      // Fallback to entity name matching
      const entitiesList = await this.listEntities({
        tenantId: params.tenantId,
        entityType: params.entityType,
        limit: params.limit || 5,
      });
      entitiesResult = entitiesList.items.map(e => ({ entity: e }));
    }

    // Build context string
    const contextParts: string[] = [];

    for (const article of articlesResult.items) {
      contextParts.push(`Article: ${article.title}\n${article.summary || article.content.substring(0, 200)}...`);
    }

    for (const { entity, similarity } of entitiesResult) {
      const simText = similarity !== undefined ? ` (similarity: ${similarity.toFixed(2)})` : '';
      contextParts.push(`Entity: ${entity.name} (${entity.entityType})${simText}\n${entity.description || ''}`);
    }

    return {
      articles: articlesResult.items,
      entities: entitiesResult,
      context: contextParts.join('\n\n'),
    };
  }

  // ── Next Best Action Engine ──────────────────────────────────────

  async createNba(params: {
    tenantId: string;
    customerId: string;
    trigger: string;
    title: string;
    description: string;
    priority?: string;
    channels?: string[];
    ctaLabel?: string;
    ctaUrl?: string;
    context?: Record<string, any>;
    scheduledAt?: Date;
  }): Promise<NextBestAction> {
    const nba = this.nbaRepo.create({
      tenantId: params.tenantId,
      customerId: params.customerId,
      trigger: params.trigger as any,
      title: params.title,
      description: params.description,
      priority: (params.priority as any) || 'medium',
      channels: (params.channels || ['portal']).join(','),
      ctaLabel: params.ctaLabel || null,
      ctaUrl: params.ctaUrl || null,
      context: params.context || null,
      scheduledAt: params.scheduledAt || null,
      active: true,
    });
    return this.nbaRepo.save(nba);
  }

  async getRecommendations(params: {
    tenantId: string;
    customerId: string;
    limit?: number;
  }): Promise<NextBestAction[]> {
    const qb = this.nbaRepo.createQueryBuilder('nba')
      .where('nba.tenantId = :tenantId', { tenantId: params.tenantId })
      .andWhere('nba.customerId = :customerId', { customerId: params.customerId })
      .andWhere('nba.active = true')
      .andWhere('(nba.executedAt IS NULL OR nba.executedAt > NOW() - INTERVAL \'30 days\')')
      .orderBy(
        "CASE nba.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END",
        'ASC'
      )
      .addOrderBy('nba.createdAt', 'DESC')
      .limit(params.limit || 5);
    return qb.getMany();
  }

  async executeNba(id: string): Promise<NextBestAction | null> {
    return await this.dataSource.transaction(async (manager) => {
      const nba = await manager.findOne(NextBestAction, { where: { id } });
      if (!nba) return null;
      nba.executedAt = new Date();
      nba.active = false;
      const saved = await manager.save(nba);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.knowledge.nba.executed',
        eventType: 'KnowledgeNbaExecuted',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { nbaId: saved.id, customerId: saved.customerId },
        payload: {
          nbaId: saved.id,
          customerId: saved.customerId,
          title: saved.title,
          trigger: saved.trigger,
        },
      });
      return saved;
    });
  }

  async listNbas(params: {
    tenantId?: string;
    customerId?: string;
    active?: boolean;
    limit: number;
    offset: number;
  }): Promise<{ rows: NextBestAction[]; total: number }> {
    const qb = this.nbaRepo.createQueryBuilder('nba');
    if (params.tenantId) qb.andWhere('nba.tenantId = :tenantId', { tenantId: params.tenantId });
    if (params.customerId) qb.andWhere('nba.customerId = :customerId', { customerId: params.customerId });
    if (params.active !== undefined) qb.andWhere('nba.active = :active', { active: params.active });
    qb.orderBy('nba.createdAt', 'DESC');
    qb.take(params.limit).skip(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }
}
