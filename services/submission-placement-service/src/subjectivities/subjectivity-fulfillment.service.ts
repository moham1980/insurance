import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subjectivity } from '../entities/Subjectivity';

export interface SubjectivityContext {
  tenantId: string;
  userId: string;
  roles: string[];
  correlationId: string;
}

@Injectable()
export class SubjectivityFulfillmentService {
  constructor(
    @InjectRepository(Subjectivity)
    private readonly repo: Repository<Subjectivity>,
  ) {}

  async list(ctx: SubjectivityContext, filters?: any): Promise<Subjectivity[]> {
    const where: any = { tenantId: ctx.tenantId };
    if (filters?.submissionId) where.submissionId = filters.submissionId;
    if (filters?.placementId) where.placementId = filters.placementId;
    if (filters?.status) where.status = filters.status;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async get(ctx: SubjectivityContext, subjectivityId: string): Promise<Subjectivity> {
    const item = await this.repo.findOne({ where: { subjectivityId, tenantId: ctx.tenantId } });
    if (!item) throw new NotFoundException('Subjectivity not found');
    return item;
  }

  async fulfill(ctx: SubjectivityContext, subjectivityId: string, dto: any): Promise<Subjectivity> {
    const item = await this.get(ctx, subjectivityId);
    if (item.status !== 'pending') throw new BadRequestException('Subjectivity already resolved');
    item.status = 'fulfilled';
    item.fulfilledAt = new Date();
    if (dto.documentRefs) item.documentRefs = dto.documentRefs;
    if (dto.metadata) item.metadata = dto.metadata;
    item.updatedAt = new Date();
    return this.repo.save(item);
  }

  async waive(ctx: SubjectivityContext, subjectivityId: string, dto: any): Promise<Subjectivity> {
    if (!ctx.roles.includes('insurer_admin') && !ctx.roles.includes('head_office_ops')) {
      throw new BadRequestException('Only admin can waive subjectivities');
    }
    const item = await this.get(ctx, subjectivityId);
    item.status = 'waived';
    item.waivedAt = new Date();
    item.waivedBy = ctx.userId;
    if (dto.metadata) item.metadata = dto.metadata;
    item.updatedAt = new Date();
    return this.repo.save(item);
  }

  async create(ctx: SubjectivityContext, dto: any): Promise<Subjectivity> {
    const item = this.repo.create({
      subjectivityId: uuidv4(),
      tenantId: ctx.tenantId,
      placementId: dto.placementId || null,
      submissionId: dto.submissionId,
      kind: dto.kind,
      description: dto.description,
      requiredBy: dto.requiredBy,
      status: 'pending',
      metadata: dto.metadata || null,
    });
    return this.repo.save(item);
  }
}
