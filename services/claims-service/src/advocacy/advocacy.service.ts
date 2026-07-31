import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DataSource, Repository } from 'typeorm';
import { ClaimAdvocacyCase } from '../entities/ClaimAdvocacyCase';
import { AdvocacyTask } from '../entities/AdvocacyTask';
import { AdvocacyCommunication } from '../entities/AdvocacyCommunication';
import { AdjusterReferral } from '../entities/AdjusterReferral';
import { ClaimProjection } from '../entities/ClaimProjection';
import { RecoveryCase } from '../entities/RecoveryCase';
import { Claim } from '../entities/Claim';
import { ClaimDocument } from '../entities/ClaimDocument';
import { OutboxPublisher } from '@insurance/shared';
import { auditLogger } from '../audit.logger';
import { ServiceClient } from '../service-client';

@Injectable()
export class ClaimAdvocacyService {
  private outboxPublisher: OutboxPublisher;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ClaimAdvocacyCase)
    private readonly caseRepo: Repository<ClaimAdvocacyCase>,
    @InjectRepository(AdvocacyTask)
    private readonly taskRepo: Repository<AdvocacyTask>,
    @InjectRepository(AdvocacyCommunication)
    private readonly communicationRepo: Repository<AdvocacyCommunication>,
    @InjectRepository(AdjusterReferral)
    private readonly referralRepo: Repository<AdjusterReferral>,
    @InjectRepository(ClaimProjection)
    private readonly projectionRepo: Repository<ClaimProjection>,
    @InjectRepository(RecoveryCase)
    private readonly recoveryRepo: Repository<RecoveryCase>,
    @InjectRepository(Claim)
    private readonly claimRepo: Repository<Claim>,
    @InjectRepository(ClaimDocument)
    private readonly documentRepo: Repository<ClaimDocument>,
    private readonly serviceClient: ServiceClient
  ) {
    this.outboxPublisher = new OutboxPublisher(this.dataSource);
  }

  private getSalesNetworkServiceUrl(): string | null {
    const url = process.env.SALES_NETWORK_SERVICE_URL;
    if (typeof url === 'string' && url.length > 0) return url;
    return null;
  }

  private validateAmount(value: any, field: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || Number.isNaN(value) || value < 0) {
      const err: any = new Error(`${field} must be a finite non-negative number`);
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    return value;
  }

  private assertTenantMatch(entity: { tenantId: string }, tenantId?: string): void {
    if (!tenantId) return;
    if (entity.tenantId !== tenantId) {
      const err: any = new Error('Cross-tenant access denied');
      err.code = 'CROSS_TENANT_ACCESS_DENIED';
      throw err;
    }
  }

  async openAdvocacyCase(params: {
    correlationId: string;
    tenantId: string;
    actorUserId?: string;
    claimId: string;
    brokerOrganizationId: string;
    customerPartyId: string;
    carrierOrganizationId: string;
    priority?: ClaimAdvocacyCase['priority'];
  }): Promise<ClaimAdvocacyCase> {
    const { tenantId, claimId, brokerOrganizationId, customerPartyId, carrierOrganizationId } = params;

    const claim = await this.claimRepo.findOne({ where: { claimId } });
    if (!claim) {
      const err: any = new Error(`Claim ${claimId} not found`);
      err.code = 'NOT_FOUND';
      throw err;
    }
    this.assertTenantMatch(claim, tenantId);

    const existing = await this.caseRepo.findOne({ where: { claimId, tenantId } });
    if (existing) return existing;

    return this.dataSource.transaction(async (manager) => {
      const caseRepo = manager.getRepository(ClaimAdvocacyCase);
      const advocacyCase = caseRepo.create({
        caseId: uuidv4(),
        tenantId,
        brokerOrganizationId,
        claimId,
        customerPartyId,
        carrierOrganizationId,
        status: 'open',
        priority: (params.priority as any) || 'medium',
        openedAt: new Date(),
        caseMetadata: { openedBy: params.actorUserId },
      });

      await caseRepo.save(advocacyCase);

      const publisher = new OutboxPublisher(manager);
      await publisher.publish({
        topic: 'insurance.claim.advocacy_case_opened',
        eventType: 'ClaimAdvocacyCaseOpened',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: {
          claimId,
          caseId: advocacyCase.caseId,
          tenantId,
        },
        payload: {
          caseId: advocacyCase.caseId,
          claimId,
          brokerOrganizationId,
          customerPartyId,
          carrierOrganizationId,
          priority: advocacyCase.priority,
          openedAt: advocacyCase.openedAt.toISOString(),
        },
      });

      auditLogger.info('claims.advocacy.opened', {
        correlationId: params.correlationId,
        tenantId,
        caseId: advocacyCase.caseId,
        claimId,
      });

      return advocacyCase;
    });
  }

  async getAdvocacyCase(params: { caseId: string; tenantId?: string }): Promise<ClaimAdvocacyCase | null> {
    const where: any = { caseId: params.caseId };
    if (params.tenantId) where.tenantId = params.tenantId;
    const c = await this.caseRepo.findOne({ where });
    if (c) this.assertTenantMatch(c, params.tenantId);
    return c;
  }

  async listAdvocacyCases(params: {
    tenantId?: string;
    brokerOrganizationId?: string;
    customerPartyId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: ClaimAdvocacyCase[]; total: number }> {
    const qb = this.caseRepo.createQueryBuilder('case');
    if (params.tenantId) qb.andWhere('case.tenant_id = :tenantId', { tenantId: params.tenantId });
    if (params.brokerOrganizationId) qb.andWhere('case.broker_organization_id = :brokerOrganizationId', { brokerOrganizationId: params.brokerOrganizationId });
    if (params.customerPartyId) qb.andWhere('case.customer_party_id = :customerPartyId', { customerPartyId: params.customerPartyId });
    if (params.status) qb.andWhere('case.status = :status', { status: params.status });
    qb.orderBy('case.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async createTask(params: {
    correlationId: string;
    tenantId: string;
    caseId: string;
    taskType: AdvocacyTask['taskType'];
    assignedToPartyId: string;
    dueDate: string;
  }): Promise<AdvocacyTask> {
    const { tenantId, caseId } = params;
    const advocacyCase = await this.caseRepo.findOne({ where: { caseId } });
    if (!advocacyCase) {
      const err: any = new Error(`Case ${caseId} not found`);
      err.code = 'NOT_FOUND';
      throw err;
    }
    this.assertTenantMatch(advocacyCase, tenantId);

    const task = this.taskRepo.create({
      taskId: uuidv4(),
      tenantId,
      caseId,
      taskType: params.taskType,
      assignedToPartyId: params.assignedToPartyId,
      dueDate: new Date(params.dueDate),
      status: 'pending',
    });

    await this.taskRepo.save(task);

    await this.outboxPublisher.publish({
      topic: 'insurance.claim.advocacy_task_created',
      eventType: 'AdvocacyTaskCreated',
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: { caseId, taskId: task.taskId, tenantId },
      payload: {
        caseId,
        taskId: task.taskId,
        taskType: task.taskType,
        assignedToPartyId: task.assignedToPartyId,
        dueDate: task.dueDate.toISOString(),
      },
    });

    return task;
  }

  async updateTask(params: {
    correlationId: string;
    tenantId: string;
    caseId: string;
    taskId: string;
    status: AdvocacyTask['status'];
    outcome?: string;
  }): Promise<AdvocacyTask | null> {
    const task = await this.taskRepo.findOne({ where: { taskId: params.taskId, caseId: params.caseId } });
    if (!task) return null;
    this.assertTenantMatch(task, params.tenantId);

    task.status = params.status;
    if (params.outcome !== undefined) task.outcome = params.outcome || null;
    await this.taskRepo.save(task);

    return task;
  }

  async listTasks(params: {
    tenantId: string;
    caseId: string;
    status?: string;
  }): Promise<AdvocacyTask[]> {
    const where: any = { caseId: params.caseId };
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.status) where.status = params.status;
    return await this.taskRepo.find({ where, order: { createdAt: 'ASC' } });
  }

  async addCommunication(params: {
    correlationId: string;
    tenantId: string;
    caseId: string;
    channel: AdvocacyCommunication['channel'];
    direction: AdvocacyCommunication['direction'];
    contentRef: string;
    partyId?: string;
    subject?: string;
    summary?: string;
    isPii?: boolean;
    timestamp?: string;
  }): Promise<AdvocacyCommunication> {
    const advocacyCase = await this.caseRepo.findOne({ where: { caseId: params.caseId } });
    if (!advocacyCase) {
      const err: any = new Error(`Case ${params.caseId} not found`);
      err.code = 'NOT_FOUND';
      throw err;
    }
    this.assertTenantMatch(advocacyCase, params.tenantId);

    const communication = this.communicationRepo.create({
      communicationId: uuidv4(),
      tenantId: params.tenantId,
      caseId: params.caseId,
      channel: params.channel,
      direction: params.direction,
      contentRef: params.contentRef,
      partyId: params.partyId || null,
      subject: params.subject || null,
      summary: params.summary || null,
      isPii: params.isPii || false,
      timestamp: params.timestamp ? new Date(params.timestamp) : new Date(),
    });

    await this.communicationRepo.save(communication);
    return communication;
  }

  async addAdjusterCommunication(params: {
    correlationId: string;
    tenantId: string;
    referralId: string;
    channel: AdvocacyCommunication['channel'];
    direction: AdvocacyCommunication['direction'];
    contentRef: string;
    partyId?: string;
    subject?: string;
    summary?: string;
    isPii?: boolean;
  }): Promise<AdvocacyCommunication> {
    const referral = await this.referralRepo.findOne({ where: { referralId: params.referralId } });
    if (!referral) {
      const err: any = new Error(`Referral ${params.referralId} not found`);
      err.code = 'NOT_FOUND';
      throw err;
    }
    this.assertTenantMatch(referral, params.tenantId);

    // Use the referral's caseId to link the communication
    const communication = this.communicationRepo.create({
      communicationId: uuidv4(),
      tenantId: params.tenantId,
      caseId: referral.caseId,
      channel: params.channel,
      direction: params.direction,
      contentRef: params.contentRef,
      partyId: params.partyId || referral.adjusterPartyId,
      subject: params.subject || `Adjuster communication for referral ${params.referralId}`,
      summary: params.summary || null,
      isPii: params.isPii || false,
      timestamp: new Date(),
    });

    await this.communicationRepo.save(communication);

    await this.outboxPublisher.publish({
      topic: 'insurance.claim.adjuster_communication',
      eventType: 'AdjusterCommunicationAdded',
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: { referralId: params.referralId, caseId: referral.caseId, claimId: referral.claimId, tenantId: params.tenantId },
      payload: {
        referralId: params.referralId,
        claimId: referral.claimId,
        caseId: referral.caseId,
        adjusterPartyId: referral.adjusterPartyId,
        channel: params.channel,
        direction: params.direction,
        partyId: params.partyId,
      },
    });

    return communication;
  }

  async escalate(params: { correlationId: string; tenantId: string; caseId: string; reason: string; actorUserId?: string }): Promise<ClaimAdvocacyCase | null> {
    const advocacyCase = await this.caseRepo.findOne({ where: { caseId: params.caseId } });
    if (!advocacyCase) return null;
    this.assertTenantMatch(advocacyCase, params.tenantId);

    if (!params.reason || params.reason.trim().length === 0) {
      const err: any = new Error('Escalation reason is required');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    advocacyCase.status = 'escalated';
    advocacyCase.escalationReason = params.reason;
    advocacyCase.caseMetadata = { ...advocacyCase.caseMetadata, escalatedBy: params.actorUserId };
    await this.caseRepo.save(advocacyCase);

    await this.outboxPublisher.publish({
      topic: 'insurance.claim.advocacy_case_escalated',
      eventType: 'ClaimAdvocacyCaseEscalated',
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: { caseId: params.caseId, tenantId: params.tenantId },
      payload: {
        caseId: params.caseId,
        reason: params.reason,
        escalatedAt: new Date().toISOString(),
      },
    });

    return advocacyCase;
  }

  async closeCase(params: { correlationId: string; tenantId: string; caseId: string; actorUserId?: string }): Promise<ClaimAdvocacyCase | null> {
    const advocacyCase = await this.caseRepo.findOne({ where: { caseId: params.caseId } });
    if (!advocacyCase) return null;
    this.assertTenantMatch(advocacyCase, params.tenantId);

    if (advocacyCase.status === 'resolved' || advocacyCase.status === 'closed') {
      return advocacyCase;
    }

    const claimRepo = this.dataSource.getRepository(Claim);
    const claim = await claimRepo.findOne({ where: { claimId: advocacyCase.claimId } });
    if (claim && !['closed', 'resolved', 'paid', 'settled', 'rejected', 'denied'].includes(claim.status)) {
      const err: any = new Error('Advocacy case can only be closed when the claim is closed, resolved, paid, settled, rejected, or denied');
      err.code = 'INVALID_CLAIM_STATE';
      throw err;
    }

    advocacyCase.status = 'closed';
    advocacyCase.closedAt = new Date();
    advocacyCase.caseMetadata = { ...advocacyCase.caseMetadata, closedBy: params.actorUserId };
    await this.caseRepo.save(advocacyCase);

    return advocacyCase;
  }

  async createAdjusterReferral(params: {
    correlationId: string;
    tenantId: string;
    claimId: string;
    caseId: string;
    adjusterOrganizationId: string;
    adjusterPartyId: string;
    estimatedFeeAmount?: number;
    estimatedFeeCurrency?: string;
  }): Promise<AdjusterReferral> {
    const { tenantId, caseId } = params;
    const advocacyCase = await this.caseRepo.findOne({ where: { caseId } });
    if (!advocacyCase) {
      const err: any = new Error(`Case ${caseId} not found`);
      err.code = 'NOT_FOUND';
      throw err;
    }
    this.assertTenantMatch(advocacyCase, tenantId);

    const hasAdjusterCapability = await this.serviceClient.validateOrganizationCapability({
      correlationId: params.correlationId,
      organizationId: params.adjusterOrganizationId,
      tenantId,
      capability: 'LOSS_ADJUSTER',
    });
    if (!hasAdjusterCapability) {
      const err: any = new Error('Adjuster organization does not have LOSS_ADJUSTER capability');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const salesNetworkUrl = this.getSalesNetworkServiceUrl();
    if (salesNetworkUrl) {
      const hasAgreement = await this.serviceClient.validateActiveDistributionAgreement({
        correlationId: params.correlationId,
        salesNetworkServiceUrl: salesNetworkUrl,
        carrierOrganizationId: advocacyCase.carrierOrganizationId,
        distributorOrganizationId: params.adjusterOrganizationId,
        tenantId,
      });
      if (!hasAgreement) {
        const err: any = new Error('No active distribution agreement between carrier and adjuster organization');
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
    }

    const referral = this.referralRepo.create({
      referralId: uuidv4(),
      tenantId,
      claimId: params.claimId,
      caseId,
      adjusterOrganizationId: params.adjusterOrganizationId,
      adjusterPartyId: params.adjusterPartyId,
      referralDate: new Date(),
      status: 'pending',
      estimatedFeeAmount: params.estimatedFeeAmount ?? null,
      estimatedFeeCurrency: params.estimatedFeeCurrency || 'IRR',
    });

    await this.referralRepo.save(referral);

    await this.outboxPublisher.publish({
      topic: 'insurance.claim.adjuster_referred',
      eventType: 'AdjusterReferred',
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: { claimId: params.claimId, caseId, referralId: referral.referralId, tenantId },
      payload: {
        referralId: referral.referralId,
        claimId: params.claimId,
        caseId,
        adjusterOrganizationId: params.adjusterOrganizationId,
        adjusterPartyId: params.adjusterPartyId,
        referralDate: referral.referralDate.toISOString(),
      },
    });

    return referral;
  }

  async listAdjusterReferrals(params: {
    correlationId: string;
    tenantId: string;
    claimId: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: AdjusterReferral[]; total: number }> {
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = Math.max(0, params.offset || 0);
    const [rows, total] = await this.referralRepo.findAndCount({
      where: { claimId: params.claimId, tenantId: params.tenantId },
      order: { referralDate: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { rows, total };
  }

  async acceptAdjusterReferral(params: { correlationId: string; tenantId: string; referralId: string }): Promise<AdjusterReferral | null> {
    const referral = await this.referralRepo.findOne({ where: { referralId: params.referralId } });
    if (!referral) return null;
    this.assertTenantMatch(referral, params.tenantId);

    referral.status = 'accepted';
    await this.referralRepo.save(referral);
    return referral;
  }

  async rejectAdjusterReferral(params: { correlationId: string; tenantId: string; referralId: string; reason: string }): Promise<AdjusterReferral | null> {
    const referral = await this.referralRepo.findOne({ where: { referralId: params.referralId } });
    if (!referral) return null;
    this.assertTenantMatch(referral, params.tenantId);

    referral.status = 'rejected';
    referral.rejectionReason = params.reason;
    await this.referralRepo.save(referral);
    return referral;
  }

  async submitAdjusterReport(params: {
    correlationId: string;
    tenantId: string;
    referralId: string;
    reportRef: string;
    reportChecksum: string;
    reportMetadata?: Record<string, any>;
  }): Promise<AdjusterReferral | null> {
    const referral = await this.referralRepo.findOne({ where: { referralId: params.referralId } });
    if (!referral) return null;
    this.assertTenantMatch(referral, params.tenantId);

    if (referral.status !== 'accepted' && referral.status !== 'assigned') {
      const err: any = new Error('Report can only be submitted for accepted or assigned referrals');
      err.code = 'INVALID_REFERRAL_STATE';
      throw err;
    }

    if (!params.reportRef || params.reportRef.trim().length === 0) {
      const err: any = new Error('reportRef is required and must be a non-empty document reference');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (!params.reportChecksum || params.reportChecksum.trim().length === 0) {
      const err: any = new Error('reportChecksum is required for document integrity verification');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    referral.status = 'report_received';
    referral.reportRef = params.reportRef;
    referral.reportChecksum = params.reportChecksum;
    referral.reportReceivedAt = new Date();
    referral.reportMetadata = params.reportMetadata || null;
    await this.referralRepo.save(referral);

    await this.outboxPublisher.publish({
      topic: 'insurance.claim.adjuster_report_received',
      eventType: 'AdjusterReportReceived',
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: { referralId: params.referralId, claimId: referral.claimId, tenantId: params.tenantId },
      payload: {
        referralId: params.referralId,
        claimId: referral.claimId,
        reportRef: params.reportRef,
        reportChecksum: params.reportChecksum,
        receivedAt: referral.reportReceivedAt.toISOString(),
      },
    });

    return referral;
  }

  async addClaimProjection(params: {
    correlationId: string;
    tenantId: string;
    brokerOrganizationId: string;
    carrierOrganizationId: string;
    claimId: string;
    externalClaimId: string;
    sourceSystemId: string;
    sourceVersion: number;
    payload: Record<string, any>;
  }): Promise<ClaimProjection> {
    return this.dataSource.transaction(async (manager) => {
      const projectionRepo = manager.getRepository(ClaimProjection);

      await projectionRepo.update(
        { claimId: params.claimId, sourceSystemId: params.sourceSystemId, status: 'active' },
        { status: 'superseded' }
      );

      const projection = projectionRepo.create({
        projectionId: uuidv4(),
        tenantId: params.tenantId,
        brokerOrganizationId: params.brokerOrganizationId,
        carrierOrganizationId: params.carrierOrganizationId,
        claimId: params.claimId,
        externalClaimId: params.externalClaimId,
        sourceSystemId: params.sourceSystemId,
        sourceVersion: params.sourceVersion,
        payload: params.payload,
        receivedAt: new Date(),
        status: 'active',
      });

      await projectionRepo.save(projection);

      const publisher = new OutboxPublisher(manager);
      await publisher.publish({
        topic: 'insurance.claim.projection_updated',
        eventType: 'ClaimProjectionUpdated',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { claimId: params.claimId, projectionId: projection.projectionId, tenantId: params.tenantId },
        payload: {
          projectionId: projection.projectionId,
          claimId: params.claimId,
          externalClaimId: params.externalClaimId,
          sourceSystemId: params.sourceSystemId,
          sourceVersion: params.sourceVersion,
          receivedAt: projection.receivedAt.toISOString(),
        },
      });

      return projection;
    });
  }

  async getActiveClaimProjection(params: { claimId: string; sourceSystemId: string; tenantId?: string }): Promise<ClaimProjection | null> {
    const where: any = { claimId: params.claimId, sourceSystemId: params.sourceSystemId, status: 'active' };
    if (params.tenantId) where.tenantId = params.tenantId;
    return this.projectionRepo.findOne({ where, order: { sourceVersion: 'DESC' } });
  }

  async listClaimProjections(params: {
    claimId: string;
    tenantId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: ClaimProjection[]; total: number }> {
    const qb = this.projectionRepo.createQueryBuilder('projection');
    qb.andWhere('projection.claim_id = :claimId', { claimId: params.claimId });
    if (params.tenantId) qb.andWhere('projection.tenant_id = :tenantId', { tenantId: params.tenantId });
    qb.orderBy('projection.source_version', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async createRecoveryCase(params: {
    correlationId: string;
    tenantId: string;
    claimId: string;
    responsiblePartyId?: string;
    expectedRecoveryAmount: number;
    expectedRecoveryCurrency?: string;
  }): Promise<RecoveryCase> {
    const amount = this.validateAmount(params.expectedRecoveryAmount, 'expectedRecoveryAmount');

    const recovery = this.recoveryRepo.create({
      recoveryId: uuidv4(),
      tenantId: params.tenantId,
      claimId: params.claimId,
      responsiblePartyId: params.responsiblePartyId || null,
      expectedRecoveryAmount: amount,
      expectedRecoveryCurrency: params.expectedRecoveryCurrency || 'IRR',
      recoveredAmount: 0,
      recoveredCurrency: params.expectedRecoveryCurrency || 'IRR',
      status: 'open',
    });

    await this.recoveryRepo.save(recovery);

    await this.outboxPublisher.publish({
      topic: 'insurance.claim.recovery_case_created',
      eventType: 'RecoveryCaseCreated',
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: { claimId: params.claimId, recoveryId: recovery.recoveryId, tenantId: params.tenantId },
      payload: {
        recoveryId: recovery.recoveryId,
        claimId: params.claimId,
        responsiblePartyId: params.responsiblePartyId,
        expectedRecoveryAmount: amount,
        expectedRecoveryCurrency: recovery.expectedRecoveryCurrency,
      },
    });

    return recovery;
  }

  async recordRecovery(params: {
    correlationId: string;
    tenantId: string;
    recoveryId: string;
    recoveredAmount: number;
    journalEntryId?: string;
  }): Promise<RecoveryCase | null> {
    const recovery = await this.recoveryRepo.findOne({ where: { recoveryId: params.recoveryId } });
    if (!recovery) return null;
    this.assertTenantMatch(recovery, params.tenantId);

    recovery.recoveredAmount = this.validateAmount(params.recoveredAmount, 'recoveredAmount');
    if (params.journalEntryId) recovery.journalEntryId = params.journalEntryId;

    if (!recovery.journalEntryId && this.serviceClient) {
      const journalEntryId = await this.serviceClient.postRecoveryJournalEntry({
        correlationId: params.correlationId,
        tenantId: params.tenantId,
        recoveryId: recovery.recoveryId,
        claimId: recovery.claimId,
        amount: recovery.recoveredAmount,
        currency: recovery.recoveredCurrency,
      });
      if (journalEntryId) {
        recovery.journalEntryId = journalEntryId;
      }
    }

    if (recovery.recoveredAmount >= recovery.expectedRecoveryAmount) {
      recovery.status = 'recovered';
    }
    await this.recoveryRepo.save(recovery);

    await this.outboxPublisher.publish({
      topic: 'insurance.claim.recovery_received',
      eventType: 'RecoveryReceived',
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: { recoveryId: params.recoveryId, claimId: recovery.claimId, tenantId: params.tenantId },
      payload: {
        recoveryId: params.recoveryId,
        claimId: recovery.claimId,
        recoveredAmount: recovery.recoveredAmount,
        status: recovery.status,
      },
    });

    return recovery;
  }

  async getRecoveryCase(params: {
    tenantId: string;
    recoveryId: string;
  }): Promise<RecoveryCase | null> {
    const recovery = await this.recoveryRepo.findOne({ where: { recoveryId: params.recoveryId } });
    if (!recovery) return null;
    this.assertTenantMatch(recovery, params.tenantId);
    return recovery;
  }

  async listRecoveryCases(params: {
    tenantId: string;
    claimId?: string;
    status?: string;
  }): Promise<RecoveryCase[]> {
    const where: any = {};
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.claimId) where.claimId = params.claimId;
    if (params.status) where.status = params.status;
    return await this.recoveryRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async updateRecoveryStatus(params: {
    correlationId: string;
    tenantId: string;
    recoveryId: string;
    status: string;
  }): Promise<RecoveryCase | null> {
    const recovery = await this.recoveryRepo.findOne({ where: { recoveryId: params.recoveryId } });
    if (!recovery) return null;
    this.assertTenantMatch(recovery, params.tenantId);

    recovery.status = params.status as any;
    await this.recoveryRepo.save(recovery);

    await this.outboxPublisher.publish({
      topic: 'insurance.claim.recovery_status_changed',
      eventType: 'RecoveryStatusChanged',
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: { recoveryId: params.recoveryId, claimId: recovery.claimId, tenantId: params.tenantId },
      payload: {
        recoveryId: params.recoveryId,
        claimId: recovery.claimId,
        oldStatus: recovery.status,
        newStatus: params.status,
      },
    });

    return recovery;
  }

  async attachClaimDocument(params: {
    correlationId: string;
    tenantId: string;
    actorUserId?: string;
    claimId: string;
    caseId?: string;
    documentId: string;
    documentType?: ClaimDocument['documentType'];
    uploadedByPartyId: string;
    uploadedByOrganizationId?: string;
  }): Promise<ClaimDocument> {
    const { tenantId, claimId } = params;

    const claim = await this.claimRepo.findOne({ where: { claimId } });
    if (!claim) {
      const err: any = new Error(`Claim ${claimId} not found`);
      err.code = 'NOT_FOUND';
      throw err;
    }
    this.assertTenantMatch(claim, tenantId);

    const docType = params.documentType || 'other';
    let meta: Awaited<ReturnType<ServiceClient['getDocumentMetadata']>> = null;
    let storageRef = '';
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;
    let checksum: string | null = null;
    let virusScanStatus: ClaimDocument['virusScanStatus'] = 'pending';
    let piiScanStatus: ClaimDocument['piiScanStatus'] = 'pending';
    let classification: ClaimDocument['classification'] = 'INTERNAL';

    if (this.serviceClient) {
      meta = await this.serviceClient.getDocumentMetadata({
        correlationId: params.correlationId,
        tenantId,
        documentId: params.documentId,
      });
    }

    if (meta) {
      storageRef = meta.storageRef || params.documentId;
      fileName = meta.fileName || null;
      fileSize = meta.fileSize || null;
      mimeType = meta.mimeType || null;
      checksum = meta.checksum || null;
      if (meta.virusScanStatus && ['pending', 'clean', 'infected', 'error'].includes(meta.virusScanStatus)) {
        virusScanStatus = meta.virusScanStatus as ClaimDocument['virusScanStatus'];
      }
      if (meta.piiScanStatus && ['pending', 'clean', 'detected', 'error'].includes(meta.piiScanStatus)) {
        piiScanStatus = meta.piiScanStatus as ClaimDocument['piiScanStatus'];
      }
      if (meta.classification && ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'PII'].includes(meta.classification)) {
        classification = meta.classification as ClaimDocument['classification'];
      }
    } else {
      storageRef = params.documentId;
    }

    const document = this.documentRepo.create({
      documentId: params.documentId,
      tenantId,
      claimId,
      caseId: params.caseId || null,
      uploadedByPartyId: params.uploadedByPartyId,
      uploadedByOrganizationId: params.uploadedByOrganizationId || null,
      documentType: docType,
      storageRef,
      fileName,
      fileSize,
      mimeType,
      checksum: checksum || '',
      classification,
      virusScanStatus,
      piiScanStatus,
      uploadedAt: new Date(),
    });

    await this.documentRepo.save(document);

    await this.outboxPublisher.publish({
      topic: 'insurance.claim.document_attached',
      eventType: 'ClaimDocumentAttached',
      eventVersion: 1,
      correlationId: params.correlationId,
      subject: { claimId, documentId: document.documentId, tenantId },
      payload: {
        documentId: document.documentId,
        claimId,
        caseId: params.caseId,
        documentType: docType,
        virusScanStatus,
        piiScanStatus,
        classification,
        uploadedByPartyId: params.uploadedByPartyId,
      },
    });

    return document;
  }

  async listClaimDocuments(params: {
    tenantId: string;
    claimId: string;
    organizationId?: string;
    isBroker?: boolean;
  }): Promise<{ rows: ClaimDocument[]; total: number }> {
    const qb = this.documentRepo.createQueryBuilder('d')
      .where('d.claim_id = :claimId', { claimId: params.claimId })
      .andWhere('d.tenant_id = :tenantId', { tenantId: params.tenantId })
      .orderBy('d.created_at', 'DESC');

    if (params.isBroker && params.organizationId) {
      qb.andWhere(
        '(d.classification IN (:...visibleClassifications) OR d.uploaded_by_organization_id = :orgId)',
        { visibleClassifications: ['PUBLIC', 'INTERNAL'], orgId: params.organizationId },
      );
    }

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getClaimDocumentDownloadUrl(params: {
    correlationId: string;
    tenantId: string;
    claimId: string;
    documentId: string;
    organizationId?: string;
    isBroker?: boolean;
  }): Promise<{ downloadUrl: string; expiresAt?: string } | null> {
    const { tenantId, documentId, claimId } = params;

    const claim = await this.claimRepo.findOne({ where: { claimId } });
    if (!claim) {
      const err: any = new Error(`Claim ${claimId} not found`);
      err.code = 'NOT_FOUND';
      throw err;
    }
    this.assertTenantMatch(claim, tenantId);

    const document = await this.documentRepo.findOne({ where: { documentId, claimId, tenantId } as any });
    if (!document) {
      const err: any = new Error(`Document ${documentId} not found for claim ${claimId}`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (params.isBroker && params.organizationId) {
      const isRestricted = ['CONFIDENTIAL', 'PII'].includes(document.classification);
      const isOwnDocument = document.uploadedByOrganizationId === params.organizationId;
      if (isRestricted && !isOwnDocument) {
        const err: any = new Error('Access denied: insufficient permissions to download this document');
        err.code = 'ACCESS_DENIED';
        throw err;
      }
    }

    if (this.serviceClient) {
      const signed = await this.serviceClient.getDocumentSignedUrl({
        correlationId: params.correlationId,
        tenantId,
        documentId,
      });
      if (signed) return signed;
    }

    return null;
  }

  async checkOverdueTasks(params: { correlationId: string; tenantId?: string }): Promise<number> {
    const now = new Date();
    const qb = this.taskRepo.createQueryBuilder('task')
      .where('task.status = :status', { status: 'pending' })
      .andWhere('task.due_date < :now', { now });
    if (params.tenantId) {
      qb.andWhere('task.tenant_id = :tenantId', { tenantId: params.tenantId });
    }

    const overdueTasks = await qb.getMany();
    let published = 0;

    for (const task of overdueTasks) {
      task.status = 'overdue';
      await this.taskRepo.save(task);

      await this.outboxPublisher.publish({
        topic: 'insurance.claim.advocacy_task_overdue',
        eventType: 'AdvocacyTaskOverdue',
        eventVersion: 1,
        correlationId: params.correlationId,
        subject: { caseId: task.caseId, taskId: task.taskId, tenantId: task.tenantId },
        payload: {
          taskId: task.taskId,
          caseId: task.caseId,
          taskType: task.taskType,
          assignedToPartyId: task.assignedToPartyId,
          dueDate: task.dueDate.toISOString(),
          overdueAt: now.toISOString(),
        },
      });
      published++;
    }

    return published;
  }

  async getClaimDocumentScanStatus(params: {
    tenantId: string;
    claimId: string;
    documentId: string;
  }): Promise<{ virusScanStatus: string; piiScanStatus: string; classification: string } | null> {
    const { tenantId, documentId, claimId } = params;

    const claim = await this.claimRepo.findOne({ where: { claimId } });
    if (!claim) {
      const err: any = new Error(`Claim ${claimId} not found`);
      err.code = 'NOT_FOUND';
      throw err;
    }
    this.assertTenantMatch(claim, tenantId);

    const document = await this.documentRepo.findOne({ where: { documentId, claimId, tenantId } as any });
    if (!document) {
      return null;
    }

    return {
      virusScanStatus: document.virusScanStatus,
      piiScanStatus: document.piiScanStatus,
      classification: document.classification,
    };
  }
}
