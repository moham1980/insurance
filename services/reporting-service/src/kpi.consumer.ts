import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { Repository } from 'typeorm';
import { ConsumedEvent, createLogger, EventEnvelope } from '@insurance/shared';
import { RmPolicyLifecycle } from './entities/RmPolicyLifecycle';
import { RmPolicy } from './entities/RmPolicy';
import { RmClaimPayment } from './entities/RmClaimPayment';
import { RmFraudSignal } from './entities/RmFraudSignal';
import { RmRiCeded } from './entities/RmRiCeded';
import { RmRiBorderaux } from './entities/RmRiBorderaux';
import { RmRiRecovery } from './entities/RmRiRecovery';
import { RmClaimDocumentsAttached } from './entities/RmClaimDocumentsAttached';
import { RmFraudCaseEscalation } from './entities/RmFraudCaseEscalation';
import { RmComplaintSlaBreach } from './entities/RmComplaintSlaBreach';

@Injectable()
export class KpiConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer?: Consumer;

  constructor(
    @InjectRepository(ConsumedEvent) private readonly consumedRepo: Repository<ConsumedEvent>,
    @InjectRepository(RmPolicyLifecycle) private readonly rmPolicyRepo: Repository<RmPolicyLifecycle>,
    @InjectRepository(RmPolicy) private readonly policyProjectionRepo: Repository<RmPolicy>,
    @InjectRepository(RmClaimPayment) private readonly rmClaimPaymentRepo: Repository<RmClaimPayment>,
    @InjectRepository(RmFraudSignal) private readonly rmFraudRepo: Repository<RmFraudSignal>,
    @InjectRepository(RmRiCeded) private readonly rmRiCededRepo: Repository<RmRiCeded>,
    @InjectRepository(RmRiBorderaux) private readonly rmRiBorderauxRepo: Repository<RmRiBorderaux>,
    @InjectRepository(RmRiRecovery) private readonly rmRiRecoveryRepo: Repository<RmRiRecovery>,
    @InjectRepository(RmClaimDocumentsAttached) private readonly rmClaimDocsRepo: Repository<RmClaimDocumentsAttached>,
    @InjectRepository(RmFraudCaseEscalation) private readonly rmFraudEscRepo: Repository<RmFraudCaseEscalation>,
    @InjectRepository(RmComplaintSlaBreach) private readonly rmComplaintSlaRepo: Repository<RmComplaintSlaBreach>
  ) {}

  private async applyClaimDocumentsAttached(envelope: EventEnvelope<any>): Promise<void> {
    if (envelope.eventType !== 'ClaimDocumentsAttached') return;
    const claimId = envelope.subject?.claimId || envelope.payload?.claimId;
    if (!claimId) return;

    const docs = Array.isArray(envelope.payload?.documents) ? envelope.payload.documents : [];
    const typeCounts: Record<string, number> = {};
    let lastDocumentId: string | null = null;
    for (const d of docs) {
      if (!d) continue;
      if (typeof d.documentId === 'string' && d.documentId.trim()) lastDocumentId = d.documentId;
      const t = typeof d.type === 'string' && d.type.trim() ? d.type.trim() : 'unknown';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }

    const existing = await this.rmClaimDocsRepo.findOne({ where: { claimId: String(claimId) } as any });
    const row = existing
      ? existing
      : this.rmClaimDocsRepo.create({
          tenantId: envelope.tenantId || null,
          claimId: String(claimId),
          documentsCount: 0,
          typesSummary: null,
          lastDocumentId: null,
          lastAttachedAt: null,
          lastEventId: null,
          updatedAt: new Date(),
        });

    const prevSummary = row.typesSummary || {};
    const nextSummary: Record<string, number> = { ...prevSummary };
    for (const [k, v] of Object.entries(typeCounts)) {
      nextSummary[k] = (nextSummary[k] || 0) + v;
    }

    row.documentsCount = Math.max(0, (row.documentsCount || 0) + docs.length);
    row.typesSummary = nextSummary;
    row.lastDocumentId = lastDocumentId || row.lastDocumentId;
    row.lastAttachedAt = this.parseOccurredAt(envelope);
    row.lastEventId = envelope.eventId;
    row.updatedAt = new Date();
    await this.rmClaimDocsRepo.save(row);
  }

  private async applyFraudCaseEscalated(envelope: EventEnvelope<any>): Promise<void> {
    if (envelope.eventType !== 'FraudCaseEscalated') return;
    const fraudCaseId = envelope.subject?.fraudCaseId || envelope.payload?.fraudCaseId;
    const claimId = envelope.subject?.claimId || envelope.payload?.claimId;
    if (!fraudCaseId || !claimId) return;

    const occurredAt = this.parseOccurredAt(envelope);
    const escalatedAtRaw = envelope.payload?.escalatedAt;
    let escalatedAt: Date | null = null;
    if (typeof escalatedAtRaw === 'string') {
      const d = new Date(escalatedAtRaw);
      escalatedAt = Number.isFinite(d.getTime()) ? d : null;
    }

    const reasonCodes = Array.isArray(envelope.payload?.reasonCodes)
      ? envelope.payload.reasonCodes.filter((x: any) => typeof x === 'string')
      : null;

    await this.rmFraudEscRepo.save(
      this.rmFraudEscRepo.create({
        tenantId: envelope.tenantId || null,
        eventId: envelope.eventId,
        occurredAt,
        correlationId: typeof envelope.correlationId === 'string' ? envelope.correlationId : null,
        fraudCaseId: String(fraudCaseId),
        claimId: String(claimId),
        claimNumber: envelope.payload?.claimNumber || null,
        escalatedAt,
        toUnit: String(envelope.payload?.toUnit || 'unknown'),
        reasonCodes,
        requiresHumanApproval:
          envelope.payload?.requiresHumanApproval !== undefined && envelope.payload?.requiresHumanApproval !== null
            ? Boolean(envelope.payload.requiresHumanApproval)
            : null,
        notes: typeof envelope.payload?.notes === 'string' ? envelope.payload.notes : null,
        updatedAt: new Date(),
      })
    );
  }

  private async applyComplaintSlaBreached(envelope: EventEnvelope<any>): Promise<void> {
    if (envelope.eventType !== 'ComplaintSlaBreached') return;
    const complaintId = envelope.subject?.complaintId || envelope.payload?.complaintId;
    if (!complaintId) return;

    const occurredAt = this.parseOccurredAt(envelope);
    const breachedAtRaw = envelope.payload?.breachedAt;
    let breachedAt: Date | null = null;
    if (typeof breachedAtRaw === 'string') {
      const d = new Date(breachedAtRaw);
      breachedAt = Number.isFinite(d.getTime()) ? d : null;
    }

    const toDate = (v: any): Date | null => {
      if (!v) return null;
      const d = new Date(String(v));
      return Number.isFinite(d.getTime()) ? d : null;
    };

    const slaHours = envelope.payload?.slaHours;
    const elapsedHours = envelope.payload?.elapsedHours;

    await this.rmComplaintSlaRepo.save(
      this.rmComplaintSlaRepo.create({
        tenantId: envelope.tenantId || null,
        eventId: envelope.eventId,
        occurredAt,
        correlationId: typeof envelope.correlationId === 'string' ? envelope.correlationId : null,
        complaintId: String(complaintId),
        complaintType: envelope.payload?.complaintType || null,
        status: envelope.payload?.status || null,
        assignedTo: envelope.payload?.assignedTo || null,
        policyId: envelope.payload?.policyId || envelope.subject?.policyId || null,
        claimId: envelope.payload?.claimId || envelope.subject?.claimId || null,
        slaFirstResponseDueAt: toDate(envelope.payload?.slaFirstResponseDueAt),
        slaResolutionDueAt: toDate(envelope.payload?.slaResolutionDueAt),
        breachedAt,
        slaHours: typeof slaHours === 'number' && Number.isFinite(slaHours) ? Math.trunc(slaHours) : null,
        elapsedHours: typeof elapsedHours === 'number' && Number.isFinite(elapsedHours) ? Math.trunc(elapsedHours) : null,
        updatedAt: new Date(),
      })
    );
  }

  private logger = createLogger({
    serviceName: 'reporting-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  async onModuleInit(): Promise<void> {
    await this.start();
  }

  private async applyRiCeded(envelope: EventEnvelope<any>): Promise<void> {
    if (envelope.eventType !== 'CededCalculated') return;

    const contractId = envelope.subject?.contractId;
    if (!contractId) return;

    const policyId = envelope.subject?.policyId || null;
    const claimId = envelope.subject?.claimId || null;
    const riKey = `${contractId}:${policyId || '-'}:${claimId || '-'}`;
    const occurredAt = this.parseOccurredAt(envelope);

    await this.rmRiCededRepo.save(
      this.rmRiCededRepo.create({
        tenantId: envelope.tenantId || null,
        riKey,
        contractId,
        policyId,
        claimId,
        calculationBasis: String(envelope.payload?.calculationBasis || 'policy'),
        grossAmount:
          envelope.payload?.grossAmount !== undefined && envelope.payload?.grossAmount !== null ? String(envelope.payload.grossAmount) : null,
        cededAmount:
          envelope.payload?.cededAmount !== undefined && envelope.payload?.cededAmount !== null ? String(envelope.payload.cededAmount) : null,
        retainedAmount:
          envelope.payload?.retainedAmount !== undefined && envelope.payload?.retainedAmount !== null ? String(envelope.payload.retainedAmount) : null,
        currency: envelope.payload?.currency || null,
        counterpartyId: envelope.payload?.counterpartyId || null,
        occurredAt,
        lastEventId: envelope.eventId,
        updatedAt: new Date(),
      })
    );
  }

  private async applyRiBorderaux(envelope: EventEnvelope<any>): Promise<void> {
    if (envelope.eventType !== 'BorderauxGenerated') return;

    const borderauxId = envelope.subject?.borderauxId;
    const contractId = envelope.subject?.contractId;
    if (!borderauxId || !contractId) return;

    const occurredAt = this.parseOccurredAt(envelope);
    const periodStart = new Date(envelope.payload?.periodStart);
    const periodEnd = new Date(envelope.payload?.periodEnd);

    await this.rmRiBorderauxRepo.save(
      this.rmRiBorderauxRepo.create({
        tenantId: envelope.tenantId || null,
        borderauxId,
        contractId,
        periodStart: Number.isNaN(periodStart.getTime()) ? new Date(0) : periodStart,
        periodEnd: Number.isNaN(periodEnd.getTime()) ? new Date(0) : periodEnd,
        itemsCount: typeof envelope.payload?.itemsCount === 'number' ? envelope.payload.itemsCount : 0,
        documentId: envelope.payload?.documentId ?? null,
        occurredAt,
        lastEventId: envelope.eventId,
        updatedAt: new Date(),
      })
    );
  }

  private async applyRiRecovery(envelope: EventEnvelope<any>): Promise<void> {
    if (envelope.eventType !== 'RecoveryIdentified' && envelope.eventType !== 'RecoveryReceived') return;

    const recoveryId = envelope.subject?.recoveryId;
    const claimId = envelope.subject?.claimId;
    const contractId = envelope.subject?.contractId;
    if (!recoveryId || !claimId || !contractId) return;

    const existing = await this.rmRiRecoveryRepo.findOne({ where: { recoveryId } as any });
    const row = existing
      ? existing
      : this.rmRiRecoveryRepo.create({
          tenantId: envelope.tenantId || null,
          recoveryId,
          claimId,
          contractId,
          counterpartyId: null,
          recoverableAmount: null,
          recoveredAmount: null,
          currency: null,
          identifiedAt: null,
          receivedAt: null,
          occurredAt: null,
          lastEventId: null,
          updatedAt: new Date(),
        });

    row.counterpartyId = envelope.payload?.counterpartyId || row.counterpartyId;
    row.currency = envelope.payload?.currency || row.currency;
    row.occurredAt = this.parseOccurredAt(envelope);

    if (envelope.eventType === 'RecoveryIdentified') {
      row.recoverableAmount =
        envelope.payload?.recoverableAmount !== undefined && envelope.payload?.recoverableAmount !== null
          ? String(envelope.payload.recoverableAmount)
          : row.recoverableAmount;
      row.identifiedAt = envelope.payload?.identifiedAt ? new Date(envelope.payload.identifiedAt) : row.identifiedAt;
    }

    if (envelope.eventType === 'RecoveryReceived') {
      row.recoveredAmount =
        envelope.payload?.amount !== undefined && envelope.payload?.amount !== null ? String(envelope.payload.amount) : row.recoveredAmount;
      row.receivedAt = envelope.payload?.receivedAt ? new Date(envelope.payload.receivedAt) : row.receivedAt;
    }

    row.lastEventId = envelope.eventId;
    row.updatedAt = new Date();
    await this.rmRiRecoveryRepo.save(row);
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect();
  }

  private getKafkaConfig() {
    const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const consumerGroupId = process.env.KAFKA_CONSUMER_GROUP || 'reporting-kpi-v1';
    return { kafkaBrokers, consumerGroupId };
  }

  private async ensureIdempotent(eventId: string, consumerName: string, topic: string, tenantId?: string): Promise<boolean> {
    const existing = await this.consumedRepo.findOne({ where: { eventId, consumerName } });
    if (existing) return false;

    const consumed = this.consumedRepo.create({
      tenantId: tenantId || 'unknown',
      eventId,
      consumerName,
      topic,
    });
    await this.consumedRepo.save(consumed);
    return true;
  }

  private parseOccurredAt(envelope: EventEnvelope<any>): Date {
    const d = new Date(envelope.occurredAt);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }

  private async applyPolicyEvent(envelope: EventEnvelope<any>): Promise<void> {
    const policyId = envelope.subject?.policyId || envelope.payload?.policyId;
    if (!policyId) return;

    const occurredAt = this.parseOccurredAt(envelope);
    const policyNumber = envelope.subject?.policyNumber || envelope.payload?.policyNumber || null;

    const existing = await this.rmPolicyRepo.findOne({ where: { policyId } });
    const row = existing
      ? existing
      : this.rmPolicyRepo.create({
          tenantId: envelope.tenantId || null,
          policyId,
          policyNumber,
          quotedAt: null,
          docsSubmittedAt: null,
          riskAssessedAt: null,
          issuedAt: null,
          uniqueCodeSetAt: null,
          updatedAt: new Date(),
        });

    row.policyNumber = row.policyNumber || policyNumber;

    switch (envelope.eventType) {
      case 'PolicyQuoted':
        row.quotedAt = row.quotedAt || occurredAt;
        break;
      case 'PolicyDocsSubmitted':
        row.docsSubmittedAt = row.docsSubmittedAt || occurredAt;
        break;
      case 'PolicyRiskAssessed':
        row.riskAssessedAt = row.riskAssessedAt || occurredAt;
        break;
      case 'PolicyIssued':
        row.issuedAt = row.issuedAt || occurredAt;
        break;
      case 'PolicyUniqueCodeSet':
        row.uniqueCodeSetAt = row.uniqueCodeSetAt || occurredAt;
        break;
      default:
        return;
    }

    row.updatedAt = new Date();
    await this.rmPolicyRepo.save(row);
    await this.applyPolicyProjection(envelope, policyNumber, occurredAt);
  }

  private async applyPolicyProjection(envelope: EventEnvelope<any>, policyNumberArg: string | null, occurredAt: Date): Promise<void> {
    const policyId = envelope.subject?.policyId || envelope.payload?.policyId;
    if (!policyId) return;

    const payload = envelope.payload || {};
    const existing = await this.policyProjectionRepo.findOne({ where: { policyId } });
    const row = existing
      ? existing
      : this.policyProjectionRepo.create({
          tenantId: envelope.tenantId || null,
          policyId,
          policyNumber: policyNumberArg || payload.policyNumber || null,
          status: payload.status || 'draft',
          createdAt: this.parseOccurredAt(envelope),
          updatedAt: new Date(),
        });

    row.policyNumber = row.policyNumber || policyNumberArg || payload.policyNumber || null;
    row.tenantId = envelope.tenantId || row.tenantId || null;

    if (payload.productId !== undefined) row.productId = payload.productId || row.productId;
    if (payload.productName !== undefined) row.productName = payload.productName || row.productName;
    if (payload.lineOfBusiness !== undefined) row.lineOfBusiness = payload.lineOfBusiness || row.lineOfBusiness;
    if (payload.uniqueCode !== undefined) row.uniqueCode = payload.uniqueCode || row.uniqueCode;
    if (payload.brokerOrganizationId !== undefined) row.brokerOrganizationId = payload.brokerOrganizationId || row.brokerOrganizationId;
    if (payload.issuerOrganizationId !== undefined) row.issuerOrganizationId = payload.issuerOrganizationId || row.issuerOrganizationId;
    if (payload.status !== undefined) row.status = payload.status || row.status;
    if (payload.holderPartyId !== undefined) row.holderPartyId = payload.holderPartyId || row.holderPartyId;
    if (payload.insuredPartyId !== undefined) row.insuredPartyId = payload.insuredPartyId || row.insuredPartyId;

    const startDate = payload.startDate ? this.parseOptionalDate(payload.startDate) : null;
    const endDate = payload.endDate ? this.parseOptionalDate(payload.endDate) : null;
    if (startDate) row.effectiveFrom = startDate;
    if (endDate) row.effectiveTo = endDate;

    if (payload.premiumAmount !== undefined && payload.premiumAmount !== null) row.premiumAmount = String(payload.premiumAmount);
    if (payload.sumInsured !== undefined && payload.sumInsured !== null) row.sumInsured = String(payload.sumInsured);
    if (payload.currency !== undefined) row.currency = payload.currency || row.currency;

    switch (envelope.eventType) {
      case 'PolicyQuoted':
        row.quotedAt = row.quotedAt || occurredAt;
        break;
      case 'PolicyIssued':
        row.issuedAt = row.issuedAt || occurredAt;
        break;
      case 'PolicyRenewed':
        row.renewedAt = row.renewedAt || occurredAt;
        row.renewalCount = (row.renewalCount || 0) + 1;
        if (payload.renewalParentId !== undefined) row.renewalParentId = payload.renewalParentId;
        break;
      case 'PolicyCancelled':
        row.cancelledAt = row.cancelledAt || occurredAt;
        break;
      case 'PolicyUniqueCodeSet':
        if (payload.uniqueCode !== undefined) row.uniqueCode = payload.uniqueCode || row.uniqueCode;
        break;
    }

    if (payload.autoRenew !== undefined) row.autoRenew = Boolean(payload.autoRenew);
    if (payload.renewalCount !== undefined && !Number.isNaN(Number(payload.renewalCount))) row.renewalCount = Number(payload.renewalCount);

    row.updatedAt = new Date();
    await this.policyProjectionRepo.save(row);
  }

  private parseOptionalDate(value: any): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private async applyClaimEvent(envelope: EventEnvelope<any>): Promise<void> {
    const claimId = envelope.subject?.claimId || envelope.payload?.claimId;
    if (!claimId) return;

    const occurredAt = this.parseOccurredAt(envelope);
    const claimNumber = envelope.subject?.claimNumber || envelope.payload?.claimNumber || null;
    const policyId = envelope.subject?.policyId || envelope.payload?.policyId || null;

    const existing = await this.rmClaimPaymentRepo.findOne({ where: { claimId } });
    const row = existing
      ? existing
      : this.rmClaimPaymentRepo.create({
          tenantId: envelope.tenantId || null,
          claimId,
          claimNumber,
          policyId,
          registeredAt: null,
          paymentExecutedAt: null,
          claimPaidAt: null,
          updatedAt: new Date(),
        });

    row.claimNumber = row.claimNumber || claimNumber;
    row.policyId = row.policyId || policyId;

    switch (envelope.eventType) {
      case 'ClaimRegistered':
        row.registeredAt = row.registeredAt || occurredAt;
        break;
      case 'ClaimPaymentRequested':
        row.paymentRequestedAt = row.paymentRequestedAt || occurredAt;
        row.approvedAmount =
          envelope.payload?.approvedAmount !== undefined && envelope.payload?.approvedAmount !== null
            ? String(envelope.payload.approvedAmount)
            : row.approvedAmount;
        break;
      case 'ClaimPaid':
        row.claimPaidAt = row.claimPaidAt || occurredAt;
        break;
      default:
        return;
    }

    row.updatedAt = new Date();
    await this.rmClaimPaymentRepo.save(row);
  }

  private async applyPaymentEvent(envelope: EventEnvelope<any>): Promise<void> {
    if (envelope.eventType !== 'PaymentExecuted') return;

    const claimId = envelope.subject?.claimId || envelope.payload?.claimId;
    if (!claimId) return;

    const occurredAt = this.parseOccurredAt(envelope);

    const existing = await this.rmClaimPaymentRepo.findOne({ where: { claimId } });
    const row = existing
      ? existing
      : this.rmClaimPaymentRepo.create({
          tenantId: envelope.tenantId || null,
          claimId,
          claimNumber: envelope.payload?.claimNumber || null,
          policyId: envelope.payload?.policyId || null,
          registeredAt: null,
          paymentExecutedAt: null,
          claimPaidAt: null,
          updatedAt: new Date(),
        });

    row.paymentExecutedAt = row.paymentExecutedAt || occurredAt;
    row.updatedAt = new Date();
    await this.rmClaimPaymentRepo.save(row);
  }

  private async applyFraudEvent(envelope: EventEnvelope<any>): Promise<void> {
    const claimId = envelope.subject?.claimId || envelope.payload?.claimId;
    if (!claimId) return;

    const occurredAt = this.parseOccurredAt(envelope);
    const claimNumber = envelope.subject?.claimNumber || envelope.payload?.claimNumber || null;

    const existing = await this.rmFraudRepo.findOne({ where: { claimId } });
    const row = existing
      ? existing
      : this.rmFraudRepo.create({
          tenantId: envelope.tenantId || null,
          claimId,
          claimNumber,
          latestScore: null,
          holdClaim: null,
          scoreComputedAt: null,
          caseOpenedAt: null,
          caseClosedAt: null,
          caseResolution: null,
          updatedAt: new Date(),
        });

    row.claimNumber = row.claimNumber || claimNumber;

    switch (envelope.eventType) {
      case 'FraudScoreComputed':
        row.latestScore = typeof envelope.payload?.score === 'number' ? envelope.payload.score : row.latestScore;
        row.holdClaim = typeof envelope.payload?.holdClaim === 'boolean' ? envelope.payload.holdClaim : row.holdClaim;
        row.scoreComputedAt = row.scoreComputedAt || occurredAt;
        break;
      case 'FraudCaseOpened':
        row.caseOpenedAt = row.caseOpenedAt || occurredAt;
        break;
      case 'FraudCaseClosed':
        row.caseClosedAt = row.caseClosedAt || occurredAt;
        row.caseResolution = (envelope.payload?.resolution as string) || row.caseResolution;
        break;
      default:
        return;
    }

    row.updatedAt = new Date();
    await this.rmFraudRepo.save(row);
  }

  private async applyEvent(topic: string, envelope: EventEnvelope<any>): Promise<void> {
    if (topic.startsWith('insurance.policy.')) return this.applyPolicyEvent(envelope);
    if (topic.startsWith('insurance.claim.')) return this.applyClaimEvent(envelope);
    if (topic.startsWith('insurance.payment.')) return this.applyPaymentEvent(envelope);
    if (topic.startsWith('insurance.fraud.')) return this.applyFraudEvent(envelope);
    if (topic === 'insurance.claim.documents_attached') return this.applyClaimDocumentsAttached(envelope);
    if (topic === 'insurance.fraud.case.escalated') return this.applyFraudCaseEscalated(envelope);
    if (topic === 'insurance.complaint.sla_breached') return this.applyComplaintSlaBreached(envelope);
    if (topic.startsWith('insurance.ri.')) {
      await this.applyRiCeded(envelope);
      await this.applyRiBorderaux(envelope);
      await this.applyRiRecovery(envelope);
    }
  }

  private async start(): Promise<void> {
    const { kafkaBrokers, consumerGroupId } = this.getKafkaConfig();

    const kafka = new Kafka({
      clientId: 'reporting-service',
      brokers: kafkaBrokers.map((x) => x.trim()).filter(Boolean),
    });

    this.consumer = kafka.consumer({ groupId: consumerGroupId });
    await this.consumer.connect();

    const topics = [
      'insurance.policy.quoted',
      'insurance.policy.docs_submitted',
      'insurance.policy.risk_assessed',
      'insurance.policy.underwriting_decided',
      'insurance.policy.issued',
      'insurance.policy.unique_code_set',
      'insurance.policy.endorsed',
      'insurance.policy.cancelled',
      'insurance.policy.renewed',
      'insurance.claim.registered',
      'insurance.claim.payment_requested',
      'insurance.claim.paid',
      'insurance.payment.executed',
      'insurance.fraud.score_computed',
      'insurance.fraud.case_opened',
      'insurance.fraud.case_closed',
      'insurance.fraud.case.escalated',
      'insurance.complaint.sla_breached',
      'insurance.claim.documents_attached',
      'insurance.ri.ceded_calculated',
      'insurance.ri.borderaux_generated',
      'insurance.ri.recovery_identified',
      'insurance.ri.recovery_received',
    ];

    for (const t of topics) {
      await this.consumer.subscribe({ topic: t, fromBeginning: true });
    }

    this.logger.info('Kafka consumer started', { groupId: consumerGroupId });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const { topic, message } = payload;
        const raw = message.value?.toString('utf-8');
        if (!raw) return;

        let envelope: EventEnvelope<any>;
        try {
          envelope = JSON.parse(raw) as EventEnvelope<any>;
        } catch {
          this.logger.error('Failed to parse Kafka message', undefined, { topic });
          return;
        }

        const should = await this.ensureIdempotent(envelope.eventId, consumerGroupId, topic, envelope.tenantId);
        if (!should) return;

        try {
          await this.applyEvent(topic, envelope);
        } catch (err: any) {
          this.logger.error('Failed to apply event, sending to DLQ', err instanceof Error ? err : new Error(String(err)), {
            topic,
            eventId: envelope.eventId,
          });
        }
      },
    });
  }
}
