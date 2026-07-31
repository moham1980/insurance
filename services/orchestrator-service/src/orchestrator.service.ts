import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';
import { KafkaProducer, OutboxPublisher, createEventEnvelope, createLogger, Logger } from '@insurance/shared';
import { SagaInstance } from './entities/SagaInstance';
import { SagaStep } from './entities/SagaStep';
import { WorkItem, WorkItemPriority, WorkItemStatus } from './entities/WorkItem';

@Injectable()
export class OrchestratorService implements OnModuleInit, OnModuleDestroy {
  private logger: Logger;
  private kafkaProducer?: KafkaProducer;
  private readonly txStore = new AsyncLocalStorage<EntityManager>();

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(SagaInstance) private readonly sagaRepoDefault: Repository<SagaInstance>,
    @InjectRepository(SagaStep) private readonly sagaStepRepoDefault: Repository<SagaStep>,
    @InjectRepository(WorkItem) private readonly workItemRepoDefault: Repository<WorkItem>
  ) {
    this.logger = createLogger({
      serviceName: 'orchestrator-service',
      prettyPrint: process.env.NODE_ENV !== 'production',
    });
  }

  private getManager(): EntityManager {
    return this.txStore.getStore() ?? this.dataSource.manager;
  }

  get sagaRepo(): Repository<SagaInstance> {
    return this.getManager().getRepository(SagaInstance);
  }

  get sagaStepRepo(): Repository<SagaStep> {
    return this.getManager().getRepository(SagaStep);
  }

  get workItemRepo(): Repository<WorkItem> {
    return this.getManager().getRepository(WorkItem);
  }

  async runWithManager<T>(manager: EntityManager, fn: () => Promise<T>): Promise<T> {
    return this.txStore.run(manager, fn);
  }

  async onFraudScoreComputed(params: {
    tenantId: string;
    topic: string;
    correlationId: string;
    claimId: string;
    payload: any;
  }): Promise<void> {
    const holdClaim = Boolean(params?.payload?.payload?.holdClaim);
    if (!holdClaim) return;

    const score = params?.payload?.payload?.score;
    const signals = params?.payload?.payload?.signals;

    await this.createSuspiciousCaseWorkItem({
      tenantId: params.tenantId,
      correlationId: params.correlationId,
      claimId: params.claimId,
      reasonCodes: Array.isArray(signals) && signals.length > 0 ? signals : ['FRAUD_SCORE_HOLD'],
      fraudScore: typeof score === 'number' ? score : undefined,
      explainability: {
        sourceEvent: params.topic,
        score,
        signals,
      },
      createdBy: null,
    });
  }

  async onDocumentNeedsReview(params: {
    tenantId: string;
    topic: string;
    correlationId: string;
    claimId: string;
    documentId: string;
    payload: any;
  }): Promise<void> {
    const saga = this.sagaRepo.create({
      sagaId: uuidv4(),
      tenantId: params.tenantId,
      sagaType: 'ClaimPayment',
      status: 'waiting',
      correlationId: params.correlationId,
      claimId: params.claimId,
      policyId: null,
      currentStep: 'DOCUMENT_REVIEW',
      completedSteps: ['INITIATED'],
      context: {
        documentId: params.documentId,
        payload: params.payload,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    });
    await this.sagaRepo.save(saga);

    const workItem = await this.createWorkItem({
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      stepName: 'DOCUMENT_REVIEW',
      workItemType: 'document_review',
      claimId: params.claimId,
      context: {
        documentId: params.documentId,
        topic: params.topic,
        payload: params.payload,
      },
      priority: WorkItemPriority.high,
    });

    await this.publishSagaEvent('insurance.saga.document_review.required', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      workItemId: workItem.workItemId,
      correlationId: params.correlationId,
      claimId: params.claimId,
      documentId: params.documentId,
    });
  }

  async onComplaintCreated(params: {
    tenantId: string;
    topic: string;
    correlationId: string;
    complaintId: string;
    payload: any;
  }): Promise<void> {
    const saga = this.sagaRepo.create({
      sagaId: uuidv4(),
      tenantId: params.tenantId,
      sagaType: 'ComplaintResolution',
      status: 'waiting',
      correlationId: params.correlationId,
      claimId: params.payload?.subject?.claimId || null,
      policyId: params.payload?.subject?.policyId || null,
      currentStep: 'COMPLAINT_TRIAGE',
      completedSteps: ['INITIATED'],
      context: {
        complaintId: params.complaintId,
        complaintType: params.payload?.payload?.complaintType,
        priority: params.payload?.payload?.priority,
        payload: params.payload,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    });
    await this.sagaRepo.save(saga);

    const workItem = await this.createWorkItem({
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      stepName: 'COMPLAINT_TRIAGE',
      workItemType: 'complaint_triage',
      claimId: params.payload?.subject?.claimId || undefined,
      policyId: params.payload?.subject?.policyId || undefined,
      context: {
        complaintId: params.complaintId,
        complaintType: params.payload?.payload?.complaintType,
        description: params.payload?.payload?.description,
      },
      priority: WorkItemPriority.high,
    });

    await this.publishSagaEvent('insurance.complaint.routed', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      workItemId: workItem.workItemId,
      correlationId: params.correlationId,
      complaintId: params.complaintId,
      claimId: params.payload?.subject?.claimId || null,
      policyId: params.payload?.subject?.policyId || null,
    });

    this.logger.info('Complaint triage work item created', { sagaId: saga.sagaId,
      tenantId: saga.tenantId, workItemId: workItem.workItemId, complaintId: params.complaintId });
  }

  async onComplaintSlaBreached(params: {
    tenantId: string;
    topic: string;
    correlationId: string;
    complaintId: string;
    payload: any;
  }): Promise<void> {
    const p = params?.payload?.payload || {};

    const saga = this.sagaRepo.create({
      sagaId: uuidv4(),
      tenantId: params.tenantId,
      sagaType: 'ComplaintResolution',
      status: 'waiting',
      correlationId: params.correlationId,
      claimId: params.payload?.subject?.claimId || p?.claimId || null,
      policyId: params.payload?.subject?.policyId || p?.policyId || null,
      currentStep: 'COMPLAINT_SLA_BREACH',
      completedSteps: ['INITIATED'],
      context: {
        complaintId: params.complaintId,
        breachType: 'resolution',
        breachedAt: p?.breachedAt || null,
        slaHours: p?.slaHours ?? null,
        elapsedHours: p?.elapsedHours ?? null,
        complaintType: p?.complaintType || null,
        status: p?.status || null,
        assignedTo: p?.assignedTo || null,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    });
    await this.sagaRepo.save(saga);

    const workItem = await this.createWorkItem({
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      stepName: 'COMPLAINT_SLA_BREACH',
      workItemType: 'complaint_sla_breach',
      claimId: saga.claimId || undefined,
      policyId: saga.policyId || undefined,
      context: {
        complaintId: params.complaintId,
        topic: params.topic,
        payload: params.payload,
      },
      priority: WorkItemPriority.critical,
    });

    await this.publishSagaEvent('insurance.saga.complaint.sla_breach.required', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      workItemId: workItem.workItemId,
      correlationId: params.correlationId,
      complaintId: params.complaintId,
      claimId: saga.claimId,
      policyId: saga.policyId,
      breachedAt: p?.breachedAt || null,
      elapsedHours: p?.elapsedHours ?? null,
    });

    this.logger.info('Complaint SLA breach work item created', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      workItemId: workItem.workItemId,
      complaintId: params.complaintId,
    });
  }

  async onFraudCaseEscalated(params: {
    tenantId: string;
    topic: string;
    correlationId: string;
    fraudCaseId: string;
    claimId: string;
    payload: any;
  }): Promise<void> {
    const p = params?.payload?.payload || {};

    const saga = this.sagaRepo.create({
      sagaId: uuidv4(),
      tenantId: params.tenantId,
      sagaType: 'FraudInvestigation',
      status: 'waiting',
      correlationId: params.correlationId,
      claimId: params.claimId,
      policyId: null,
      currentStep: 'FRAUD_CASE_ESCALATION',
      completedSteps: ['INITIATED'],
      context: {
        fraudCaseId: params.fraudCaseId,
        claimId: params.claimId,
        claimNumber: p?.claimNumber || null,
        toUnit: p?.toUnit || null,
        reasonCodes: Array.isArray(p?.reasonCodes) ? p.reasonCodes : [],
        requiresHumanApproval: p?.requiresHumanApproval ?? null,
        escalatedAt: p?.escalatedAt || null,
        notes: p?.notes || null,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    });
    await this.sagaRepo.save(saga);

    const workItem = await this.createWorkItem({
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      stepName: 'FRAUD_CASE_ESCALATION',
      workItemType: 'fraud_case_escalation',
      claimId: params.claimId,
      context: {
        fraudCaseId: params.fraudCaseId,
        claimId: params.claimId,
        toUnit: p?.toUnit || null,
        reasonCodes: Array.isArray(p?.reasonCodes) ? p.reasonCodes : [],
        requiresHumanApproval: p?.requiresHumanApproval ?? null,
        notes: p?.notes || null,
        topic: params.topic,
      },
      priority: p?.requiresHumanApproval === false ? WorkItemPriority.high : WorkItemPriority.critical,
    });

    await this.publishSagaEvent('insurance.saga.fraud.case_escalation.required', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      workItemId: workItem.workItemId,
      correlationId: params.correlationId,
      fraudCaseId: params.fraudCaseId,
      claimId: params.claimId,
      toUnit: p?.toUnit || null,
      reasonCodes: Array.isArray(p?.reasonCodes) ? p.reasonCodes : [],
      requiresHumanApproval: p?.requiresHumanApproval ?? null,
      escalatedAt: p?.escalatedAt || null,
    });

    this.logger.info('Fraud case escalation work item created', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      workItemId: workItem.workItemId,
      fraudCaseId: params.fraudCaseId,
      claimId: params.claimId,
    });
  }

  private async handlePaymentPrepareStep(saga: SagaInstance): Promise<void> {
    saga.currentStep = 'PAYMENT_PREPARE';
    saga.status = 'waiting';
    saga.updatedAt = new Date();
    await this.sagaRepo.save(saga);

    const workItem = await this.createWorkItem({
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      stepName: 'PAYMENT_PREPARE',
      workItemType: 'payment_prepare',
      claimId: saga.claimId || undefined,
      context: { approvedAmount: saga.context?.approvedAmount },
      priority: WorkItemPriority.high,
    });

    await this.publishSagaEvent('insurance.saga.payment.prepare.required', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      claimId: saga.claimId,
      workItemId: workItem.workItemId,
    });
  }

  private async handleFinanceApprovalStep(saga: SagaInstance): Promise<void> {
    saga.currentStep = 'FINANCE_APPROVAL';
    saga.status = 'waiting';
    saga.updatedAt = new Date();
    await this.sagaRepo.save(saga);

    const workItem = await this.createWorkItem({
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      stepName: 'FINANCE_APPROVAL',
      workItemType: 'payment_finance_approval',
      claimId: saga.claimId || undefined,
      context: {
        approvedAmount: saga.context?.approvedAmount,
        paymentIntentId: saga.context?.paymentIntentId,
      },
      priority: WorkItemPriority.high,
    });

    await this.publishSagaEvent('insurance.saga.payment.finance_approval.required', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      claimId: saga.claimId,
      workItemId: workItem.workItemId,
      paymentIntentId: saga.context?.paymentIntentId || null,
    });
  }

  private async handlePaymentExecuteStep(saga: SagaInstance): Promise<void> {
    saga.currentStep = 'PAYMENT_EXECUTE';
    saga.status = 'waiting';
    saga.updatedAt = new Date();
    await this.sagaRepo.save(saga);

    const workItem = await this.createWorkItem({
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      stepName: 'PAYMENT_EXECUTE',
      workItemType: 'payment_execute',
      claimId: saga.claimId || undefined,
      context: { paymentIntentId: saga.context?.paymentIntentId },
      priority: WorkItemPriority.high,
    });

    await this.publishSagaEvent('insurance.saga.payment.execute.required', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      claimId: saga.claimId,
      workItemId: workItem.workItemId,
      paymentIntentId: saga.context?.paymentIntentId || null,
    });
  }

  private async handlePaymentNotifyStep(saga: SagaInstance): Promise<void> {
    saga.currentStep = 'PAYMENT_NOTIFY';
    saga.status = 'waiting';
    saga.updatedAt = new Date();
    await this.sagaRepo.save(saga);

    const workItem = await this.createWorkItem({
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      stepName: 'PAYMENT_NOTIFY',
      workItemType: 'payment_notify',
      claimId: saga.claimId || undefined,
      context: { paymentIntentId: saga.context?.paymentIntentId },
      priority: WorkItemPriority.medium,
    });

    await this.publishSagaEvent('insurance.saga.payment.notify.required', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      claimId: saga.claimId,
      workItemId: workItem.workItemId,
      paymentIntentId: saga.context?.paymentIntentId || null,
    });
  }

  async onModuleInit(): Promise<void> {
    const brokersEnv = process.env.KAFKA_BROKERS;
    if (brokersEnv) {
      this.kafkaProducer = new KafkaProducer(
        {
          brokers: brokersEnv.split(','),
          clientId: process.env.KAFKA_CLIENT_ID || 'orchestrator-service',
        },
        this.logger
      );
      await this.kafkaProducer.connect();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.kafkaProducer?.disconnect();
  }

  private async publishSagaEvent(topic: string, event: any): Promise<void> {
    const correlationId = String(event?.correlationId || uuidv4());
    const tenantId =
      (typeof event?.tenantId === 'string' && event.tenantId.length > 0 ? event.tenantId : undefined) ||
      '00000000-0000-0000-0000-000000000000';
    const traceparent = typeof event?.traceparent === 'string' && event.traceparent.length > 0 ? event.traceparent : undefined;

    const envelope = createEventEnvelope({
      eventId: uuidv4(),
      eventType: topic,
      eventVersion: 1,
      producer: 'orchestrator-service',
      correlationId,
      tenantId,
      traceparent,
      subject: {
        sagaId: event?.sagaId ? String(event.sagaId) : undefined,
        claimId: event?.claimId ? String(event.claimId) : undefined,
        policyId: event?.policyId ? String(event.policyId) : undefined,
        workItemId: event?.workItemId ? String(event.workItemId) : undefined,
      },
      payload: event,
    });

    // Use Outbox pattern for reliable event publishing within a transaction
    const publishPayload = {
      topic,
      eventType: envelope.eventType,
      eventVersion: envelope.eventVersion,
      correlationId,
      tenantId,
      subject: Object.fromEntries(Object.entries(envelope.subject).filter(([, v]) => v !== undefined)) as Record<string, string>,
      payload: envelope,
    };

    const activeManager = this.txStore.getStore();
    if (activeManager) {
      const outboxPublisher = new OutboxPublisher(activeManager);
      await outboxPublisher.publish(publishPayload);
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      const outboxPublisher = new OutboxPublisher(manager);
      await outboxPublisher.publish(publishPayload);
    });
  }

  private async createWorkItem(params: {
    tenantId: string;
    sagaId: string;
    stepName: string;
    workItemType: WorkItem['workItemType'];
    claimId?: string;
    policyId?: string;
    context?: Record<string, any>;
    priority?: WorkItemPriority;
  }): Promise<WorkItem> {
    const workItem = this.workItemRepo.create({
      workItemId: uuidv4(),
      tenantId: params.tenantId,
      sagaId: params.sagaId,
      stepName: params.stepName,
      workItemType: params.workItemType,
      status: WorkItemStatus.pending,
      claimId: params.claimId || null,
      policyId: params.policyId || null,
      context: params.context || {},
      priority: params.priority || WorkItemPriority.medium,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.workItemRepo.save(workItem);
    return workItem;
  }

  // Saga Step Tracking
  async createSagaStep(params: {
    tenantId: string;
    sagaId: string;
    stepName: string;
    stepOrder: number;
    inputPayload?: Record<string, any>;
    maxRetries?: number;
  }): Promise<SagaStep> {
    const step = this.sagaStepRepo.create({
      stepId: uuidv4(),
      tenantId: params.tenantId,
      sagaId: params.sagaId,
      stepName: params.stepName,
      stepOrder: params.stepOrder,
      status: 'pending',
      inputPayload: params.inputPayload || null,
      outputPayload: null,
      errorMessage: null,
      errorCode: null,
      retryCount: 0,
      maxRetries: params.maxRetries || 3,
      startedAt: null,
      completedAt: null,
      compensatedAt: null,
      durationMs: null,
      createdAt: new Date(),
    });

    await this.sagaStepRepo.save(step);
    return step;
  }

  async startSagaStep(tenantId: string, stepId: string): Promise<SagaStep> {
    const step = await this.sagaStepRepo.findOne({ where: { stepId, tenantId } });
    if (!step) throw new Error('SagaStep not found');

    step.status = 'in_progress';
    step.startedAt = new Date();
    step.retryCount += 1;
    await this.sagaStepRepo.save(step);
    return step;
  }

  async completeSagaStep(tenantId: string, stepId: string, outputPayload?: Record<string, any>): Promise<SagaStep> {
    const step = await this.sagaStepRepo.findOne({ where: { stepId, tenantId } });
    if (!step) throw new Error('SagaStep not found');

    const now = new Date();
    step.status = 'completed';
    step.completedAt = now;
    step.outputPayload = outputPayload || null;
    if (step.startedAt) {
      step.durationMs = now.getTime() - step.startedAt.getTime();
    }
    await this.sagaStepRepo.save(step);
    return step;
  }

  async failSagaStep(tenantId: string, stepId: string, errorMessage: string, errorCode?: string): Promise<SagaStep> {
    const step = await this.sagaStepRepo.findOne({ where: { stepId, tenantId } });
    if (!step) throw new Error('SagaStep not found');

    step.status = 'failed';
    step.errorMessage = errorMessage;
    step.errorCode = errorCode || null;
    await this.sagaStepRepo.save(step);
    return step;
  }

  async getSagaSteps(tenantId: string, sagaId: string): Promise<SagaStep[]> {
    return await this.sagaStepRepo.find({
      where: { sagaId, tenantId },
      order: { stepOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async getSagaStepMetrics(tenantId: string, sagaId: string): Promise<{
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    pendingSteps: number;
    totalDurationMs: number;
    averageStepDurationMs: number;
  }> {
    const steps = await this.getSagaSteps(tenantId, sagaId);
    const completedSteps = steps.filter((s) => s.status === 'completed');
    const failedSteps = steps.filter((s) => s.status === 'failed');
    const pendingSteps = steps.filter((s) => s.status === 'pending' || s.status === 'in_progress');

    const totalDurationMs = completedSteps.reduce((sum, s) => sum + (s.durationMs || 0), 0);
    const averageStepDurationMs = completedSteps.length > 0 ? totalDurationMs / completedSteps.length : 0;

    return {
      totalSteps: steps.length,
      completedSteps: completedSteps.length,
      failedSteps: failedSteps.length,
      pendingSteps: pendingSteps.length,
      totalDurationMs,
      averageStepDurationMs,
    };
  }

  async createSanhabFollowupWorkItem(params: {
    tenantId: string;
    correlationId: string;
    policyId?: string;
    claimId?: string;
    reasonCode: string;
    inquiry: Record<string, any>;
    result?: Record<string, any>;
    priority?: WorkItem['priority'];
  }): Promise<{ saga: SagaInstance; workItem: WorkItem }> {
    const saga = this.sagaRepo.create({
      sagaId: uuidv4(),
      tenantId: params.tenantId,
      sagaType: 'PolicyIssuance',
      status: 'waiting',
      correlationId: params.correlationId,
      claimId: params.claimId || null,
      policyId: params.policyId || null,
      currentStep: 'SANHAB_FOLLOWUP',
      completedSteps: ['INITIATED'],
      context: {
        reasonCode: params.reasonCode,
        inquiry: params.inquiry,
        result: params.result,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    });

    await this.sagaRepo.save(saga);

    const workItem = await this.createWorkItem({
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      stepName: 'SANHAB_FOLLOWUP',
      workItemType: 'sanhab_followup',
      claimId: params.claimId,
      policyId: params.policyId,
      context: {
        policyId: params.policyId || null,
        reasonCode: params.reasonCode,
        inquiry: params.inquiry,
        result: params.result,
      },
      priority: params.priority || WorkItemPriority.high,
    });

    this.logger.info('SANHAB follow-up work item created', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      workItemId: workItem.workItemId,
      reasonCode: params.reasonCode,
    });

    await this.publishSagaEvent('insurance.saga.sanhab_followup.required', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      workItemId: workItem.workItemId,
      correlationId: params.correlationId,
      reasonCode: params.reasonCode,
      policyId: params.policyId || null,
      claimId: params.claimId || null,
    });

    return { saga, workItem };
  }

  async createUnderwritingReviewWorkItem(params: {
    tenantId: string;
    correlationId: string;
    policyId: string;
    reasonCode: string;
    context?: Record<string, any>;
    priority?: WorkItem['priority'];
    dueDate?: string;
  }): Promise<{ saga: SagaInstance; workItem: WorkItem }> {
    const saga = this.sagaRepo.create({
      sagaId: uuidv4(),
      tenantId: params.tenantId,
      sagaType: 'PolicyIssuance',
      status: 'waiting',
      correlationId: params.correlationId,
      claimId: null,
      policyId: params.policyId,
      currentStep: 'UNDERWRITING_REVIEW',
      completedSteps: ['INITIATED'],
      context: {
        reasonCode: params.reasonCode,
        ...(params.context ? { context: params.context } : {}),
        ...(params.dueDate ? { dueDate: params.dueDate } : {}),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    });

    await this.sagaRepo.save(saga);

    const workItem = await this.createWorkItem({
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      stepName: 'UNDERWRITING_REVIEW',
      workItemType: 'underwriting_review',
      policyId: params.policyId,
      context: {
        policyId: params.policyId,
        reasonCode: params.reasonCode,
        ...(params.context ? { context: params.context } : {}),
      },
      priority: params.priority || WorkItemPriority.high,
    });

    if (params.dueDate) {
      try {
        workItem.dueDate = new Date(params.dueDate);
        workItem.updatedAt = new Date();
        await this.workItemRepo.save(workItem);
      } catch {}
    }

    await this.publishSagaEvent('insurance.saga.underwriting_review.required', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      workItemId: workItem.workItemId,
      correlationId: params.correlationId,
      reasonCode: params.reasonCode,
      policyId: params.policyId,
      dueDate: params.dueDate || null,
    });

    return { saga, workItem };
  }

  async createOverrideReviewWorkItem(params: {
    tenantId: string;
    correlationId: string;
    policyId?: string;
    claimId?: string;
    reasonCode: string;
    context?: Record<string, any>;
    priority?: WorkItem['priority'];
    dueDate?: string;
  }): Promise<{ saga: SagaInstance; workItem: WorkItem }> {
    const saga = this.sagaRepo.create({
      sagaId: uuidv4(),
      tenantId: params.tenantId,
      sagaType: 'PolicyIssuance',
      status: 'waiting',
      correlationId: params.correlationId,
      claimId: params.claimId || null,
      policyId: params.policyId || null,
      currentStep: 'OVERRIDE_REVIEW',
      completedSteps: ['INITIATED'],
      context: {
        reasonCode: params.reasonCode,
        ...(params.context ? { context: params.context } : {}),
        ...(params.dueDate ? { dueDate: params.dueDate } : {}),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    });

    await this.sagaRepo.save(saga);

    const workItem = await this.createWorkItem({
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      stepName: 'OVERRIDE_REVIEW',
      workItemType: 'override_review',
      claimId: params.claimId,
      policyId: params.policyId,
      context: {
        policyId: params.policyId || null,
        claimId: params.claimId || null,
        reasonCode: params.reasonCode,
        ...(params.context ? { context: params.context } : {}),
      },
      priority: params.priority || WorkItemPriority.high,
    });

    if (params.dueDate) {
      try {
        workItem.dueDate = new Date(params.dueDate);
        workItem.updatedAt = new Date();
        await this.workItemRepo.save(workItem);
      } catch {}
    }

    await this.publishSagaEvent('insurance.saga.override_review.required', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      workItemId: workItem.workItemId,
      correlationId: params.correlationId,
      reasonCode: params.reasonCode,
      policyId: params.policyId || null,
      claimId: params.claimId || null,
      dueDate: params.dueDate || null,
    });

    return { saga, workItem };
  }

  async createSuspiciousCaseWorkItem(params: {
    tenantId: string;
    correlationId: string;
    policyId?: string;
    claimId?: string;
    reasonCodes: string[];
    explainability?: Record<string, any>;
    fraudScore?: number;
    priority?: WorkItem['priority'];
    dueDate?: string;
    createdBy?: string | null;
  }): Promise<{ saga: SagaInstance; workItem: WorkItem }> {
    const reasonCodes = Array.isArray(params.reasonCodes)
      ? params.reasonCodes.map((x) => String(x || '').trim()).filter(Boolean)
      : [];
    if (reasonCodes.length === 0) {
      const err: any = new Error('reasonCodes is required');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const saga = this.sagaRepo.create({
      sagaId: uuidv4(),
      tenantId: params.tenantId,
      sagaType: 'FraudInvestigation',
      status: 'waiting',
      correlationId: params.correlationId,
      claimId: params.claimId || null,
      policyId: params.policyId || null,
      currentStep: 'SUSPICIOUS_CASE',
      completedSteps: ['INITIATED'],
      context: {
        reasonCodes,
        ...(typeof params.fraudScore === 'number' ? { fraudScore: params.fraudScore } : {}),
        ...(params.explainability ? { explainability: params.explainability } : {}),
        ...(params.createdBy ? { createdBy: params.createdBy } : {}),
        ...(params.dueDate ? { dueDate: params.dueDate } : {}),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    });

    await this.sagaRepo.save(saga);

    const workItem = await this.createWorkItem({
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      stepName: 'SUSPICIOUS_CASE',
      workItemType: 'suspicious_case',
      claimId: params.claimId,
      policyId: params.policyId,
      context: {
        policyId: params.policyId || null,
        claimId: params.claimId || null,
        reasonCodes,
        fraudScore: typeof params.fraudScore === 'number' ? params.fraudScore : null,
        explainability: params.explainability || null,
      },
      priority: params.priority || WorkItemPriority.high,
    });

    if (params.dueDate) {
      try {
        workItem.dueDate = new Date(params.dueDate);
        workItem.updatedAt = new Date();
        await this.workItemRepo.save(workItem);
      } catch {}
    }

    await this.publishSagaEvent('insurance.saga.suspicious_case.required', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      workItemId: workItem.workItemId,
      correlationId: params.correlationId,
      policyId: params.policyId || null,
      claimId: params.claimId || null,
      reasonCodes,
      fraudScore: typeof params.fraudScore === 'number' ? params.fraudScore : null,
      dueDate: params.dueDate || null,
    });

    return { saga, workItem };
  }

  private async handleFraudCheckStep(saga: SagaInstance): Promise<void> {
    saga.currentStep = 'FRAUD_CHECK';
    saga.updatedAt = new Date();
    await this.sagaRepo.save(saga);

    const workItem = await this.createWorkItem({
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      stepName: 'FRAUD_CHECK',
      workItemType: 'fraud_check',
      claimId: saga.claimId || undefined,
      context: { approvedAmount: saga.context?.approvedAmount },
      priority: WorkItemPriority.high,
    });

    saga.status = 'waiting';
    await this.sagaRepo.save(saga);

    await this.publishSagaEvent('insurance.saga.fraud_check.required', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      claimId: saga.claimId,
      workItemId: workItem.workItemId,
    });

    this.logger.info('Fraud check work item created', { sagaId: saga.sagaId,
      tenantId: saga.tenantId, workItemId: workItem.workItemId });
  }

  private async handleHumanApprovalStep(saga: SagaInstance): Promise<void> {
    saga.currentStep = 'HUMAN_APPROVAL';
    saga.updatedAt = new Date();
    await this.sagaRepo.save(saga);

    const approvedAmount = saga.context?.approvedAmount || 0;

    const workItem = await this.createWorkItem({
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      stepName: 'HUMAN_APPROVAL',
      workItemType: 'human_approval',
      claimId: saga.claimId || undefined,
      context: {
        approvedAmount,
        requiresSeniorApproval: approvedAmount > parseInt(process.env.HUMAN_APPROVAL_THRESHOLD_HIGH || '50000000', 10),
      },
      priority: approvedAmount > parseInt(process.env.HUMAN_APPROVAL_THRESHOLD_HIGH || '50000000', 10) ? WorkItemPriority.critical : WorkItemPriority.high,
    });

    saga.status = 'waiting';
    await this.sagaRepo.save(saga);

    await this.publishSagaEvent('insurance.saga.human_approval.required', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      claimId: saga.claimId,
      workItemId: workItem.workItemId,
      approvedAmount,
    });

    this.logger.info('Human approval work item created', { sagaId: saga.sagaId,
      tenantId: saga.tenantId, workItemId: workItem.workItemId });
  }

  private async handleAutoPaymentStep(saga: SagaInstance): Promise<void> {
    // In Iran-aligned operational flow, payment step includes: payment docs -> finance approval -> execution -> notification.
    // We model it with work items and optionally advance via events.
    await this.handlePaymentPrepareStep(saga);
    this.logger.info('Payment flow started (prepare required)', { sagaId: saga.sagaId,
      tenantId: saga.tenantId, claimId: saga.claimId });
  }

  private async completeSaga(saga: SagaInstance, success: boolean, errorMessage?: string): Promise<void> {
    saga.status = success ? 'completed' : 'failed';
    saga.completedAt = new Date();
    saga.updatedAt = new Date();
    if (errorMessage) {
      saga.errorMessage = errorMessage;
    }
    await this.sagaRepo.save(saga);

    await this.publishSagaEvent(success ? 'insurance.saga.completed' : 'insurance.saga.failed', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      claimId: saga.claimId,
      sagaType: saga.sagaType,
      completedSteps: saga.completedSteps,
      errorMessage: saga.errorMessage,
    });

    this.logger.info(`Saga ${success ? 'completed' : 'failed'}`, { sagaId: saga.sagaId });
  }

  async onPaymentEvent(params: {
    tenantId: string;
    topic: string;
    correlationId: string;
    claimId: string;
    paymentIntentId?: string;
    payload: any;
  }): Promise<void> {
    const sagas = await this.sagaRepo
      .createQueryBuilder('s')
      .where('s.saga_type = :sagaType', { sagaType: 'ClaimPayment' })
      .andWhere('s.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('s.claim_id = :claimId', { claimId: params.claimId })
      .andWhere('s.status IN (:...statuses)', { statuses: ['started', 'waiting', 'compensating'] })
      .orderBy('s.created_at', 'DESC')
      .getMany();

    if (sagas.length === 0) return;

    for (const saga of sagas) {
      saga.correlationId = saga.correlationId || params.correlationId;
      saga.context = { ...(saga.context || {}) };
      if (params.paymentIntentId) {
        (saga.context as any).paymentIntentId = params.paymentIntentId;
      }

      try {
        if (params.topic === 'insurance.payment.prepared') {
          saga.completedSteps = Array.from(new Set([...(saga.completedSteps || []), 'PAYMENT_PREPARE_EVENT']));
          saga.updatedAt = new Date();
          await this.sagaRepo.save(saga);
          await this.handleFinanceApprovalStep(saga);
        } else if (params.topic === 'insurance.payment.finance_approved') {
          saga.completedSteps = Array.from(new Set([...(saga.completedSteps || []), 'FINANCE_APPROVAL_EVENT']));
          saga.updatedAt = new Date();
          await this.sagaRepo.save(saga);
          await this.handlePaymentExecuteStep(saga);
        } else if (params.topic === 'insurance.payment.executed') {
          saga.completedSteps = Array.from(new Set([...(saga.completedSteps || []), 'PAYMENT_EXECUTE_EVENT']));
          saga.updatedAt = new Date();
          await this.sagaRepo.save(saga);
          await this.handlePaymentNotifyStep(saga);
        } else if (params.topic === 'insurance.payment.notified') {
          saga.completedSteps = Array.from(new Set([...(saga.completedSteps || []), 'PAYMENT_NOTIFY_EVENT']));
          saga.updatedAt = new Date();
          await this.sagaRepo.save(saga);
          await this.completeSaga(saga, true);
        }
      } catch (e: any) {
        const err = e instanceof Error ? e : new Error(String(e));
        this.logger.error('onPaymentEvent failed', err, {
          topic: params.topic,
          claimId: params.claimId,
          sagaId: saga.sagaId,
          tenantId: saga.tenantId,
          correlationId: params.correlationId,
        });
        await this.completeSaga(saga, false, `Payment event handling failed: ${err.message}`);
      }
    }
  }

  private async findExistingSagaByDedupeKey(params: {
    tenantId: string;
    sagaType: SagaInstance['sagaType'];
    dedupeKey: string;
  }): Promise<SagaInstance | null> {
    return this.sagaRepo
      .createQueryBuilder('s')
      .where('s.saga_type = :sagaType', { sagaType: params.sagaType })
      .andWhere('s.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('s.context @> :dedupeJson::jsonb', { dedupeJson: JSON.stringify({ dedupeKey: params.dedupeKey }) })
      .andWhere('s.status IN (:...statuses)', { statuses: ['started', 'waiting', 'compensating'] })
      .orderBy('s.created_at', 'DESC')
      .getOne();
  }

  async startSaga(params: {
    tenantId: string;
    sagaType: 'ClaimPayment' | 'PolicyIssuance' | 'ComplaintHandling' | 'ComplaintResolution' | 'ReinsuranceRecovery';
    correlationId: string;
    claimId?: string | null;
    policyId?: string | null;
    complaintId?: string | null;
    recoveryId?: string | null;
    contractId?: string | null;
    context?: Record<string, any>;
  }): Promise<SagaInstance> {
    const context = params.context || {};

    if (params.sagaType === 'ClaimPayment') {
      if (!params.claimId) {
        const err: any = new Error('claimId is required');
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      return this.startClaimPaymentSaga({ tenantId: params.tenantId, claimId: String(params.claimId), correlationId: params.correlationId, context });
    }

    if (params.sagaType === 'PolicyIssuance') {
      if (!params.policyId) {
        const err: any = new Error('policyId is required');
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      const dedupeKey = `PolicyIssuance:${String(params.policyId)}`;
      const existing = await this.findExistingSagaByDedupeKey({ tenantId: params.tenantId, sagaType: 'PolicyIssuance', dedupeKey });
      if (existing) return existing;

      const saga = this.sagaRepo.create({
        sagaId: uuidv4(),
        tenantId: params.tenantId,
        sagaType: 'PolicyIssuance',
        status: 'started',
        correlationId: params.correlationId,
        claimId: params.claimId ? String(params.claimId) : null,
        policyId: String(params.policyId),
        currentStep: 'INITIATED',
        completedSteps: ['INITIATED'],
        context: {
          dedupeKey,
          stateMachine: {
            version: 1,
            steps: ['INITIATED', 'UNDERWRITING_REVIEW', 'SANHAB_FOLLOWUP', 'OVERRIDE_REVIEW', 'COMPLETED'],
          },
          ...context,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        errorMessage: null,
      });
      await this.sagaRepo.save(saga);

      // Create work item for the current step only
      saga.status = 'waiting';
      saga.currentStep = 'UNDERWRITING_REVIEW';
      await this.sagaRepo.save(saga);

      const underwritingItem = await this.createWorkItem({
        sagaId: saga.sagaId,
        tenantId: saga.tenantId,
        stepName: 'UNDERWRITING_REVIEW',
        workItemType: 'underwriting_review',
        policyId: saga.policyId || undefined,
        claimId: saga.claimId || undefined,
        context: { policyId: saga.policyId, correlationId: params.correlationId },
        priority: WorkItemPriority.high,
      });

      await this.publishSagaEvent('insurance.saga.policy_issuance.started', {
        sagaId: saga.sagaId,
        tenantId: saga.tenantId,
        policyId: saga.policyId,
        claimId: saga.claimId,
        correlationId: params.correlationId,
        firstWorkItemId: underwritingItem.workItemId,
      });
      return saga;
    }

    if (params.sagaType === 'ComplaintHandling' || params.sagaType === 'ComplaintResolution') {
      if (!params.complaintId) {
        const err: any = new Error('complaintId is required');
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      const dedupeKey = `ComplaintHandling:${String(params.complaintId)}`;
      const existing = await this.findExistingSagaByDedupeKey({ tenantId: params.tenantId, sagaType: 'ComplaintResolution', dedupeKey });
      if (existing) return existing;

      const saga = this.sagaRepo.create({
        sagaId: uuidv4(),
        tenantId: params.tenantId,
        sagaType: 'ComplaintResolution',
        status: 'started',
        correlationId: params.correlationId,
        claimId: params.claimId ? String(params.claimId) : null,
        policyId: params.policyId ? String(params.policyId) : null,
        currentStep: 'INITIATED',
        completedSteps: ['INITIATED'],
        context: {
          dedupeKey,
          complaintId: String(params.complaintId),
          stateMachine: {
            version: 1,
            steps: ['INITIATED', 'COMPLAINT_TRIAGE', 'COMPLAINT_SLA_BREACH', 'COMPLETED'],
          },
          ...context,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        errorMessage: null,
      });
      await this.sagaRepo.save(saga);

      await this.publishSagaEvent('insurance.saga.complaint_handling.started', {
        sagaId: saga.sagaId,
        tenantId: saga.tenantId,
        policyId: saga.policyId,
        claimId: saga.claimId,
        complaintId: String(params.complaintId),
        correlationId: params.correlationId,
      });
      return saga;
    }

    if (params.sagaType === 'ReinsuranceRecovery') {
      if (!params.recoveryId) {
        const err: any = new Error('recoveryId is required');
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      const dedupeKey = `ReinsuranceRecovery:${String(params.recoveryId)}`;
      const existing = await this.findExistingSagaByDedupeKey({ tenantId: params.tenantId, sagaType: 'ReinsuranceRecovery', dedupeKey });
      if (existing) return existing;

      const saga = this.sagaRepo.create({
        sagaId: uuidv4(),
        tenantId: params.tenantId,
        sagaType: 'ReinsuranceRecovery',
        status: 'started',
        correlationId: params.correlationId,
        claimId: params.claimId ? String(params.claimId) : null,
        policyId: params.policyId ? String(params.policyId) : null,
        currentStep: 'INITIATED',
        completedSteps: ['INITIATED'],
        context: {
          dedupeKey,
          recoveryId: String(params.recoveryId),
          contractId: params.contractId ? String(params.contractId) : null,
          stateMachine: {
            version: 1,
            steps: ['INITIATED', 'RECOVERY_IDENTIFIED', 'RECOVERY_RECEIVED', 'COMPLETED'],
          },
          ...context,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        errorMessage: null,
      });
      await this.sagaRepo.save(saga);

      await this.publishSagaEvent('insurance.saga.reinsurance_recovery.started', {
        sagaId: saga.sagaId,
        tenantId: saga.tenantId,
        claimId: saga.claimId,
        policyId: saga.policyId,
        recoveryId: String(params.recoveryId),
        contractId: params.contractId ? String(params.contractId) : null,
        correlationId: params.correlationId,
      });
      return saga;
    }

    const err: any = new Error('sagaType not supported');
    err.code = 'NOT_SUPPORTED';
    throw err;
  }

  async startClaimPaymentSaga(params: {
    tenantId: string; claimId: string; correlationId: string; context?: Record<string, any> }): Promise<SagaInstance> {
    const context = params.context || {};

    const existing = await this.sagaRepo
      .createQueryBuilder('s')
      .where('s.saga_type = :sagaType', { sagaType: 'ClaimPayment' })
      .andWhere('s.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('s.claim_id = :claimId', { claimId: params.claimId })
      .andWhere('s.status IN (:...statuses)', { statuses: ['started', 'waiting', 'compensating'] })
      .orderBy('s.created_at', 'DESC')
      .getOne();

    if (existing) {
      return existing;
    }

    const saga = this.sagaRepo.create({
      sagaId: uuidv4(),
      tenantId: params.tenantId,
      sagaType: 'ClaimPayment',
      status: 'started',
      correlationId: params.correlationId,
      claimId: params.claimId,
      currentStep: 'INITIATED',
      completedSteps: ['INITIATED'],
      context: {
        approvedAmount: context.approvedAmount || 0,
        requiresFraudCheck: context.requiresFraudCheck !== false,
        requiresHumanApproval: (context.approvedAmount || 0) > parseInt(process.env.HUMAN_APPROVAL_THRESHOLD_LOW || '10000000', 10),
        ...context,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      errorMessage: null,
      policyId: null,
    });

    await this.sagaRepo.save(saga);

    await this.publishSagaEvent('insurance.saga.claim_payment.started', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      claimId: params.claimId,
      correlationId: params.correlationId,
      approvedAmount: context.approvedAmount,
    });

    this.logger.info('Claim payment saga started', { sagaId: saga.sagaId,
      tenantId: saga.tenantId, claimId: params.claimId, correlationId: params.correlationId });

    if (saga.context?.requiresFraudCheck) {
      await this.handleFraudCheckStep(saga);
    } else if (saga.context?.requiresHumanApproval) {
      await this.handleHumanApprovalStep(saga);
    } else {
      await this.handleAutoPaymentStep(saga);
    }

    return saga;
  }

  async getSaga(tenantId: string, sagaId: string): Promise<SagaInstance | null> {
    return this.sagaRepo.findOne({ where: { sagaId, tenantId }, relations: ['workItems', 'steps'] });
  }

  async listWorkItems(params: {
    tenantId: string; status?: string; assignedTo?: string; priority?: string; limit: number; offset: number }): Promise<{ rows: WorkItem[]; total: number }> {
    const qb = this.workItemRepo.createQueryBuilder('wi');

    qb.andWhere('wi.tenant_id = :tenantId', { tenantId: params.tenantId });

    if (params.status) qb.andWhere('wi.status = :status', { status: params.status });
    if (params.assignedTo) qb.andWhere('wi.assigned_to = :assignedTo', { assignedTo: params.assignedTo });
    if (params.priority) qb.andWhere('wi.priority = :priority', { priority: params.priority });

    qb.orderBy('wi.priority', 'DESC')
      .addOrderBy('wi.created_at', 'ASC')
      .limit(params.limit)
      .offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getWorkItem(tenantId: string, workItemId: string): Promise<WorkItem | null> {
    return this.workItemRepo.findOne({ where: { workItemId, tenantId } });
  }

  async assignWorkItem(params: {
    tenantId: string; correlationId: string; workItemId: string; assignedTo: string }): Promise<WorkItem | null> {
    const workItem = await this.workItemRepo.findOne({ where: { workItemId: params.workItemId, tenantId: params.tenantId } });
    if (!workItem) return null;

    workItem.assignedTo = params.assignedTo;
    workItem.status = WorkItemStatus.in_progress;
    workItem.updatedAt = new Date();
    await this.workItemRepo.save(workItem);

    return workItem;
  }

  async completeWorkItem(params: {
    tenantId: string;
    correlationId: string;
    workItemId: string;
    decision: 'approved' | 'rejected' | 'escalated';
    decidedBy: string;
    notes?: string;
    result?: any;
  }): Promise<{ workItem: WorkItem; saga: SagaInstance | null } | null> {
    const workItem = await this.workItemRepo.findOne({ where: { workItemId: params.workItemId, tenantId: params.tenantId } });
    if (!workItem) return null;

    if ((params.decision === 'rejected' || params.decision === 'escalated') && (!params.notes || String(params.notes).trim().length === 0)) {
      const err: any = new Error('notes is required for rejected/escalated decisions');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (workItem.status === WorkItemStatus.approved || workItem.status === WorkItemStatus.rejected) {
      const err: any = new Error('Work item has already been decided');
      err.code = 'ALREADY_DECIDED';
      throw err;
    }

    workItem.status = params.decision as WorkItemStatus;
    workItem.decidedBy = params.decidedBy;
    workItem.decisionNotes = params.notes || null;
    if (params.result !== undefined) {
      workItem.context = { ...(workItem.context || {}), result: params.result };
    }
    workItem.completedAt = params.decision === 'escalated' ? null : new Date();
    workItem.updatedAt = new Date();
    await this.workItemRepo.save(workItem);

    const saga = await this.sagaRepo.findOne({ where: { sagaId: workItem.sagaId, tenantId: params.tenantId } });
    if (saga) {
      saga.updatedAt = new Date();

      if (params.decision === 'rejected') {
        await this.completeSaga(saga, false, `Rejected at ${workItem.stepName}: ${params.notes || 'No notes'}`);
      } else if (params.decision === 'escalated') {
        const escalationStepName = `${workItem.stepName}_ESCALATION`;
        saga.currentStep = escalationStepName;
        saga.status = 'waiting';

        const escalationItem = await this.createWorkItem({
          sagaId: saga.sagaId,
          tenantId: saga.tenantId,
          stepName: escalationStepName,
          workItemType: 'fraud_case_escalation',
          claimId: (saga.context as any)?.claimId || null,
          context: {
            originalWorkItemId: workItem.workItemId,
            originalStepName: workItem.stepName,
            escalatedBy: params.decidedBy,
            notes: params.notes || null,
          },
          priority: WorkItemPriority.critical,
        });
        await this.publishSagaEvent('insurance.saga.work_item.escalated', {
          sagaId: saga.sagaId,
          tenantId: saga.tenantId,
          workItemId: workItem.workItemId,
          escalationWorkItemId: escalationItem.workItemId,
          stepName: workItem.stepName,
          decidedBy: params.decidedBy,
          notes: params.notes || null,
        });
      } else if (params.decision === 'approved') {
        saga.completedSteps = [...saga.completedSteps, workItem.stepName];
        if (saga.context) {
          if (workItem.stepName === 'FRAUD_CHECK') {
            if (saga.context.requiresHumanApproval) {
              await this.handleHumanApprovalStep(saga);
            } else {
              await this.handleAutoPaymentStep(saga);
            }
          } else if (workItem.stepName === 'HUMAN_APPROVAL') {
            await this.handleAutoPaymentStep(saga);
          } else if (workItem.stepName === 'PAYMENT_PREPARE') {
            const paymentIntentId = (workItem.context as any)?.result?.paymentIntentId as string | undefined;
            saga.context = { ...(saga.context || {}), paymentIntentId: paymentIntentId || saga.context?.paymentIntentId };
            await this.handleFinanceApprovalStep(saga);
          } else if (workItem.stepName === 'FINANCE_APPROVAL') {
            await this.handlePaymentExecuteStep(saga);
          } else if (workItem.stepName === 'PAYMENT_EXECUTE') {
            await this.handlePaymentNotifyStep(saga);
          } else if (workItem.stepName === 'PAYMENT_NOTIFY') {
            await this.completeSaga(saga, true);
          } else if (workItem.stepName === 'UNDERWRITING_REVIEW') {
            saga.currentStep = 'SANHAB_FOLLOWUP';
            const nextItem = await this.createWorkItem({
              sagaId: saga.sagaId,
              tenantId: saga.tenantId,
              stepName: 'SANHAB_FOLLOWUP',
              workItemType: 'sanhab_followup',
              policyId: saga.policyId || undefined,
              claimId: saga.claimId || undefined,
              context: { policyId: saga.policyId, correlationId: params.correlationId, previousWorkItemId: workItem.workItemId },
              priority: WorkItemPriority.medium,
            });
            await this.publishSagaEvent('insurance.saga.sanhab_followup.required', {
              sagaId: saga.sagaId,
              tenantId: saga.tenantId,
              workItemId: nextItem.workItemId,
              policyId: saga.policyId,
              claimId: saga.claimId,
              correlationId: params.correlationId,
            });
          } else if (workItem.stepName === 'SANHAB_FOLLOWUP') {
            saga.currentStep = 'OVERRIDE_REVIEW';
            const nextItem = await this.createWorkItem({
              sagaId: saga.sagaId,
              tenantId: saga.tenantId,
              stepName: 'OVERRIDE_REVIEW',
              workItemType: 'override_review',
              policyId: saga.policyId || undefined,
              claimId: saga.claimId || undefined,
              context: { policyId: saga.policyId, correlationId: params.correlationId, previousWorkItemId: workItem.workItemId },
              priority: WorkItemPriority.medium,
            });
            await this.publishSagaEvent('insurance.saga.override_review.required', {
              sagaId: saga.sagaId,
              tenantId: saga.tenantId,
              workItemId: nextItem.workItemId,
              policyId: saga.policyId,
              claimId: saga.claimId,
              correlationId: params.correlationId,
            });
          } else if (workItem.stepName === 'OVERRIDE_REVIEW') {
            await this.completeSaga(saga, true);
          }
        }
      }

      await this.sagaRepo.save(saga);
    }

    await this.publishSagaEvent('insurance.saga.work_item.completed', {
      sagaId: workItem.sagaId,
      tenantId: params.tenantId,
      workItemId: workItem.workItemId,
      stepName: workItem.stepName,
      decision: params.decision,
      decidedBy: params.decidedBy,
    });

    return { workItem, saga: saga || null };
  }

  // Saga Compensation/Rollback
  async initiateCompensation(tenantId: string, sagaId: string, reason: string, triggeredBy?: string): Promise<SagaInstance> {
    const saga = await this.sagaRepo.findOne({ where: { sagaId, tenantId } });
    if (!saga) {
      const err: any = new Error('Saga not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (saga.status === 'compensating' || saga.status === 'compensated') {
      const err: any = new Error('Saga already in compensation state');
      err.code = 'INVALID_STATE';
      throw err;
    }

    saga.status = 'compensating';
    saga.errorMessage = `Compensation initiated: ${reason}`;
    saga.updatedAt = new Date();
    await this.sagaRepo.save(saga);

    this.logger.warn('Saga compensation initiated', { sagaId, reason, triggeredBy });

    await this.publishSagaEvent('insurance.saga.compensation.started', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      sagaType: saga.sagaType,
      claimId: saga.claimId,
      policyId: saga.policyId,
      reason,
      triggeredBy,
    });

    await this.executeCompensation(saga);
    return saga;
  }

  private async executeCompensation(saga: SagaInstance): Promise<void> {
    const steps = await this.sagaStepRepo.find({
      where: { sagaId: saga.sagaId, tenantId: saga.tenantId },
      order: { stepOrder: 'DESC' },
    });

    const completedSteps = steps.filter((s) => s.status === 'completed');
    this.logger.info('Starting compensation for completed steps', { sagaId: saga.sagaId,
      tenantId: saga.tenantId, stepCount: completedSteps.length });

    for (const step of completedSteps) {
      try {
        await this.compensateStep(saga, step);
      } catch (e: any) {
        this.logger.error('Compensation failed for step', e, { sagaId: saga.sagaId,
        tenantId: saga.tenantId, stepName: step.stepName });
        await this.recordCompensationFailure(saga, step, e.message);
      }
    }

    saga.status = 'compensated';
    saga.completedAt = new Date();
    saga.updatedAt = new Date();
    await this.sagaRepo.save(saga);

    await this.publishSagaEvent('insurance.saga.compensation.completed', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      sagaType: saga.sagaType,
      claimId: saga.claimId,
      policyId: saga.policyId,
    });

    this.logger.info('Saga compensation completed', { sagaId: saga.sagaId });
  }

  private async compensateStep(saga: SagaInstance, step: SagaStep): Promise<void> {
    const compensationAction = this.getCompensationAction(step.stepName);
    if (!compensationAction) {
      this.logger.warn('No compensation action defined for step', { sagaId: saga.sagaId,
      tenantId: saga.tenantId, stepName: step.stepName });
      return;
    }

    step.status = 'compensating';
    step.updatedAt = new Date();
    await this.sagaStepRepo.save(step);

    await compensationAction(saga, step);

    step.status = 'compensated';
    step.updatedAt = new Date();
    await this.sagaStepRepo.save(step);

    this.logger.info('Step compensated', { sagaId: saga.sagaId,
      tenantId: saga.tenantId, stepName: step.stepName });
  }

  private getCompensationAction(stepName: string): ((saga: SagaInstance, step: SagaStep) => Promise<void>) | null {
    const actions: Record<string, (saga: SagaInstance, step: SagaStep) => Promise<void>> = {
      PAYMENT_PREPARE: async (saga, step) => {
        const paymentIntentId = (step.outputPayload as any)?.paymentIntentId;
        if (paymentIntentId) {
          await this.publishSagaEvent('insurance.payment.cancel', {
            sagaId: saga.sagaId,
            tenantId: saga.tenantId,
            paymentIntentId,
            reason: 'Saga compensation',
          });
        }
      },
      PAYMENT_EXECUTE: async (saga, step) => {
        const paymentId = (step.outputPayload as any)?.paymentId;
        if (paymentId) {
          await this.publishSagaEvent('insurance.payment.refund', {
            sagaId: saga.sagaId,
            tenantId: saga.tenantId,
            paymentId,
            reason: 'Saga compensation',
          });
        }
      },
      PAYMENT_NOTIFY: async (saga) => {
        await this.publishSagaEvent('insurance.notification.compensation', {
          sagaId: saga.sagaId,
          tenantId: saga.tenantId,
          claimId: saga.claimId,
          message: 'Payment process was rolled back',
        });
      },
      FRAUD_CHECK: async (saga) => {
        await this.publishSagaEvent('insurance.fraud.clear_hold', {
          sagaId: saga.sagaId,
          tenantId: saga.tenantId,
          claimId: saga.claimId,
        });
      },
      HUMAN_APPROVAL: async () => {
      },
      DOCUMENT_REVIEW: async () => {
      },
      POLICY_ISSUE: async (saga) => {
        const policyId = saga.policyId;
        if (policyId) {
          await this.publishSagaEvent('insurance.policy.cancel', {
            sagaId: saga.sagaId,
            tenantId: saga.tenantId,
            policyId,
            reason: 'Saga compensation',
          });
        }
      },
    };

    return actions[stepName] || null;
  }

  private async recordCompensationFailure(saga: SagaInstance, step: SagaStep, error: string): Promise<void> {
    step.status = 'compensation_failed';
    step.errorMessage = error;
    step.updatedAt = new Date();
    await this.sagaStepRepo.save(step);

    await this.publishSagaEvent('insurance.saga.compensation.failed', {
      sagaId: saga.sagaId,
      tenantId: saga.tenantId,
      stepName: step.stepName,
      error,
    });
  }

  async retryCompensation(tenantId: string, sagaId: string): Promise<SagaInstance> {
    const saga = await this.sagaRepo.findOne({ where: { sagaId, tenantId } });
    if (!saga) {
      const err: any = new Error('Saga not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (saga.status !== 'compensated') {
      const err: any = new Error('Saga must be in compensated state to retry');
      err.code = 'INVALID_STATE';
      throw err;
    }

    const failedSteps = await this.sagaStepRepo.find({
      where: { sagaId, tenantId, status: 'compensation_failed' as any },
    });

    if (failedSteps.length === 0) {
      return saga;
    }

    saga.status = 'compensating';
    saga.updatedAt = new Date();
    await this.sagaRepo.save(saga);

    for (const step of failedSteps) {
      try {
        await this.compensateStep(saga, step);
      } catch (e: any) {
        this.logger.error('Compensation retry failed for step', e, { sagaId: saga.sagaId,
      tenantId: saga.tenantId, stepName: step.stepName });
      }
    }

    saga.status = 'compensated';
    saga.updatedAt = new Date();
    await this.sagaRepo.save(saga);

    return saga;
  }

  async getCompensationStatus(tenantId: string, sagaId: string): Promise<{
    saga: SagaInstance;
    steps: SagaStep[];
    completedCount: number;
    failedCount: number;
    pendingCount: number;
  }> {
    const saga = await this.sagaRepo.findOne({ where: { sagaId, tenantId } });
    if (!saga) {
      const err: any = new Error('Saga not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const steps = await this.sagaStepRepo.find({ where: { sagaId, tenantId } });
    const completedCount = steps.filter((s) => s.status === 'compensated').length;
    const failedCount = steps.filter((s) => s.status === 'compensation_failed').length;
    const pendingCount = steps.filter((s) => s.status === 'completed' || s.status === 'compensating').length;

    return { saga, steps, completedCount, failedCount, pendingCount };
  }
}