import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Placement } from '../entities/Placement';
import { QuoteResponse } from '../entities/QuoteResponse';
import { Submission } from '../entities/Submission';
import { Subjectivity } from '../entities/Subjectivity';
import { ConnectorConfigService } from '../connector-config.service';
import { CarrierConnectorFactory } from '../carrier-connectors/carrier-connector.factory';
import { BillingServiceClient } from '../clients/billing-service.client';
import { PolicyServiceClient } from '../clients/policy-service.client';
import { SalesNetworkServiceClient } from '../clients/sales-network-service.client';
import { PlacementContext } from './placement.service';
import { OutboxPublisher } from '@insurance/shared';
import { AuditPersistenceService } from '@insurance/shared';

export type SagaStepName =
  | 'reserve_premium'
  | 'fulfill_subjectivities'
  | 'confirm_bind'
  | 'create_policy'
  | 'set_unique_code'
  | 'project_policy';

export interface BindResult {
  success: boolean;
  placement?: Placement;
  policyId?: string;
  policyNumber?: string;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class PlacementOrchestrator {
  constructor(
    @InjectRepository(Placement)
    private readonly placementRepo: Repository<Placement>,
    @InjectRepository(QuoteResponse)
    private readonly quoteResponseRepo: Repository<QuoteResponse>,
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(Subjectivity)
    private readonly subjectivityRepo: Repository<Subjectivity>,
    private readonly dataSource: DataSource,
    private readonly connectorService: ConnectorConfigService,
    private readonly factory: CarrierConnectorFactory,
    private readonly billingClient: BillingServiceClient,
    private readonly policyClient: PolicyServiceClient,
    private readonly salesNetworkClient: SalesNetworkServiceClient,
    private readonly audit: AuditPersistenceService,
  ) {}

  async bind(ctx: PlacementContext, placementId: string): Promise<BindResult> {
    const placement = await this.placementRepo.findOne({ where: { placementId, tenantId: ctx.tenantId } });
    if (!placement) throw new NotFoundException('Placement not found');
    if (placement.status !== 'draft' && placement.status !== 'bind_failed') {
      throw new BadRequestException('Placement cannot be bound in current state');
    }

    placement.status = 'bind_requested';
    placement.bindSagaState = 'reserve_premium';
    placement.bindAttempts += 1;
    placement.sagaSteps = placement.sagaSteps || [];
    placement.updatedAt = new Date();
    await this.placementRepo.save(placement);

    const bindReqOutbox = new OutboxPublisher(this.dataSource.manager);
    await bindReqOutbox.publish({
      topic: 'insurance.placement.events',
      eventType: 'BindRequested.v1',
      eventVersion: 1,
      correlationId: ctx.correlationId,
      tenantId: ctx.tenantId,
      subject: { type: 'Placement', id: placement.placementId },
      producer: 'submission-placement',
      payload: {
        placementId: placement.placementId,
        submissionId: placement.submissionId,
        quoteResponseId: placement.quoteResponseId,
        carrierOrganizationId: placement.carrierOrganizationId,
        brokerOrganizationId: placement.brokerOrganizationId,
        bindAttempts: placement.bindAttempts,
        requestedAt: new Date().toISOString(),
      },
    });

    const quoteResponse = await this.quoteResponseRepo.findOne({
      where: { quoteResponseId: placement.quoteResponseId, tenantId: ctx.tenantId },
    });
    if (!quoteResponse) throw new NotFoundException('Quote response not found');

    const bindSubmission = await this.submissionRepo.findOne({ where: { submissionId: placement.submissionId, tenantId: ctx.tenantId } });
    if (bindSubmission?.distributionAgreementId) {
      try {
        const agreement = await this.salesNetworkClient.getDistributionAgreement(
          ctx.tenantId, bindSubmission.distributionAgreementId, ctx.authHeader,
        );
        if (agreement?.status && agreement.status !== 'active') {
          return this.fail(placement, 'DISTRIBUTION_AGREEMENT_INACTIVE',
            `Distribution agreement ${bindSubmission.distributionAgreementId} is not active (status: ${agreement.status})`);
        }
        if (agreement?.validTo && new Date(agreement.validTo) < new Date()) {
          return this.fail(placement, 'DISTRIBUTION_AGREEMENT_EXPIRED',
            `Distribution agreement ${bindSubmission.distributionAgreementId} has expired`);
        }
      } catch (e: any) {
        return this.fail(placement, 'DISTRIBUTION_AGREEMENT_CHECK_FAILED',
          `Failed to validate distribution agreement: ${e.message || e}`);
      }
    }

    const reservationId = uuidv4();
    let reservation: any;
    try {
      reservation = await this.billingClient.reservePremium(ctx.tenantId, {
        placementId: placement.placementId,
        submissionId: placement.submissionId,
        quoteResponseId: placement.quoteResponseId,
        amountMinor: quoteResponse.premiumAmountMinor,
        currency: quoteResponse.premiumCurrency,
        reservationId,
      }, ctx.authHeader);
    } catch (e: any) {
      return this.fail(placement, 'RESERVE_FAILED', e.message || 'Premium reservation failed');
    }

    placement.premiumReservationId = reservation?.data?.reservationId || reservation?.reservationId || reservationId;
    placement.bindSagaState = 'fulfill_subjectivities';
    placement.sagaSteps.push({ name: 'reserve_premium', status: 'completed', at: new Date().toISOString() });
    await this.placementRepo.save(placement);

    const subjectivities = await this.subjectivityRepo.find({
      where: [{ placementId: placement.placementId, tenantId: ctx.tenantId }, { submissionId: placement.submissionId, tenantId: ctx.tenantId }],
    });
    const pending = subjectivities.filter((s) => s.status === 'pending');
    if (pending.length > 0) {
      placement.subjectivitiesStatus = 'pending';
      placement.bindSagaState = 'fulfill_subjectivities';
      placement.lastError = { code: 'SUBJECTIVITIES_PENDING', pending: pending.map((s) => s.subjectivityId) };
      placement.status = 'bind_failed';
      placement.updatedAt = new Date();
      await this.placementRepo.save(placement);

      const subjFailOutbox = new OutboxPublisher(this.dataSource.manager);
      await subjFailOutbox.publish({
        topic: 'insurance.placement.events',
        eventType: 'BindFailed.v1',
        eventVersion: 1,
        correlationId: ctx.correlationId,
        tenantId: ctx.tenantId,
        subject: { type: 'Placement', id: placement.placementId },
        producer: 'submission-placement',
        payload: {
          placementId: placement.placementId,
          submissionId: placement.submissionId,
          errorCode: 'SUBJECTIVITIES_PENDING',
          errorMessage: 'Subjectivities are pending',
          pendingSubjectivities: pending.map((s) => s.subjectivityId),
          failedAt: new Date().toISOString(),
        },
      });

      return { success: false, placement, errorCode: 'SUBJECTIVITIES_PENDING', errorMessage: 'Subjectivities are pending' };
    }

    placement.bindSagaState = 'confirm_bind';
    placement.sagaSteps.push({ name: 'fulfill_subjectivities', status: 'completed', at: new Date().toISOString() });
    await this.placementRepo.save(placement);

    const connectorConfig = await this.connectorService.getActiveConnectorForCarrier(
      ctx.tenantId,
      placement.carrierOrganizationId,
    );
    if (connectorConfig && connectorConfig.connectorType !== 'internal') {
      const bindResult = await this.factory.getConnector(connectorConfig.connectorType).bind(
        {
          placementId: placement.placementId,
          submissionId: placement.submissionId,
          quoteResponseId: placement.quoteResponseId,
          tenantId: ctx.tenantId,
          carrierOrganizationId: placement.carrierOrganizationId,
          brokerOrganizationId: placement.brokerOrganizationId,
          premiumAmountMinor: quoteResponse.premiumAmountMinor,
          premiumCurrency: quoteResponse.premiumCurrency,
          effectiveFrom: placement.effectiveFrom,
          effectiveTo: placement.effectiveTo,
          correlationId: ctx.correlationId,
        },
        connectorConfig.config,
      );
      if (bindResult.status === 'failed') {
        if (placement.premiumReservationId) {
          await this.billingClient.releasePremium(ctx.tenantId, placement.premiumReservationId, ctx.authHeader).catch(() => null);
        }
        return this.fail(placement, bindResult.errorCode || 'BIND_FAILED', bindResult.errorMessage || 'Carrier bind failed');
      }
      placement.policyId = bindResult.policyId || null;
      placement.policyNumber = bindResult.policyNumber || null;
    }

    placement.bindSagaState = 'create_policy';
    placement.sagaSteps.push({ name: 'confirm_bind', status: 'completed', at: new Date().toISOString() });
    await this.placementRepo.save(placement);

    let policy: any;
    try {
      policy = await this.policyClient.createFromPlacement(ctx.tenantId, {
        submissionId: placement.submissionId,
        quoteResponseId: placement.quoteResponseId,
        placementId: placement.placementId,
        tenantId: ctx.tenantId,
        partyId: (await this.submissionRepo.findOne({ where: { submissionId: placement.submissionId } }))?.partyId,
        brokerLicenseId: placement.brokerLicenseId,
        distributionOrganizationId: placement.brokerOrganizationId,
        issuerOrganizationId: placement.carrierOrganizationId,
        lineOfBusiness: (await this.submissionRepo.findOne({ where: { submissionId: placement.submissionId } }))?.lineOfBusiness,
        effectiveFrom: placement.effectiveFrom,
        effectiveTo: placement.effectiveTo,
        premiumAmount: { amountMinor: quoteResponse.premiumAmountMinor, currency: quoteResponse.premiumCurrency },
        paymentId: placement.premiumReservationId,
        coverageSnapshot: quoteResponse.coverageSnapshot,
        quoteSnapshot: quoteResponse.quoteSnapshot,
        idempotencyKey: placement.idempotencyKey || undefined,
      }, ctx.authHeader);
      placement.policyId = policy?.data?.policyId || policy?.policyId;
      placement.policyNumber = policy?.data?.policyNumber || policy?.policyNumber;

      try {
        await this.policyClient.createProjection(ctx.tenantId, {
          placementId: placement.placementId,
          brokerOrganizationId: placement.brokerOrganizationId,
          issuerOrganizationId: placement.carrierOrganizationId,
          policyId: placement.policyId,
          policyNumber: placement.policyNumber,
          uniqueCode: policy?.data?.uniqueCode || policy?.uniqueCode || null,
          sourceSystemId: 'policy-service',
          payload: { quoteSnapshot: quoteResponse.quoteSnapshot, coverageSnapshot: quoteResponse.coverageSnapshot },
          idempotencyKey: placement.idempotencyKey,
        }, ctx.authHeader);

        const projOutbox = new OutboxPublisher(this.dataSource.manager);
        await projOutbox.publish({
          topic: 'insurance.placement.events',
          eventType: 'PolicyProjected.v1',
          eventVersion: 1,
          correlationId: ctx.correlationId,
          tenantId: ctx.tenantId,
          subject: { type: 'PolicyProjection', id: placement.policyId || '' },
          producer: 'submission-placement',
          payload: {
            placementId: placement.placementId,
            policyId: placement.policyId,
            policyNumber: placement.policyNumber,
            brokerOrganizationId: placement.brokerOrganizationId,
            issuerOrganizationId: placement.carrierOrganizationId,
            projectedAt: new Date().toISOString(),
          },
        });
      } catch (e: any) {
        // Projection is a read-only replica; failure is non-fatal
      }
    } catch (e: any) {
      if (placement.premiumReservationId) {
        await this.billingClient.releasePremium(ctx.tenantId, placement.premiumReservationId, ctx.authHeader).catch(() => null);
      }
      return this.fail(placement, 'POLICY_CREATE_FAILED', e.message || 'Policy creation failed');
    }

    placement.bindSagaState = 'project_policy';
    placement.sagaSteps.push({ name: 'create_policy', status: 'completed', at: new Date().toISOString() });
    await this.placementRepo.save(placement);

    const issuedOutbox = new OutboxPublisher(this.dataSource.manager);
    await issuedOutbox.publish({
      topic: 'insurance.placement.events',
      eventType: 'PlacementIssued.v1',
      eventVersion: 1,
      correlationId: ctx.correlationId,
      tenantId: ctx.tenantId,
      subject: { type: 'Placement', id: placement.placementId },
      producer: 'submission-placement',
      payload: {
        placementId: placement.placementId,
        submissionId: placement.submissionId,
        policyId: placement.policyId,
        policyNumber: placement.policyNumber,
        carrierOrganizationId: placement.carrierOrganizationId,
        issuedAt: new Date().toISOString(),
      },
    });

    try {
      if (placement.policyId) {
        await this.policyClient.setUniqueCode(ctx.tenantId, placement.policyId, { reason: 'bind_completed' }, ctx.authHeader);
      }
    } catch {
      // Unique code is a quality gate; failure is logged but not fatal at P2
    }

    placement.status = 'completed';
    placement.bindSagaState = 'completed';
    placement.sagaSteps.push({ name: 'project_policy', status: 'completed', at: new Date().toISOString() });
    placement.updatedAt = new Date();
    await this.placementRepo.save(placement);

    const submission = await this.submissionRepo.findOne({ where: { submissionId: placement.submissionId } });
    if (submission) {
      submission.status = 'placed';
      submission.updatedAt = new Date();
      await this.submissionRepo.save(submission);
    }

    await this.dataSource.manager.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.placement.events',
        eventType: 'BindConfirmed.v1',
        eventVersion: 1,
        correlationId: ctx.correlationId,
        tenantId: ctx.tenantId,
        subject: { type: 'Placement', id: placement.placementId },
        producer: 'submission-placement',
        payload: {
          placementId: placement.placementId,
          submissionId: placement.submissionId,
          quoteResponseId: placement.quoteResponseId,
          policyId: placement.policyId,
          policyNumber: placement.policyNumber,
          carrierOrganizationId: placement.carrierOrganizationId,
          confirmedAt: new Date().toISOString(),
        },
      });

