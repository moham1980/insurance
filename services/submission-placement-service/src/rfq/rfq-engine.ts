import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Submission } from '../entities/Submission';
import { QuoteRequest, QuoteRequestStatus } from '../entities/QuoteRequest';
import { QuoteResponse } from '../entities/QuoteResponse';
import { QuoteDispatcher } from './quote-dispatcher';
import { AmlCheckService } from './aml-check.service';
import { UnderwritingReferral } from './underwriting-referral';
import { OutboxPublisher } from '@insurance/shared';
import { AuditPersistenceService } from '@insurance/shared';
import { Subjectivity } from '../entities/Subjectivity';

export interface RfqContext {
  tenantId: string;
  userId: string;
  roles: string[];
  correlationId: string;
  authHeader?: string;
}

@Injectable()
export class RfqEngine {
  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(QuoteRequest)
    private readonly quoteRequestRepo: Repository<QuoteRequest>,
    @InjectRepository(QuoteResponse)
    private readonly quoteResponseRepo: Repository<QuoteResponse>,
    @InjectRepository(Subjectivity)
    private readonly subjectivityRepo: Repository<Subjectivity>,
    private readonly dataSource: DataSource,
    private readonly dispatcher: QuoteDispatcher,
    private readonly aml: AmlCheckService,
    private readonly uw: UnderwritingReferral,
    private readonly audit: AuditPersistenceService,
  ) {}

  async createRequest(ctx: RfqContext, submissionId: string, dto: any): Promise<QuoteRequest> {
    const submission = await this.submissionRepo.findOne({ where: { submissionId } });
    if (!submission) throw new NotFoundException('Submission not found');
    if (ctx.tenantId !== submission.tenantId) throw new BadRequestException('Cross-tenant access denied');
    if (!['submitted', 'rfq_in_progress'].includes(submission.status)) {
      throw new BadRequestException('Submission is not in a valid state for RFQ');
    }

    const carriers: string[] = dto.carriers || [submission.distributionAgreementId ? submission.tenantId : ctx.tenantId];
    if (!carriers.length) throw new BadRequestException('No carriers specified');

    const amlResult = await this.aml.check(ctx.tenantId, submission.partyId, submission.exposure, ctx.authHeader);
    const uwResult = await this.uw.evaluate(ctx.tenantId, {
      submissionId,
      productId: submission.productId,
      lineOfBusiness: submission.lineOfBusiness,
      exposure: submission.exposure,
    }, ctx.authHeader);

    let expiresAt: Date;
    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt);
    } else {
      expiresAt = new Date(Date.now() + (dto.timeoutMs || 30 * 60 * 1000));
    }

    const quoteRequestId = uuidv4();
    const quoteRequest = this.quoteRequestRepo.create({
      quoteRequestId,
      tenantId: ctx.tenantId,
      submissionId,
      correlationId: ctx.correlationId,
      status: 'in_progress',
      requestedAt: new Date(),
      expiresAt,
      quoteCount: 0,
      carriersRequested: carriers,
      carriersResponded: [],
      timeoutMs: dto.timeoutMs || 30000,
      subjectivitiesSnapshot: dto.subjectivities || null,
      amlSnapshot: amlResult,
      underwritingSnapshot: uwResult,
      selectionCriteria: dto.selectionCriteria || null,
      createdBy: ctx.userId,
    });

    await this.dataSource.manager.transaction(async (manager) => {
      submission.status = 'rfq_in_progress';
      submission.updatedAt = new Date();
      await manager.save(submission);
      await manager.save(quoteRequest);

      if (amlResult.passed === false) {
        const subj = manager.create(Subjectivity, {
          subjectivityId: uuidv4(),
          tenantId: ctx.tenantId,
          submissionId,
          kind: 'underwriting',
          description: 'AML subjectivity: ' + (amlResult.reasons?.join(', ') || 'aml_failed'),
          requiredBy: 'regulator',
          status: 'pending',
          metadata: { amlResult },
        });
        await manager.save(subj);
      }

      if (uwResult.referralRequired) {
        const subj = manager.create(Subjectivity, {
          subjectivityId: uuidv4(),
          tenantId: ctx.tenantId,
          submissionId,
          kind: 'underwriting',
          description: 'Underwriting referral required: ' + (uwResult.notes?.join(', ') || ''),
          requiredBy: 'carrier',
          status: 'pending',
          metadata: { uwResult },
        });
        await manager.save(subj);
      }

      if (amlResult.passed === false || uwResult.referralRequired) {
        const refOutbox = new OutboxPublisher(manager);
        await refOutbox.publish({
          topic: 'insurance.underwriting.events',
          eventType: 'RiskReferred.v1',
          eventVersion: 1,
          correlationId: ctx.correlationId,
          tenantId: ctx.tenantId,
          subject: { type: 'Submission', id: submissionId },
          producer: 'submission-placement',
          payload: {
            tenantId: ctx.tenantId,
            submissionId,
            quoteRequestId,
            amlPassed: amlResult.passed,
            amlReasons: amlResult.reasons || [],
            referralRequired: uwResult.referralRequired,
            uwNotes: uwResult.notes || [],
            referredAt: new Date().toISOString(),
          },
        });
      }

      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.quote.events',
        eventType: 'QuoteRequested.v1',
        eventVersion: 1,
        correlationId: ctx.correlationId,
        tenantId: ctx.tenantId,
        subject: { type: 'QuoteRequest', id: quoteRequestId },
        producer: 'submission-placement',
        payload: {
          tenantId: ctx.tenantId,
          quoteRequestId,
          submissionId,
          carriersRequested: carriers,
          requestedAt: quoteRequest.requestedAt.toISOString(),
          expiresAt: quoteRequest.expiresAt?.toISOString(),
          amlPassed: amlResult.passed,
          referralRequired: uwResult.referralRequired,
        },
      });
    });

    this.dispatchAsync(ctx, quoteRequest, submission, carriers);

    await this.audit.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'create',
      resourceType: 'quote_request',
      resourceId: quoteRequestId,
      correlationId: ctx.correlationId,
      after: { submissionId, carriersRequested: carriers, status: 'in_progress' },
    });

    return quoteRequest;
  }

  private async dispatchAsync(ctx: RfqContext, quoteRequest: QuoteRequest, submission: Submission, carriers: string[]): Promise<void> {
    const payload = {
      submissionId: quoteRequest.submissionId,
      quoteRequestId: quoteRequest.quoteRequestId,
      tenantId: ctx.tenantId,
      carrierOrganizationId: '',
      productId: submission.productId,
      productVersion: submission.productVersion,
      lineOfBusiness: submission.lineOfBusiness,
      exposure: submission.exposure,
      requestedDeductibles: submission.requestedDeductibles || undefined,
      effectiveFrom: submission.effectiveFrom,
      effectiveTo: submission.effectiveTo,
      territory: submission.territory,
      correlationId: ctx.correlationId,
    };

    const responses = await Promise.all(
      carriers.map((carrierId) =>
        this.dispatcher.dispatchToCarrier({ ...payload, carrierOrganizationId: carrierId }, { carrierOrganizationId: carrierId }),
      ),
    );

    let quoteCount = 0;
    let respondedCarriers: string[] = [];

    await this.dataSource.manager.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      for (const r of responses) {
        if (r.status === 'received' || r.status === 'pending') {
          const quoteResponse = manager.create(QuoteResponse, {
            quoteResponseId: uuidv4(),
            tenantId: ctx.tenantId,
            quoteRequestId: quoteRequest.quoteRequestId,
            submissionId: quoteRequest.submissionId,
            carrierOrganizationId: r.carrierOrganizationId,
            status: r.status,
            receivedAt: new Date(),
            expiresAt: r.expiresAt || null,
            premiumAmountMinor: r.premiumAmountMinor,
            premiumCurrency: r.premiumCurrency,
            basePremiumMinor: r.basePremiumMinor || null,
            taxesMinor: r.taxesMinor || null,
            feesMinor: r.feesMinor || null,
            deductibleAmountMinor: r.deductibleAmountMinor || null,
            coverageSnapshot: r.coverageSnapshot || null,
            quoteSnapshot: r.quoteSnapshot || {},
            comparisonFactors: r.comparisonFactors || null,
            commissionRateBps: r.commissionRateBps || null,
            commissionAmountMinor: r.commissionAmountMinor || null,
            markupAmountMinor: r.markupAmountMinor || '0',
          });
          await manager.save(quoteResponse);
          quoteCount++;
          respondedCarriers.push(r.carrierOrganizationId);
          await outbox.publish({
            topic: 'insurance.quote.events',
            eventType: 'CarrierQuoteReceived.v1',
            eventVersion: 1,
            correlationId: ctx.correlationId,
            tenantId: ctx.tenantId,
            subject: { type: 'QuoteResponse', id: quoteResponse.quoteResponseId },
            producer: 'submission-placement',
            payload: {
              quoteResponseId: quoteResponse.quoteResponseId,
              quoteRequestId: quoteRequest.quoteRequestId,
              submissionId: quoteRequest.submissionId,
              carrierOrganizationId: r.carrierOrganizationId,
              premiumAmountMinor: r.premiumAmountMinor,
              premiumCurrency: r.premiumCurrency,
              status: r.status,
              receivedAt: new Date().toISOString(),
            },
          });
        }
      }

      const quoteRequestRecord = await manager.findOne(QuoteRequest, { where: { quoteRequestId: quoteRequest.quoteRequestId } });
      if (quoteRequestRecord) {
        quoteRequestRecord.quoteCount = quoteCount;
        quoteRequestRecord.carriersResponded = Array.from(new Set([...quoteRequestRecord.carriersResponded, ...respondedCarriers]));
        let status: QuoteRequestStatus = 'completed';
        if (quoteCount === 0) status = 'partial';
        else if (respondedCarriers.length < carriers.length) status = 'partial';
        if (quoteRequestRecord.amlSnapshot && (quoteRequestRecord.amlSnapshot as any).passed === false) status = 'referred';
        if (quoteRequestRecord.underwritingSnapshot && (quoteRequestRecord.underwritingSnapshot as any).referralRequired) status = 'referred';
        quoteRequestRecord.status = status;
        quoteRequestRecord.updatedAt = new Date();
        await manager.save(quoteRequestRecord);
      }
    });
  }

  async getRequest(ctx: RfqContext, quoteRequestId: string): Promise<QuoteRequest> {
    const req = await this.quoteRequestRepo.findOne({ where: { quoteRequestId } });
    if (!req) throw new NotFoundException('Quote request not found');
    if (ctx.tenantId !== req.tenantId) throw new BadRequestException('Cross-tenant access denied');
    return req;
  }

  async listRequests(ctx: RfqContext, filters?: any): Promise<QuoteRequest[]> {
    await this.expireStaleQuotes(ctx.tenantId);

    const where: any = { tenantId: ctx.tenantId };
    if (filters?.submissionId) where.submissionId = filters.submissionId;
    if (filters?.status) where.status = filters.status;
    return this.quoteRequestRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async expireStaleQuotes(tenantId: string): Promise<number> {
    const now = new Date();
    const stale = await this.quoteResponseRepo
      .createQueryBuilder('qr')
      .where('qr.tenant_id = :tenantId', { tenantId })
      .andWhere('qr.status IN (:...statuses)', { statuses: ['pending', 'received'] })
      .andWhere('qr.expires_at IS NOT NULL')
      .andWhere('qr.expires_at < :now', { now })
      .getMany();

    if (stale.length === 0) return 0;

    for (const qr of stale) {
      qr.status = 'expired';
    }
    await this.quoteResponseRepo.save(stale);

    const outbox = new OutboxPublisher(this.dataSource.manager);
    for (const qr of stale) {
      await outbox.publish({
        topic: 'insurance.quote.events',
        eventType: 'QuoteResponseExpired.v1',
        eventVersion: 1,
        correlationId: qr.quoteResponseId,
        tenantId,
        subject: { type: 'QuoteResponse', id: qr.quoteResponseId },
        producer: 'submission-placement',
        payload: {
          tenantId,
          quoteResponseId: qr.quoteResponseId,
          quoteRequestId: qr.quoteRequestId,
          submissionId: qr.submissionId,
          carrierOrganizationId: qr.carrierOrganizationId,
          expiredAt: now.toISOString(),
        },
      });
    }

    return stale.length;
  }
}
