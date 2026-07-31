import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuoteDocument } from '../entities/QuoteDocument';

export interface QuoteDocumentContext {
  tenantId: string;
  userId: string;
  roles: string[];
  correlationId: string;
}

@Injectable()
export class QuoteDocumentService {
  constructor(
    @InjectRepository(QuoteDocument)
    private readonly repo: Repository<QuoteDocument>,
  ) {}

  async list(ctx: QuoteDocumentContext, filters?: any): Promise<QuoteDocument[]> {
    const where: any = { tenantId: ctx.tenantId };
    if (filters?.quoteResponseId) where.quoteResponseId = filters.quoteResponseId;
    if (filters?.status) where.status = filters.status;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async get(ctx: QuoteDocumentContext, quoteDocumentId: string): Promise<QuoteDocument> {
    const doc = await this.repo.findOne({ where: { quoteDocumentId, tenantId: ctx.tenantId } });
    if (!doc) throw new NotFoundException('Quote document not found');
    return doc;
  }

  async upload(ctx: QuoteDocumentContext, quoteDocumentId: string, dto: any): Promise<QuoteDocument> {
    const doc = await this.get(ctx, quoteDocumentId);
    if (doc.status === 'validated') throw new BadRequestException('Document already validated');
    doc.status = 'uploaded';
    if (dto.storageRef) doc.storageRef = dto.storageRef;
    if (dto.metadata) doc.metadata = dto.metadata;
    doc.updatedAt = new Date();
    return this.repo.save(doc);
  }

  async validate(ctx: QuoteDocumentContext, quoteDocumentId: string, dto: any): Promise<QuoteDocument> {
    const doc = await this.get(ctx, quoteDocumentId);
    if (doc.status !== 'uploaded') throw new BadRequestException('Document must be uploaded before validation');
    doc.status = 'validated';
    if (dto.metadata) doc.metadata = dto.metadata;
    doc.updatedAt = new Date();
    return this.repo.save(doc);
  }

  async reject(ctx: QuoteDocumentContext, quoteDocumentId: string, dto: any): Promise<QuoteDocument> {
    const doc = await this.get(ctx, quoteDocumentId);
    doc.status = 'rejected';
    if (dto.metadata) doc.metadata = dto.metadata;
    doc.updatedAt = new Date();
    return this.repo.save(doc);
  }
}