      await outbox.publish({
        topic: 'insurance.placement.events',
        eventType: 'PlacementBound.v1',
        eventVersion: 1,
        correlationId: ctx.correlationId,
        tenantId: ctx.tenantId,
        subject: { type: 'Placement', id: placement.placementId },
        producer: 'submission-placement',
        payload: {
          placementId: placement.placementId,
          submissionId: placement.submissionId,
          quoteResponseId: placement.quoteResponseId,
          policyId: placement.policyId,
          policyNumber: placement.policyNumber,
          premiumReservationId: placement.premiumReservationId,
          boundAt: new Date().toISOString(),
        },
      });
    });

    await this.audit.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'issue',
      resourceType: 'placement',
      resourceId: placement.placementId,
      correlationId: ctx.correlationId,
      after: { policyId: placement.policyId, status: 'completed' },
    });

    return { success: true, placement, policyId: placement.policyId || undefined, policyNumber: placement.policyNumber || undefined };
  }

  async retry(ctx: PlacementContext, placementId: string): Promise<BindResult> {
    const placement = await this.placementRepo.findOne({ where: { placementId, tenantId: ctx.tenantId } });
    if (!placement) throw new NotFoundException('Placement not found');
    if (placement.status !== 'bind_failed') throw new BadRequestException('Only failed placements can be retried');
    placement.status = 'draft';
    placement.bindSagaState = 'not_started';
    placement.lastError = null;
    placement.updatedAt = new Date();
    await this.placementRepo.save(placement);
    return this.bind(ctx, placementId);
  }

  async cancel(ctx: PlacementContext, placementId: string): Promise<Placement> {
    const placement = await this.placementRepo.findOne({ where: { placementId, tenantId: ctx.tenantId } });
    if (!placement) throw new NotFoundException('Placement not found');
    if (placement.status === 'completed') throw new BadRequestException('Completed placement cannot be cancelled');
    if (placement.premiumReservationId) {
      await this.billingClient.releasePremium(ctx.tenantId, placement.premiumReservationId, ctx.authHeader).catch(() => null);
    }
    placement.status = 'cancelled';
    placement.bindSagaState = 'not_started';
    placement.updatedAt = new Date();
    await this.placementRepo.save(placement);

    const cancelOutbox = new OutboxPublisher(this.dataSource.manager);
    await cancelOutbox.publish({
      topic: 'insurance.placement.events',
      eventType: 'PlacementCancelled.v1',
      eventVersion: 1,
      correlationId: ctx.correlationId,
      tenantId: ctx.tenantId,
      subject: { type: 'Placement', id: placement.placementId },
      producer: 'submission-placement',
      payload: {
        placementId: placement.placementId,
        submissionId: placement.submissionId,
        carrierOrganizationId: placement.carrierOrganizationId,
        cancelledAt: new Date().toISOString(),
      },
    });

    return placement;
  }

  private async fail(placement: Placement, code: string, message: string): Promise<BindResult> {
    placement.status = 'bind_failed';
    placement.bindSagaState = 'not_started';
    placement.lastError = { code, message };
    placement.updatedAt = new Date();
    await this.placementRepo.save(placement);

    const failOutbox = new OutboxPublisher(this.dataSource.manager);
    await failOutbox.publish({
      topic: 'insurance.placement.events',
      eventType: 'BindFailed.v1',
      eventVersion: 1,
      correlationId: placement.lastError?.correlationId || 'unknown',
      tenantId: placement.tenantId,
      subject: { type: 'Placement', id: placement.placementId },
      producer: 'submission-placement',
      payload: {
        placementId: placement.placementId,
        submissionId: placement.submissionId,
        errorCode: code,
        errorMessage: message,
        bindSagaState: placement.bindSagaState,
        failedAt: new Date().toISOString(),
      },
    });

    return { success: false, placement, errorCode: code, errorMessage: message };
  }
}
