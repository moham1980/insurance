import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Placement } from '../entities/Placement';
import { QuoteResponse } from '../entities/QuoteResponse';
import { Submission } from '../entities/Submission';
import { OutboxPublisher } from '@insurance/shared';

export interface PlacementContext {
  tenantId: string;
  userId: string;
  roles: string[];
  correlationId: string;
  authHeader?: string;
}

@Injectable()
export class PlacementService {
  constructor(
    @InjectRepository(Placement)
    private readonly placementRepo: Repository<Placement>,
    @InjectRepository(QuoteResponse)
    private readonly quoteResponseRepo: Repository<QuoteResponse>,
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    private readonly dataSource: DataSource,
  ) {}

  async create(ctx: PlacementContext, quoteResponseId: string, idempotencyKey?: string): Promise<Placement> {
    const quoteResponse = await this.quoteResponseRepo.findOne({ where: { quoteResponseId, tenantId: ctx.tenantId } });
    if (!quoteResponse) throw new NotFoundException('Quote response not found');
    if (!quoteResponse.isSelected) throw new BadRequestException('Quote response not selected');

    const submission = await this.submissionRepo.findOne({ where: { submissionId: quoteResponse.submissionId, tenantId: ctx.tenantId } });
    if (!submission) throw new NotFoundException('Submission not found');

    const existing = idempotencyKey ? await this.placementRepo.findOne({ where: { idempotencyKey } }) : null;
    if (existing) return existing;

    const placement = this.placementRepo.create({
      placementId: uuidv4(),
      tenantId: ctx.tenantId,
      submissionId: quoteResponse.submissionId,
      quoteRequestId: quoteResponse.quoteRequestId,
      quoteResponseId,
      carrierOrganizationId: quoteResponse.carrierOrganizationId,
      brokerOrganizationId: submission.brokerOrganizationId,
      brokerLicenseId: submission.brokerLicenseId,
      status: 'draft',
      bindSagaState: 'not_started',
      subjectivitiesStatus: 'pending',
      effectiveFrom: submission.effectiveFrom,
      effectiveTo: submission.effectiveTo,
      idempotencyKey: idempotencyKey || null,
      createdBy: ctx.userId,
    });

    const saved = await this.placementRepo.save(placement);
    submission.status = 'selected';
    submission.updatedAt = new Date();
    await this.submissionRepo.save(submission);
    return saved;
  }

  async get(ctx: PlacementContext, placementId: string): Promise<Placement> {
    const placement = await this.placementRepo.findOne({ where: { placementId, tenantId: ctx.tenantId } });
    if (!placement) throw new NotFoundException('Placement not found');
    return placement;
  }

  async list(ctx: PlacementContext, filters?: any): Promise<Placement[]> {
    const where: any = { tenantId: ctx.tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.submissionId) where.submissionId = filters.submissionId;
    return this.placementRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async selectQuote(ctx: PlacementContext, quoteResponseId: string): Promise<QuoteResponse> {
    const quoteResponse = await this.quoteResponseRepo.findOne({ where: { quoteResponseId, tenantId: ctx.tenantId } });
    if (!quoteResponse) throw new NotFoundException('Quote response not found');

    if (quoteResponse.expiresAt && new Date(quoteResponse.expiresAt) < new Date()) {
      throw new BadRequestException('Quote response has expired and cannot be selected');
    }

    const others = await this.quoteResponseRepo.find({ where: { quoteRequestId: quoteResponse.quoteRequestId, tenantId: ctx.tenantId } });
    for (const r of others) {
      r.isSelected = r.quoteResponseId === quoteResponseId;
      r.selectedAt = r.isSelected ? new Date() : null;
      r.updatedAt = new Date();
      await this.quoteResponseRepo.save(r);
    }

    const outbox = new OutboxPublisher(this.dataSource.manager);
    await outbox.publish({
      topic: 'insurance.quote.events',
      eventType: 'QuoteSelected.v1',
      eventVersion: 1,
      correlationId: ctx.correlationId,
      tenantId: ctx.tenantId,
      subject: { type: 'QuoteResponse', id: quoteResponseId },
      producer: 'submission-placement',
      payload: {
        tenantId: ctx.tenantId,
        quoteResponseId,
        quoteRequestId: quoteResponse.quoteRequestId,
        submissionId: quoteResponse.submissionId,
        carrierOrganizationId: quoteResponse.carrierOrganizationId,
        selectedAt: new Date().toISOString(),
      },
    });

    return quoteResponse;
  }
}
