import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Submission } from './entities/Submission';
import { DocumentRef } from './entities/DocumentRef';
import { OutboxPublisher } from '@insurance/shared';
import { ProductServiceClient } from './clients/product-service.client';
import { SalesNetworkServiceClient } from './clients/sales-network-service.client';
import { AuditPersistenceService } from '@insurance/shared';

export interface SubmissionContext {
  tenantId: string;
  userId: string;
  roles: string[];
  organizationId?: string;
  correlationId: string;
}

function assertTenant(ctx: SubmissionContext, tenantId: string, roles?: string[]) {
  const rs = roles || ctx.roles;
  if (ctx.tenantId !== tenantId && !rs.includes('insurer_admin')) {
    throw new ForbiddenException('Cross-tenant access denied');
  }
}

@Injectable()
export class SubmissionService {
  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(DocumentRef)
    private readonly documentRepo: Repository<DocumentRef>,
    private readonly dataSource: DataSource,
    private readonly productClient: ProductServiceClient,
    private readonly salesClient: SalesNetworkServiceClient,
    private readonly audit: AuditPersistenceService,
  ) {}

  async create(ctx: SubmissionContext, dto: any, idempotencyKey?: string): Promise<Submission> {
    assertTenant(ctx, dto.tenantId);
    if (!dto.productId || !dto.partyId || !dto.brokerOrganizationId || !dto.effectiveFrom || !dto.effectiveTo) {
      throw new BadRequestException('Missing required fields');
    }
    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = new Date(dto.effectiveTo);
    if (effectiveTo <= effectiveFrom) {
      throw new BadRequestException('effectiveTo must be after effectiveFrom');
    }

    const existing = idempotencyKey
      ? await this.submissionRepo.findOne({ where: { idempotencyKey } })
      : null;
    if (existing) return existing;

    const product = await this.productClient.getProductVersion(dto.tenantId, dto.productId, dto.productVersion, undefined);
    if (!product) {
      throw new BadRequestException('Product version not found');
    }

    // Validate product visibility for the broker organization
    if (dto.brokerOrganizationId) {
      const visibility = await this.productClient.checkProductVisibility(
        dto.tenantId,
        dto.productId,
        dto.productVersion || product.version || 1,
        dto.brokerOrganizationId,
        undefined,
      );
      if (!visibility.visible) {
        throw new BadRequestException(`Product visibility check failed: ${visibility.reason || 'Product is not visible to this broker organization'}`);
      }
    }

    const submission = this.submissionRepo.create({
      submissionId: uuidv4(),
      tenantId: dto.tenantId,
      brokerTenantId: dto.brokerTenantId || null,
      brokerOrganizationId: dto.brokerOrganizationId,
      brokerLicenseId: dto.brokerLicenseId || null,
      partyId: dto.partyId,
      productId: dto.productId,
      productVersion: dto.productVersion || product.version || 1,
      lineOfBusiness: dto.lineOfBusiness || product.lineOfBusiness,
      status: 'draft',
      exposure: dto.exposure || {},
      requestedDeductibles: dto.requestedDeductibles || null,
      documents: dto.documents || null,
      effectiveFrom,
      effectiveTo,
      territory: dto.territory || null,
      distributionAgreementId: dto.distributionAgreementId || null,
      metadata: dto.metadata || null,
      idempotencyKey: idempotencyKey || null,
      createdBy: ctx.userId,
    });

    return await this.dataSource.manager.transaction(async (manager) => {
      const saved = await manager.save(submission);

      if (product.requiredDocuments) {
        for (const doc of product.requiredDocuments) {
          const ref = manager.create(DocumentRef, {
            documentId: uuidv4(),
            tenantId: dto.tenantId,
            submissionId: saved.submissionId,
            documentType: doc.type || doc.documentType || 'required',
            status: 'required',
            storageRef: null,
            metadata: doc,
          });
          await manager.save(ref);
        }
      }

      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.submission.events',
        eventType: 'SubmissionCreated.v1',
        eventVersion: 1,
        correlationId: ctx.correlationId,
        tenantId: dto.tenantId,
        subject: { type: 'Submission', id: saved.submissionId },
        producer: 'submission-placement',
        payload: {
          tenantId: saved.tenantId,
          submissionId: saved.submissionId,
          brokerOrganizationId: saved.brokerOrganizationId,
          partyId: saved.partyId,
          productId: saved.productId,
          productVersion: saved.productVersion,
          lineOfBusiness: saved.lineOfBusiness,
          status: saved.status,
          createdAt: saved.createdAt.toISOString(),
        },
      });

      await this.audit.record({
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        action: 'create',
        resourceType: 'submission',
        resourceId: saved.submissionId,
        correlationId: ctx.correlationId,
        after: { submissionId: saved.submissionId, status: saved.status, productId: saved.productId },
      });

      return saved;
    });
  }

  async get(ctx: SubmissionContext, submissionId: string): Promise<Submission> {
    const submission = await this.submissionRepo.findOne({ where: { submissionId } });
    if (!submission) throw new NotFoundException('Submission not found');
    assertTenant(ctx, submission.tenantId);
    return submission;
  }

  async list(ctx: SubmissionContext, filters?: any): Promise<Submission[]> {
    const where: any = { tenantId: ctx.tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.productId) where.productId = filters.productId;
    if (filters?.partyId) where.partyId = filters.partyId;
    if (filters?.brokerOrganizationId) where.brokerOrganizationId = filters.brokerOrganizationId;
    return this.submissionRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async patch(ctx: SubmissionContext, submissionId: string, dto: any): Promise<Submission> {
    const submission = await this.get(ctx, submissionId);
    if (submission.status !== 'draft' && submission.status !== 'submitted') {
      throw new BadRequestException('Submission can only be updated in draft or submitted state');
    }
    const isDraft = submission.status === 'draft';
    if (isDraft) {
      if (dto.exposure !== undefined) submission.exposure = dto.exposure;
      if (dto.requestedDeductibles !== undefined) submission.requestedDeductibles = dto.requestedDeductibles;
      if (dto.territory !== undefined) submission.territory = dto.territory;
      if (dto.metadata !== undefined) submission.metadata = dto.metadata;
      if (dto.distributionAgreementId !== undefined) submission.distributionAgreementId = dto.distributionAgreementId;
      if (dto.effectiveFrom !== undefined) submission.effectiveFrom = new Date(dto.effectiveFrom);
      if (dto.effectiveTo !== undefined) submission.effectiveTo = new Date(dto.effectiveTo);
    }
    if (dto.documents !== undefined) submission.documents = dto.documents;
    submission.updatedAt = new Date();
    const saved = await this.submissionRepo.save(submission);
    await this.audit.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'update',
      resourceType: 'submission',
      resourceId: saved.submissionId,
      correlationId: ctx.correlationId,
      after: { status: saved.status, exposure: saved.exposure },
    });
    return saved;
  }

  async submit(ctx: SubmissionContext, submissionId: string): Promise<Submission> {
    const submission = await this.get(ctx, submissionId);
    if (submission.status !== 'draft') {
      throw new BadRequestException('Only draft submissions can be submitted');
    }
    if (submission.distributionAgreementId) {
      const eligibility = await this.salesClient.checkEligibility(
        ctx.tenantId,
        submission.distributionAgreementId,
        submission.lineOfBusiness,
        undefined,
      );
      if (!eligibility?.eligible) {
        throw new BadRequestException('Distribution agreement is not eligible for this line of business');
      }
    }
    submission.status = 'submitted';
    submission.updatedAt = new Date();
    const saved = await this.submissionRepo.save(submission);

    const outbox = new OutboxPublisher(this.dataSource.manager);
    await outbox.publish({
      topic: 'insurance.submission.events',
      eventType: 'SubmissionSubmitted.v1',
      eventVersion: 1,
      correlationId: ctx.correlationId,
      tenantId: ctx.tenantId,
      subject: { type: 'Submission', id: saved.submissionId },
      producer: 'submission-placement',
      payload: {
        tenantId: saved.tenantId,
        submissionId: saved.submissionId,
        status: saved.status,
        submittedAt: new Date().toISOString(),
      },
    });

    await this.audit.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'update',
      resourceType: 'submission',
      resourceId: saved.submissionId,
      correlationId: ctx.correlationId,
      before: { status: 'draft' },
      after: { status: 'submitted' },
    });

    return saved;
  }

  async expire(ctx: SubmissionContext, submissionId: string): Promise<Submission> {
    const submission = await this.get(ctx, submissionId);
    if (!['submitted', 'rfq_in_progress', 'quoted', 'selected'].includes(submission.status)) {
      throw new BadRequestException('Submission state cannot be expired');
    }
    const previousStatus = submission.status;
    submission.status = 'quote_expired';
    submission.updatedAt = new Date();
    const saved = await this.submissionRepo.save(submission);

    const outbox = new OutboxPublisher(this.dataSource.manager);
    await outbox.publish({
      topic: 'insurance.quote.events',
      eventType: 'QuoteExpired.v1',
      eventVersion: 1,
      correlationId: ctx.correlationId,
      tenantId: ctx.tenantId,
      subject: { type: 'Submission', id: saved.submissionId },
      producer: 'submission-placement',
      payload: {
        tenantId: saved.tenantId,
        submissionId: saved.submissionId,
        previousStatus,
        expiredAt: new Date().toISOString(),
      },
    });

    await this.audit.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'update',
      resourceType: 'submission',
      resourceId: saved.submissionId,
      correlationId: ctx.correlationId,
      before: { status: previousStatus },
      after: { status: 'quote_expired' },
    });
    return saved;
  }
}
