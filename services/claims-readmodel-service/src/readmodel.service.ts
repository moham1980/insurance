import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { DataSource, Repository } from 'typeorm';
import { z } from 'zod';
import { createLogger, DeadLetterQueueService, applyCursorPagination, CursorPaginationResult } from '@insurance/shared';
import { RmClaimCase } from './entities/RmClaimCase';
import { RmFraudCase } from './entities/RmFraudCase';
import { RmComplaintOps } from './entities/RmComplaintOps';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EventSubjectSchema = z.record(z.string().optional());

const EventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string().min(1),
  eventVersion: z.number().int().min(1),
  occurredAt: z.string().datetime(),
  producer: z.string().min(1),
  correlationId: z.string().min(1),
  tenantId: z.string().uuid(),
  idempotencyKey: z.string().optional(),
  causationId: z.string().optional(),
  traceparent: z.string().optional(),
  subject: EventSubjectSchema,
  payload: z.unknown(),
});

type ValidatedEventEnvelope = z.infer<typeof EventEnvelopeSchema>;

const MIN_INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 60000;
const JITTER_MS = 1000;
const CONSUMER_STOP_TIMEOUT_MS = 5000;

@Injectable()
export class ReadModelService implements OnModuleInit, OnModuleDestroy {
  private consumer?: Consumer;
  private dlq?: DeadLetterQueueService;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private retryCount = 0;
  private consumerGroupId = 'claims-readmodel-v1';
  private readonly logger = createLogger({
    serviceName: 'claims-readmodel-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(RmClaimCase) private readonly rmRepo: Repository<RmClaimCase>,
    @InjectRepository(RmFraudCase) private readonly rmFraudRepo: Repository<RmFraudCase>,
    @InjectRepository(RmComplaintOps) private readonly rmComplaintsRepo: Repository<RmComplaintOps>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dlq = new DeadLetterQueueService(
      { dataSource: this.dataSource },
      this.logger as any,
    );
    try {
      await this.startConsumer();
    } catch (err) {
      this.logger.error('Failed to start Kafka consumer on init, will retry in background', err as Error);
      this.scheduleRetry();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.consumer) {
      try {
        await this.consumer.stop();
      } catch {
        // ignore
      }
      await Promise.race([
        this.consumer.disconnect(),
        new Promise<void>((resolve) => setTimeout(resolve, CONSUMER_STOP_TIMEOUT_MS)),
      ]);
    }
  }

  private scheduleRetry(): void {
    const baseDelay = Math.min(MIN_INITIAL_RETRY_DELAY_MS * Math.pow(2, this.retryCount), MAX_RETRY_DELAY_MS);
    const jitter = Math.floor(Math.random() * JITTER_MS);
    const delay = baseDelay + jitter;

    this.retryTimer = setTimeout(async () => {
      this.retryCount++;
      this.logger.info(`Kafka consumer retry ${this.retryCount} scheduled`, { delay });
      try {
        await this.startConsumer();
        this.retryCount = 0;
      } catch (err) {
        this.logger.error(`Kafka consumer retry ${this.retryCount} failed`, err as Error);
        this.scheduleRetry();
      }
    }, delay);
  }

  private getKafkaConfig() {
    const brokersEnv = process.env.KAFKA_BROKERS;
    if (!brokersEnv) throw new Error('KAFKA_BROKERS environment variable is required');
    const kafkaBrokers = brokersEnv.split(',').map((x) => x.trim()).filter(Boolean);
    const consumerGroupId = process.env.KAFKA_CONSUMER_GROUP || 'claims-readmodel-v1';
    const fromBeginning = process.env.KAFKA_CONSUMER_FROM_BEGINNING === 'true';
    return { kafkaBrokers, consumerGroupId, fromBeginning };
  }

  private async markConsumedAtomic(
    manager: any,
    eventId: string,
    consumerName: string,
    topic: string,
  ): Promise<boolean> {
    const inserted = await manager.query(
      `INSERT INTO consumed_events(event_id, consumer_name, consumed_at, topic, processed, processed_at)
       VALUES ($1, $2, NOW(), $3, FALSE, NULL)
       ON CONFLICT (event_id, consumer_name) DO NOTHING
       RETURNING event_id;`,
      [eventId, consumerName, topic],
    );
    return Array.isArray(inserted) && inserted.length > 0;
  }

  private async setProcessedAtomic(manager: any, eventId: string, consumerName: string): Promise<void> {
    await manager.query(
      `UPDATE consumed_events SET processed = TRUE, processed_at = NOW()
       WHERE event_id = $1 AND consumer_name = $2;`,
      [eventId, consumerName],
    );
  }

  private isNewer(row: { lastEventVersion: number | null; lastOccurredAt: Date | null }, envelope: ValidatedEventEnvelope): boolean {
    const rowVersion = row.lastEventVersion ?? 0;
    const rowOccurredAt = row.lastOccurredAt ? new Date(row.lastOccurredAt).getTime() : 0;
    const newOccurredAt = new Date(envelope.occurredAt).getTime();

    if (envelope.eventVersion < rowVersion) return false;
    if (envelope.eventVersion > rowVersion) return true;
    return newOccurredAt >= rowOccurredAt;
  }

  private isValidStatusTransition(eventType: string, currentStatus: string | null): boolean {
    if (!currentStatus) return true;
    const terminal: Record<string, string[]> = {
      ClaimRejected: ['ClaimPaid', 'ClaimClosed'],
      ClaimPaid: ['ClaimClosed'],
      ClaimClosed: [],
      FraudCaseClosed: ['FraudScoreComputed', 'FraudCaseOpened'],
      ComplaintResolved: ['ComplaintCreated', 'ComplaintEscalated', 'ComplaintSlaBreached', 'ComplaintStatusChanged'],
    };
    const blockedNext = terminal[currentStatus] || [];
    return !blockedNext.includes(eventType);
  }

  private async upsertRmClaimCase(envelope: ValidatedEventEnvelope): Promise<void> {
    const claimId = envelope.subject?.claimId || (envelope.payload as any)?.claimId;
    const claimNumber = envelope.subject?.claimNumber || (envelope.payload as any)?.claimNumber;
    const policyId = envelope.subject?.policyId || (envelope.payload as any)?.policyId;

    if (!claimId || !uuidRegex.test(claimId)) {
      throw new Error(`Missing or invalid claimId in event ${envelope.eventId}`);
    }

    await this.dataSource.transaction(async (manager) => {
      const consumed = await this.markConsumedAtomic(manager, envelope.eventId, this.consumerGroupId, envelope.eventType);
      if (!consumed) return;

      const repo = manager.getRepository(RmClaimCase);
      const existing = await repo.findOne({ where: { claimId } });

      if (existing && !this.isNewer(existing, envelope)) {
        this.logger.warn('Skipping older or duplicate claim event', { eventId: envelope.eventId, claimId });
        return;
      }

      if (existing && !this.isValidStatusTransition(envelope.eventType, existing.status)) {
        this.logger.warn('Claim status transition rejected: event older than current terminal state', {
          eventId: envelope.eventId,
          eventType: envelope.eventType,
          currentStatus: existing.status,
        });
        return;
      }

      const payload = envelope.payload as any;
      const status = payload?.status || existing?.status || 'registered';

      const row = existing
        ? { ...existing }
        : repo.create({
            claimId,
            tenantId: envelope.tenantId,
            claimNumber: claimNumber || null,
            policyId: policyId || null,
            status: 'registered',
          });

      row.tenantId = envelope.tenantId;
      if (claimNumber) row.claimNumber = claimNumber;
      if (policyId) row.policyId = policyId;
      if (payload?.status) row.status = payload.status;
      if (payload?.lossDate) row.lossDate = new Date(payload.lossDate);
      if ('lossType' in payload) row.lossType = payload.lossType || null;
      if ('requiresHumanTriage' in payload) row.requiresHumanTriage = payload.requiresHumanTriage ?? null;
      if (payload?.createdAt) row.createdAt = new Date(payload.createdAt);
      if (payload?.assessedAmount !== undefined) row.assessedAmount = String(payload.assessedAmount);
      if (payload?.approvedAmount !== undefined) row.approvedAmount = String(payload.approvedAmount);
      if (payload?.paidAmount !== undefined) row.paidAmount = String(payload.paidAmount);
      if (payload?.currency) row.currency = payload.currency;
      if (payload?.adjusterId) row.adjusterId = payload.adjusterId;
      if (payload?.fraudCaseId) row.fraudCaseId = payload.fraudCaseId;

      row.lastEventId = envelope.eventId;
      row.lastEventVersion = envelope.eventVersion;
      row.lastOccurredAt = new Date(envelope.occurredAt);
      row.updatedAt = new Date();

      await repo.save(row);
      await this.setProcessedAtomic(manager, envelope.eventId, this.consumerGroupId);
    });
  }

  private async upsertRmClaimReinsurance(envelope: ValidatedEventEnvelope): Promise<void> {
    const claimId = envelope.subject?.claimId || (envelope.payload as any)?.claimId;
    if (!claimId || !uuidRegex.test(claimId)) {
      throw new Error(`Missing or invalid claimId in RI event ${envelope.eventId}`);
    }

    const contractId = envelope.subject?.contractId || (envelope.payload as any)?.contractId || null;
    const recoveryId = envelope.subject?.recoveryId || (envelope.payload as any)?.recoveryId || null;

    await this.dataSource.transaction(async (manager) => {
      const consumed = await this.markConsumedAtomic(manager, envelope.eventId, this.consumerGroupId, envelope.eventType);
      if (!consumed) return;

      const repo = manager.getRepository(RmClaimCase);
      const existing = await repo.findOne({ where: { claimId } });

      const row = existing
        ? { ...existing }
        : repo.create({
            claimId,
            tenantId: envelope.tenantId,
            claimNumber: null,
            policyId: null,
            status: 'pending_recovery_data',
          });

      if (existing && !this.isNewer(existing, envelope)) {
        this.logger.warn('Skipping older or duplicate RI event', { eventId: envelope.eventId, claimId });
        return;
      }

      row.tenantId = envelope.tenantId;
      const payload = envelope.payload as any;

      if (envelope.eventType === 'RecoveryIdentified') {
        if (contractId) row.riContractId = contractId;
        if (recoveryId) row.riLastRecoveryId = recoveryId;
        if (payload?.currency) row.riCurrency = payload.currency;
        if (payload?.recoverableAmount !== undefined && payload?.recoverableAmount !== null) {
          row.riRecoverableAmount = String(payload.recoverableAmount);
        }
        row.riLastIdentifiedAt = payload?.identifiedAt ? new Date(payload.identifiedAt) : new Date(envelope.occurredAt);
      }

      if (envelope.eventType === 'RecoveryReceived') {
        if (contractId) row.riContractId = contractId;
        if (recoveryId) row.riLastRecoveryId = recoveryId;
        if (payload?.currency) row.riCurrency = payload.currency;
        if (payload?.amount !== undefined && payload?.amount !== null) {
          row.riRecoveredAmount = String(payload.amount);
        }
        row.riLastReceivedAt = payload?.receivedAt ? new Date(payload.receivedAt) : new Date(envelope.occurredAt);
      }

      row.lastEventId = envelope.eventId;
      row.lastEventVersion = envelope.eventVersion;
      row.lastOccurredAt = new Date(envelope.occurredAt);
      row.updatedAt = new Date();

      await repo.save(row);
      await this.setProcessedAtomic(manager, envelope.eventId, this.consumerGroupId);
    });
  }

  private async upsertRmFraudCase(envelope: ValidatedEventEnvelope): Promise<void> {
    const claimId = envelope.subject?.claimId || (envelope.payload as any)?.claimId;
    if (!claimId || !uuidRegex.test(claimId)) {
      throw new Error(`Missing or invalid claimId in fraud event ${envelope.eventId}`);
    }

    await this.dataSource.transaction(async (manager) => {
      const consumed = await this.markConsumedAtomic(manager, envelope.eventId, this.consumerGroupId, envelope.eventType);
      if (!consumed) return;

      const repo = manager.getRepository(RmFraudCase);
      const existing = await repo.findOne({ where: { claimId } });

      if (existing && !this.isNewer(existing, envelope)) {
        this.logger.warn('Skipping older or duplicate fraud event', { eventId: envelope.eventId, claimId });
        return;
      }

      if (existing && !this.isValidStatusTransition(envelope.eventType, existing.status)) {
        this.logger.warn('Fraud status transition rejected', { eventId: envelope.eventId, eventType: envelope.eventType, currentStatus: existing.status });
        return;
      }

      const payload = envelope.payload as any;
      const row = existing
        ? { ...existing }
        : repo.create({
            claimId,
            tenantId: envelope.tenantId,
            status: 'scored',
          });

      row.tenantId = envelope.tenantId;

      switch (envelope.eventType) {
        case 'FraudScoreComputed': {
          if (payload?.claimNumber) row.claimNumber = payload.claimNumber;
          if (typeof payload?.score === 'number') row.latestScore = payload.score;
          if (typeof payload?.holdClaim === 'boolean') row.holdClaim = payload.holdClaim;
          row.scoreComputedAt = row.scoreComputedAt || new Date(envelope.occurredAt);
          row.status = row.status || 'scored';
          break;
        }
        case 'FraudCaseOpened': {
          if (payload?.fraudCaseId || envelope.subject?.fraudCaseId) row.fraudCaseId = (payload?.fraudCaseId || envelope.subject?.fraudCaseId) as string;
          if (payload?.status) row.status = payload.status;
          if ('assignedTo' in payload) row.assignedTo = payload.assignedTo ?? row.assignedTo;
          row.caseOpenedAt = row.caseOpenedAt || new Date(envelope.occurredAt);
          break;
        }
        case 'FraudCaseClosed': {
          if (payload?.fraudCaseId || envelope.subject?.fraudCaseId) row.fraudCaseId = (payload?.fraudCaseId || envelope.subject?.fraudCaseId) as string;
          if (payload?.status) row.status = payload.status;
          if (typeof payload?.holdClaim === 'boolean') row.holdClaim = payload.holdClaim;
          if (payload?.resolution) row.caseResolution = payload.resolution;
          row.caseClosedAt = row.caseClosedAt || new Date(envelope.occurredAt);
          break;
        }
      }

      row.lastEventId = envelope.eventId;
      row.lastEventVersion = envelope.eventVersion;
      row.lastOccurredAt = new Date(envelope.occurredAt);
      row.updatedAt = new Date();

      await repo.save(row);
      await this.setProcessedAtomic(manager, envelope.eventId, this.consumerGroupId);
    });
  }

  private async upsertRmComplaint(envelope: ValidatedEventEnvelope): Promise<void> {
    const complaintId = envelope.subject?.complaintId || (envelope.payload as any)?.complaintId;
    if (!complaintId || !uuidRegex.test(complaintId)) {
      throw new Error(`Missing or invalid complaintId in event ${envelope.eventId}`);
    }

    await this.dataSource.transaction(async (manager) => {
      const consumed = await this.markConsumedAtomic(manager, envelope.eventId, this.consumerGroupId, envelope.eventType);
      if (!consumed) return;

      const repo = manager.getRepository(RmComplaintOps);
      const existing = await repo.findOne({ where: { complaintId } });

      if (existing && !this.isNewer(existing, envelope)) {
        this.logger.warn('Skipping older or duplicate complaint event', { eventId: envelope.eventId, complaintId });
        return;
      }

      if (existing && !this.isValidStatusTransition(envelope.eventType, existing.status)) {
        this.logger.warn('Complaint status transition rejected', { eventId: envelope.eventId, eventType: envelope.eventType, currentStatus: existing.status });
        return;
      }

      const payload = envelope.payload as any;
      const row = existing
        ? { ...existing }
        : repo.create({
            complaintId,
            tenantId: envelope.tenantId,
            complaintType: payload?.complaintType || 'other',
            status: payload?.status || 'open',
          });

      row.tenantId = envelope.tenantId;
      if (payload?.complaintType) row.complaintType = payload.complaintType;
      if (payload?.status) row.status = payload.status;
      if ('policyId' in payload) row.policyId = payload.policyId ?? row.policyId;
      if ('claimId' in payload) row.claimId = payload.claimId ?? row.claimId;
      if ('policyNumber' in payload) row.policyNumber = payload.policyNumber ?? row.policyNumber;
      if ('complainantMobile' in payload) row.complainantMobile = payload.complainantMobile ?? row.complainantMobile;
      if (typeof payload?.complainantMobileVerified === 'boolean') {
        row.complainantMobileVerified = payload.complainantMobileVerified;
      }
      if (payload?.complainantMobileVerifiedAt) row.complainantMobileVerifiedAt = new Date(payload.complainantMobileVerifiedAt);
      if ('assignedTo' in payload) row.assignedTo = payload.assignedTo ?? row.assignedTo;
      if (payload?.slaFirstResponseDueAt) row.slaFirstResponseDueAt = new Date(payload.slaFirstResponseDueAt);
      if (payload?.slaResolutionDueAt) row.slaResolutionDueAt = new Date(payload.slaResolutionDueAt);
      if (payload?.createdAt) row.createdAt = new Date(payload.createdAt);

      // P0 fix: handle ComplaintAttachmentAdded — store attachment metadata to prevent silent data loss.
      if (envelope.eventType === 'ComplaintAttachmentAdded') {
        const attachmentId = envelope.subject?.attachmentId || payload?.attachmentId;
        if (attachmentId) {
          const attachmentEntry = {
            attachmentId,
            fileName: payload?.fileName || payload?.filename || undefined,
            fileType: payload?.fileType || payload?.mimeType || undefined,
            uploadedAt: payload?.uploadedAt || envelope.occurredAt,
            uploadedBy: payload?.uploadedBy || payload?.userId || undefined,
          };
          // Append to existing attachments list or create a new one.
          const existingAttachments = Array.isArray(row.attachments) ? row.attachments : [];
          // Avoid duplicates by attachmentId.
          if (!existingAttachments.some((a) => a.attachmentId === attachmentId)) {
            row.attachments = [...existingAttachments, attachmentEntry];
          }
          this.logger.info('Complaint attachment stored in read model', {
            complaintId,
            attachmentId,
            eventId: envelope.eventId,
          });
        } else {
          this.logger.warn('ComplaintAttachmentAdded event received without attachmentId — attachment data not stored', {
            complaintId,
            eventId: envelope.eventId,
          });
        }
      }

      row.lastEventId = envelope.eventId;
      row.lastEventVersion = envelope.eventVersion;
      row.lastOccurredAt = new Date(envelope.occurredAt);
      row.updatedAt = payload?.updatedAt ? new Date(payload.updatedAt) : new Date();

      await repo.save(row);
      await this.setProcessedAtomic(manager, envelope.eventId, this.consumerGroupId);
    });
  }

  private async applyEvent(envelope: ValidatedEventEnvelope): Promise<void> {
    switch (envelope.eventType) {
      case 'ClaimRegistered':
      case 'ClaimSubmitted':
      case 'ClaimReferredToAdjuster':
      case 'ClaimAdjusterAssigned':
      case 'ClaimAssessed':
      case 'ClaimApproved':
      case 'ClaimRejected':
      case 'ClaimPaid':
      case 'ClaimClosed':
        await this.upsertRmClaimCase(envelope);
        return;
      case 'FraudScoreComputed':
      case 'FraudCaseOpened':
      case 'FraudCaseClosed':
        await this.upsertRmFraudCase(envelope);
        return;
      case 'ComplaintCreated':
      case 'ComplaintEscalated':
      case 'ComplaintSlaBreached':
      case 'ComplaintResolved':
      case 'ComplaintStatusChanged':
      case 'ComplaintAttachmentAdded':
        await this.upsertRmComplaint(envelope);
        return;
      case 'RecoveryIdentified':
      case 'RecoveryReceived':
        await this.upsertRmClaimReinsurance(envelope);
        return;
      default:
        throw new Error(`Unknown eventType: ${envelope.eventType}`);
    }
  }

  private async processMessage(topic: string, message: any, partition: number): Promise<void> {
    const rawValue = message.value?.toString('utf-8');
    if (!rawValue) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawValue);
    } catch (err) {
      const parseError = new Error(`Malformed JSON: ${(err as Error).message}`);
      await this.dlq?.addToDLQ(topic, message, parseError, this.consumerGroupId, partition).catch((dlqErr) => {
        this.logger.error('Failed to add malformed JSON to DLQ', dlqErr as Error);
      });
      return;
    }

