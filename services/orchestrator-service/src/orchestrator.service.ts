import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { KafkaProducer, createLogger, Logger } from '@insurance/shared';
import { SagaInstance } from './entities/SagaInstance';
import { WorkItem } from './entities/WorkItem';

@Injectable()
export class OrchestratorService implements OnModuleInit, OnModuleDestroy {
  private logger: Logger;
  private kafkaProducer?: KafkaProducer;

  constructor(
    @InjectRepository(SagaInstance) private readonly sagaRepo: Repository<SagaInstance>,
    @InjectRepository(WorkItem) private readonly workItemRepo: Repository<WorkItem>
  ) {
    this.logger = createLogger({
      serviceName: 'orchestrator-service',
      prettyPrint: process.env.NODE_ENV !== 'production',
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
    if (!this.kafkaProducer) return;

    await this.kafkaProducer.send({
      topic,
      messages: [
        {
          key: event.sagaId,
          value: JSON.stringify(event),
        },
      ],
    });
  }

  private async createWorkItem(params: {
    sagaId: string;
    stepName: string;
    workItemType: WorkItem['workItemType'];
    claimId?: string;
    context?: Record<string, any>;
    priority?: WorkItem['priority'];
  }): Promise<WorkItem> {
    const workItem = this.workItemRepo.create({
      workItemId: uuidv4(),
      sagaId: params.sagaId,
      stepName: params.stepName,
      workItemType: params.workItemType,
      status: 'pending',
      claimId: params.claimId || null,
      context: params.context || {},
      priority: params.priority || 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.workItemRepo.save(workItem);
    return workItem;
  }

  private async handleFraudCheckStep(saga: SagaInstance): Promise<void> {
    saga.currentStep = 'FRAUD_CHECK';
    saga.updatedAt = new Date();
    await this.sagaRepo.save(saga);

    const workItem = await this.createWorkItem({
      sagaId: saga.sagaId,
      stepName: 'FRAUD_CHECK',
      workItemType: 'fraud_check',
      claimId: saga.claimId || undefined,
      context: { approvedAmount: saga.context?.approvedAmount },
      priority: 'high',
    });

    saga.status = 'waiting';
    await this.sagaRepo.save(saga);

    await this.publishSagaEvent('insurance.saga.fraud_check.required', {
      sagaId: saga.sagaId,
      claimId: saga.claimId,
      workItemId: workItem.workItemId,
    });

    this.logger.info('Fraud check work item created', { sagaId: saga.sagaId, workItemId: workItem.workItemId });
  }

  private async handleHumanApprovalStep(saga: SagaInstance): Promise<void> {
    saga.currentStep = 'HUMAN_APPROVAL';
    saga.updatedAt = new Date();
    await this.sagaRepo.save(saga);

    const approvedAmount = saga.context?.approvedAmount || 0;

    const workItem = await this.createWorkItem({
      sagaId: saga.sagaId,
      stepName: 'HUMAN_APPROVAL',
      workItemType: 'payment_approval',
      claimId: saga.claimId || undefined,
      context: {
        approvedAmount,
        requiresSeniorApproval: approvedAmount > 50000000,
      },
      priority: approvedAmount > 50000000 ? 'critical' : 'high',
    });

    saga.status = 'waiting';
    await this.sagaRepo.save(saga);

    await this.publishSagaEvent('insurance.saga.human_approval.required', {
      sagaId: saga.sagaId,
      claimId: saga.claimId,
      workItemId: workItem.workItemId,
      approvedAmount,
    });

    this.logger.info('Human approval work item created', { sagaId: saga.sagaId, workItemId: workItem.workItemId });
  }

  private async handleAutoPaymentStep(saga: SagaInstance): Promise<void> {
    saga.currentStep = 'PAYMENT_EXECUTION';
    saga.updatedAt = new Date();
    await this.sagaRepo.save(saga);

    await this.publishSagaEvent('insurance.saga.payment.execute', {
      sagaId: saga.sagaId,
      claimId: saga.claimId,
      amount: saga.context?.approvedAmount,
    });

    this.logger.info('Auto payment triggered', { sagaId: saga.sagaId, claimId: saga.claimId });
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
      claimId: saga.claimId,
      sagaType: saga.sagaType,
      completedSteps: saga.completedSteps,
      errorMessage: saga.errorMessage,
    });

    this.logger.info(`Saga ${success ? 'completed' : 'failed'}`, { sagaId: saga.sagaId });
  }

  async startClaimPaymentSaga(params: { claimId: string; correlationId: string; context?: Record<string, any> }): Promise<SagaInstance> {
    const context = params.context || {};

    const saga = this.sagaRepo.create({
      sagaId: uuidv4(),
      sagaType: 'ClaimPayment',
      status: 'started',
      correlationId: params.correlationId,
      claimId: params.claimId,
      currentStep: 'INITIATED',
      completedSteps: ['INITIATED'],
      context: {
        approvedAmount: context.approvedAmount || 0,
        requiresFraudCheck: context.requiresFraudCheck !== false,
        requiresHumanApproval: (context.approvedAmount || 0) > 10000000,
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
      claimId: params.claimId,
      correlationId: params.correlationId,
      approvedAmount: context.approvedAmount,
    });

    this.logger.info('Claim payment saga started', { sagaId: saga.sagaId, claimId: params.claimId, correlationId: params.correlationId });

    if (saga.context?.requiresFraudCheck) {
      await this.handleFraudCheckStep(saga);
    } else if (saga.context?.requiresHumanApproval) {
      await this.handleHumanApprovalStep(saga);
    } else {
      await this.handleAutoPaymentStep(saga);
    }

    return saga;
  }

  async getSaga(sagaId: string): Promise<SagaInstance | null> {
    return this.sagaRepo.findOne({ where: { sagaId } });
  }

  async listWorkItems(params: { status?: string; assignedTo?: string; priority?: string; limit: number; offset: number }): Promise<{ rows: WorkItem[]; total: number }> {
    const qb = this.workItemRepo.createQueryBuilder('wi');

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

  async getWorkItem(workItemId: string): Promise<WorkItem | null> {
    return this.workItemRepo.findOne({ where: { workItemId } });
  }

  async assignWorkItem(params: { correlationId: string; workItemId: string; assignedTo: string }): Promise<WorkItem | null> {
    const workItem = await this.workItemRepo.findOne({ where: { workItemId: params.workItemId } });
    if (!workItem) return null;

    workItem.assignedTo = params.assignedTo;
    workItem.status = 'in_progress';
    workItem.updatedAt = new Date();
    await this.workItemRepo.save(workItem);

    return workItem;
  }

  async completeWorkItem(params: {
    correlationId: string;
    workItemId: string;
    decision: 'approved' | 'rejected' | 'escalated';
    decidedBy: string;
    notes?: string;
  }): Promise<{ workItem: WorkItem; saga: SagaInstance | null } | null> {
    const workItem = await this.workItemRepo.findOne({ where: { workItemId: params.workItemId } });
    if (!workItem) return null;

    if (workItem.status === 'approved' || workItem.status === 'rejected') {
      const err: any = new Error('Work item has already been decided');
      err.code = 'ALREADY_DECIDED';
      throw err;
    }

    workItem.status = params.decision;
    workItem.decidedBy = params.decidedBy;
    workItem.decisionNotes = params.notes || null;
    workItem.completedAt = new Date();
    workItem.updatedAt = new Date();
    await this.workItemRepo.save(workItem);

    const saga = await this.sagaRepo.findOne({ where: { sagaId: workItem.sagaId } });
    if (saga) {
      saga.completedSteps = [...saga.completedSteps, workItem.stepName];
      saga.updatedAt = new Date();

      if (params.decision === 'rejected') {
        await this.completeSaga(saga, false, `Rejected at ${workItem.stepName}: ${params.notes || 'No notes'}`);
      } else if (params.decision === 'escalated') {
        workItem.status = 'escalated';
        await this.workItemRepo.save(workItem);
      } else if (params.decision === 'approved' && saga.context) {
        if (workItem.stepName === 'FRAUD_CHECK') {
          if (saga.context.requiresHumanApproval) {
            await this.handleHumanApprovalStep(saga);
          } else {
            await this.handleAutoPaymentStep(saga);
          }
        } else if (workItem.stepName === 'HUMAN_APPROVAL') {
          await this.handleAutoPaymentStep(saga);
        }
      }

      await this.sagaRepo.save(saga);
    }

    await this.publishSagaEvent('insurance.saga.work_item.completed', {
      sagaId: workItem.sagaId,
      workItemId: workItem.workItemId,
      stepName: workItem.stepName,
      decision: params.decision,
      decidedBy: params.decidedBy,
    });

    return { workItem, saga: saga || null };
  }
}