    const validation = EventEnvelopeSchema.safeParse(parsed);
    if (!validation.success) {
      const validationError = new Error(`Event validation failed: ${validation.error.message}`);
      await this.dlq?.addToDLQ(topic, message, validationError, this.consumerGroupId, partition).catch((dlqErr) => {
        this.logger.error('Failed to add invalid event to DLQ', dlqErr as Error);
      });
      return;
    }

    const envelope = validation.data;

    try {
      await this.applyEvent(envelope);
    } catch (err) {
      this.logger.error('Failed to apply event', err as Error, { topic, eventId: envelope.eventId, eventType: envelope.eventType });
      await this.dlq?.addToDLQ(topic, message, err as Error, this.consumerGroupId, partition).catch((dlqErr) => {
        this.logger.error('Failed to add failed event to DLQ', dlqErr as Error, { eventId: envelope.eventId });
      });
    }
  }

  private async startConsumer(): Promise<void> {
    const { kafkaBrokers, consumerGroupId, fromBeginning } = this.getKafkaConfig();
    this.consumerGroupId = consumerGroupId;

    const kafka = new Kafka({
      clientId: 'claims-readmodel-service',
      brokers: kafkaBrokers,
    });

    this.consumer = kafka.consumer({ groupId: consumerGroupId });
    await this.consumer.connect();

    const topics = [
      'insurance.claim.registered',
      'insurance.claim.submitted',
      'insurance.claim.referred_to_adjuster',
      'insurance.claim.adjuster_assigned',
      'insurance.claim.assessed',
      'insurance.claim.approved',
      'insurance.claim.rejected',
      'insurance.claim.paid',
      'insurance.claim.closed',
      'insurance.fraud.score_computed',
      'insurance.fraud.case_opened',
      'insurance.fraud.case_closed',
      'insurance.complaint.created',
      'insurance.complaint.escalated',
      'insurance.complaint.sla_breached',
      'insurance.complaint.resolved',
      'insurance.complaint.status_changed',
      'insurance.complaint.attachment_added',
      'insurance.ri.recovery_identified',
      'insurance.ri.recovery_received',
    ];

    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning });
    }

    this.logger.info('Kafka consumer started', { groupId: consumerGroupId, fromBeginning });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.processMessage(payload.topic, payload.message, payload.partition);
      },
    });
  }

  // ---- Query API (tenant-scoped) ----

  async listClaims(params: { tenantId: string; policyId?: string; status?: string; limit: number; offset: number; cursor?: string }) {
    // P1 #8: cursor-based pagination (backward compatible — falls back to offset if no cursor)
    if (params.cursor) {
      const qb = this.rmRepo.createQueryBuilder('rm');
      qb.andWhere('rm.tenant_id = :tenantId', { tenantId: params.tenantId });
      if (params.policyId) qb.andWhere('rm.policy_id = :policyId', { policyId: params.policyId });
      if (params.status) qb.andWhere('rm.status = :status', { status: params.status });
      const result = await applyCursorPagination<RmClaimCase>(qb, params.cursor, params.limit, 'DESC', 'rm', 'updatedAt', 'claimId');
      return { rows: result.items, total: result.items.length, hasNext: result.hasNext, nextCursor: result.nextCursor };
    }

    const qb = this.rmRepo.createQueryBuilder('rm');
    qb.andWhere('rm.tenant_id = :tenantId', { tenantId: params.tenantId });

    if (params.policyId) qb.andWhere('rm.policy_id = :policyId', { policyId: params.policyId });
    if (params.status) qb.andWhere('rm.status = :status', { status: params.status });

    qb.orderBy('rm.updated_at', 'DESC').limit(params.limit).offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getClaim(claimId: string, tenantId: string): Promise<RmClaimCase | null> {
    return this.rmRepo.findOne({ where: { claimId, tenantId } });
  }

  async getSummary(tenantId: string): Promise<{ total: number; byStatus: Array<{ status: string; count: number }> }> {
    const rows = await this.rmRepo
      .createQueryBuilder('rm')
      .select('rm.status', 'status')
      .addSelect('COUNT(1)', 'count')
      .where('rm.tenant_id = :tenantId', { tenantId })
      .groupBy('rm.status')
      .getRawMany();

    const total = rows.reduce((acc: number, r: any) => acc + parseInt(r.count, 10), 0);

    return {
      total,
      byStatus: rows.map((r: any) => ({ status: r.status, count: parseInt(r.count, 10) })),
    };
  }

  async listFraudCases(params: { tenantId: string; status?: string; minScore?: number; limit: number; offset: number; cursor?: string }) {
    // P1 #8: cursor-based pagination (backward compatible)
    if (params.cursor) {
      const qb = this.rmFraudRepo.createQueryBuilder('rm');
      qb.andWhere('rm.tenant_id = :tenantId', { tenantId: params.tenantId });
      if (params.status) qb.andWhere('rm.status = :status', { status: params.status });
      if (typeof params.minScore === 'number') qb.andWhere('rm.latest_score >= :min', { min: params.minScore });
      const result = await applyCursorPagination<RmFraudCase>(qb, params.cursor, params.limit, 'DESC', 'rm', 'updatedAt', 'fraudCaseId');
      return { rows: result.items, total: result.items.length, hasNext: result.hasNext, nextCursor: result.nextCursor };
    }

    const qb = this.rmFraudRepo.createQueryBuilder('rm');
    qb.andWhere('rm.tenant_id = :tenantId', { tenantId: params.tenantId });

    if (params.status) qb.andWhere('rm.status = :status', { status: params.status });
    if (typeof params.minScore === 'number') qb.andWhere('rm.latest_score >= :min', { min: params.minScore });

    qb.orderBy('rm.updated_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async listComplaintsOps(params: { tenantId: string; status?: string; complaintType?: string; limit: number; offset: number; cursor?: string }) {
    // P1 #8: cursor-based pagination (backward compatible)
    if (params.cursor) {
      const qb = this.rmComplaintsRepo.createQueryBuilder('rm');
      qb.andWhere('rm.tenant_id = :tenantId', { tenantId: params.tenantId });
      if (params.status) qb.andWhere('rm.status = :status', { status: params.status });
      if (params.complaintType) qb.andWhere('rm.complaint_type = :complaintType', { complaintType: params.complaintType });
      const result = await applyCursorPagination<RmComplaintOps>(qb, params.cursor, params.limit, 'DESC', 'rm', 'updatedAt', 'complaintId');
      return { rows: result.items, total: result.items.length, hasNext: result.hasNext, nextCursor: result.nextCursor };
    }

    const qb = this.rmComplaintsRepo.createQueryBuilder('rm');
    qb.andWhere('rm.tenant_id = :tenantId', { tenantId: params.tenantId });

    if (params.status) qb.andWhere('rm.status = :status', { status: params.status });
    if (params.complaintType) qb.andWhere('rm.complaint_type = :complaintType', { complaintType: params.complaintType });

    qb.orderBy('rm.updated_at', 'DESC').limit(params.limit).offset(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  // ---- Operational helpers ----

  async getHealthMetrics(): Promise<{
    db: 'ok' | 'error';
    kafka: 'ok' | 'error' | 'unknown';
    dlqCount: number;
    lastProcessedAt: Date | null;
    consumerLag?: number;
  }> {
    let db: 'ok' | 'error' = 'error';
    try {
      await this.dataSource.query('SELECT 1');
      db = 'ok';
    } catch {
      db = 'error';
    }

    let kafkaStatus: 'ok' | 'error' | 'unknown' = 'unknown';
    if (this.consumer) {
      kafkaStatus = 'ok'; // rough approximation; consumer object exists
    }

    let dlqCount = 0;
    try {
      const dlqStats = await this.dlq?.getDLQStats();
      dlqCount = dlqStats?.total ?? 0;
    } catch {
      dlqCount = -1;
    }

    let lastProcessedAt: Date | null = null;
    try {
      const last = await this.dataSource.query(
        `SELECT MAX(processed_at) as max FROM consumed_events WHERE consumer_name = $1;`,
        [this.consumerGroupId],
      );
      if (last?.[0]?.max) lastProcessedAt = new Date(last[0].max);
    } catch {
      // ignore
    }

    return { db, kafka: kafkaStatus, dlqCount, lastProcessedAt };
  }

  async rebuildProjection(aggregateId?: string, tenantId?: string): Promise<{ processed: number; skipped: number }> {
    // P0 fix: replace silent-success placeholder with a real implementation.
    // Step 1: Clear the read model for the specified scope (tenant or aggregate or all).
    // Step 2: Reset consumed_events so the Kafka consumer can reprocess events.
    // Step 3: Replay from event store (Kafka). Since direct Kafka offset reset is not
    //         possible from within this method, we clear the state and throw a clear
    //         error instructing the operator to restart the consumer with
    //         KAFKA_CONSUMER_FROM_BEGINNING=true to trigger a full replay.

    this.logger.info('Rebuild projection requested', { aggregateId, tenantId });

    let deletedClaims = 0;
    let deletedFraud = 0;
    let deletedComplaints = 0;
    let resetConsumedEvents = 0;

    await this.dataSource.transaction(async (manager) => {
      // Step 1a: Clear RmClaimCase rows
      const claimWhere: string[] = [];
      const claimParams: any[] = [];
      if (tenantId) {
        claimWhere.push('tenant_id = $1');
        claimParams.push(tenantId);
      }
      if (aggregateId) {
        claimWhere.push('claim_id = $' + (claimParams.length + 1));
        claimParams.push(aggregateId);
      }
      const claimClause = claimWhere.length > 0 ? ' WHERE ' + claimWhere.join(' AND ') : '';
      const claimResult = await manager.query(`DELETE FROM rm_claims${claimClause} RETURNING claim_id`, claimParams);
      deletedClaims = Array.isArray(claimResult) ? claimResult.length : 0;

      // Step 1b: Clear RmFraudCase rows
      const fraudWhere: string[] = [];
      const fraudParams: any[] = [];
      if (tenantId) {
        fraudWhere.push('tenant_id = $1');
        fraudParams.push(tenantId);
      }
      if (aggregateId) {
        fraudWhere.push('claim_id = $' + (fraudParams.length + 1));
        fraudParams.push(aggregateId);
      }
      const fraudClause = fraudWhere.length > 0 ? ' WHERE ' + fraudWhere.join(' AND ') : '';
      const fraudResult = await manager.query(`DELETE FROM rm_fraud_cases${fraudClause} RETURNING claim_id`, fraudParams);
      deletedFraud = Array.isArray(fraudResult) ? fraudResult.length : 0;

      // Step 1c: Clear RmComplaintOps rows
      const complaintWhere: string[] = [];
      const complaintParams: any[] = [];
      if (tenantId) {
        complaintWhere.push('tenant_id = $1');
        complaintParams.push(tenantId);
      }
      if (aggregateId) {
        complaintWhere.push('complaint_id = $' + (complaintParams.length + 1));
        complaintParams.push(aggregateId);
      }
      const complaintClause = complaintWhere.length > 0 ? ' WHERE ' + complaintWhere.join(' AND ') : '';
      const complaintResult = await manager.query(`DELETE FROM rm_complaints${complaintClause} RETURNING complaint_id`, complaintParams);
      deletedComplaints = Array.isArray(complaintResult) ? complaintResult.length : 0;

      // Step 2: Reset consumed_events for this consumer group so events can be reprocessed.
      const consumedResult = await manager.query(
        `DELETE FROM consumed_events WHERE consumer_name = $1 RETURNING event_id`,
        [this.consumerGroupId],
      );
      resetConsumedEvents = Array.isArray(consumedResult) ? consumedResult.length : 0;
    });

    const totalDeleted = deletedClaims + deletedFraud + deletedComplaints;
    this.logger.info('Rebuild projection: read model cleared', {
      aggregateId,
      tenantId,
      deletedClaims,
      deletedFraud,
      deletedComplaints,
      resetConsumedEvents,
    });

    // Step 3: Replay from event store.
    // Direct Kafka topic replay from within this method is not possible because
    // the Kafka consumer manages its own offsets. The operator must restart the
    // service with KAFKA_CONSUMER_FROM_BEGINNING=true to trigger a full replay
    // of all events from the beginning. The consumed_events table has been
    // cleared so all events will be reprocessed.
    throw new Error(
      `rebuildProjection: read model cleared (${totalDeleted} rows deleted, ${resetConsumedEvents} consumed_events reset). ` +
      `To complete the rebuild, restart the service with KAFKA_CONSUMER_FROM_BEGINNING=true to replay all events from Kafka. ` +
      `If Kafka event store is not available, manual event replay is required.`,
    );
  }
}
