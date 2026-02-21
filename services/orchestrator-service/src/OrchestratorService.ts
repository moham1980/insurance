import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { BaseService, KafkaProducer } from '@insurance/shared';
import { SagaInstance } from './entities/SagaInstance';
import { WorkItem } from './entities/WorkItem';
import { v4 as uuidv4 } from 'uuid';

interface StartSagaRequest {
  sagaType: 'ClaimPayment';
  claimId: string;
  context?: Record<string, any>;
}

interface CompleteWorkItemRequest {
  decision: 'approved' | 'rejected' | 'escalated';
  notes?: string;
  decidedBy: string;
}

export class OrchestratorService extends BaseService {
  private sagaRepo: Repository<SagaInstance>;
  private workItemRepo: Repository<WorkItem>;
  private orchestratorKafkaProducer?: KafkaProducer;

  getEntities(): any[] {
    return [SagaInstance, WorkItem];
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.sagaRepo = this.dataSource.getRepository(SagaInstance);
    this.workItemRepo = this.dataSource.getRepository(WorkItem);

    if (this.config.kafkaConfig) {
      const kafkaConfig = this.config.kafkaConfig as any;
      this.orchestratorKafkaProducer = new KafkaProducer({
        brokers: kafkaConfig.brokers,
        clientId: kafkaConfig.clientId || 'orchestrator-service',
      }, this.logger);
      await this.orchestratorKafkaProducer.connect();
    }
  }

  async stop(): Promise<void> {
    if (this.orchestratorKafkaProducer) {
      await this.orchestratorKafkaProducer.disconnect();
    }
    await super.stop();
  }

  private async publishSagaEvent(topic: string, event: any): Promise<void> {
    if (this.orchestratorKafkaProducer) {
      await this.orchestratorKafkaProducer.send({
        topic,
        messages: [{
          key: event.sagaId,
          value: JSON.stringify(event),
        }],
      });
    }
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

  private async startClaimPaymentSaga(claimId: string, correlationId: string, context: Record<string, any> = {}): Promise<SagaInstance> {
    const saga = this.sagaRepo.create({
      sagaId: uuidv4(),
      sagaType: 'ClaimPayment',
      status: 'started',
      correlationId,
      claimId,
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
    });

    await this.sagaRepo.save(saga);

    await this.publishSagaEvent('insurance.saga.claim_payment.started', {
      sagaId: saga.sagaId,
      claimId,
      correlationId,
      approvedAmount: context.approvedAmount,
    });

    this.logger.info('Claim payment saga started', { sagaId: saga.sagaId, claimId, correlationId });

    if (saga.context?.requiresFraudCheck) {
      await this.handleFraudCheckStep(saga);
    } else if (saga.context?.requiresHumanApproval) {
      await this.handleHumanApprovalStep(saga);
    } else {
      await this.handleAutoPaymentStep(saga);
    }

    return saga;
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

    const workItem = await this.createWorkItem({
      sagaId: saga.sagaId,
      stepName: 'HUMAN_APPROVAL',
      workItemType: 'payment_approval',
      claimId: saga.claimId || undefined,
      context: {
        approvedAmount: saga.context?.approvedAmount,
        requiresSeniorApproval: (saga.context?.approvedAmount || 0) > 50000000,
      },
      priority: (saga.context?.approvedAmount || 0) > 50000000 ? 'critical' : 'high',
    });

    saga.status = 'waiting';
    await this.sagaRepo.save(saga);

    await this.publishSagaEvent('insurance.saga.human_approval.required', {
      sagaId: saga.sagaId,
      claimId: saga.claimId,
      workItemId: workItem.workItemId,
      approvedAmount: saga.context?.approvedAmount,
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

    await this.publishSagaEvent(
      success ? 'insurance.saga.completed' : 'insurance.saga.failed',
      {
        sagaId: saga.sagaId,
        claimId: saga.claimId,
        sagaType: saga.sagaType,
        completedSteps: saga.completedSteps,
        errorMessage: saga.errorMessage,
      }
    );

    this.logger.info(`Saga ${success ? 'completed' : 'failed'}`, { sagaId: saga.sagaId });
  }

  setupRoutes(): void {
    // POST /orchestrations/sagas - Start new saga
    this.app.post('/orchestrations/sagas', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const body = req.body as StartSagaRequest;

        if (!body.sagaType || !body.claimId) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'sagaType and claimId are required' },
            correlationId,
          });
        }

        if (body.sagaType !== 'ClaimPayment') {
          return res.status(400).json({
            success: false,
            error: { code: 'NOT_SUPPORTED', message: 'Only ClaimPayment saga is supported currently' },
            correlationId,
          });
        }

        const saga = await this.startClaimPaymentSaga(body.claimId, correlationId, body.context);

        return res.status(201).json({
          success: true,
          data: {
            sagaId: saga.sagaId,
            sagaType: saga.sagaType,
            status: saga.status,
            currentStep: saga.currentStep,
          },
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to start saga', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to start saga' },
          correlationId: (req as any).correlationId,
        });
      }
    });

    // GET /orchestrations/sagas/:sagaId
    this.app.get('/orchestrations/sagas/:sagaId', async (req: Request, res: Response) => {
      const correlationId = (req as any).correlationId;
      const { sagaId } = req.params;

      const saga = await this.sagaRepo.findOne({ where: { sagaId }, relations: ['workItems'] });
      if (!saga) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Saga not found' },
          correlationId,
        });
      }

      const workItems = await this.workItemRepo.find({ where: { sagaId } });

      return res.json({
        success: true,
        data: {
          ...saga,
          workItems,
        },
        correlationId,
      });
    });

    // GET /work-items - List work items (HITL queue)
    this.app.get('/work-items', async (req: Request, res: Response) => {
      const correlationId = (req as any).correlationId;
      const { status, assignedTo, priority, limit = '50', offset = '0' } = req.query;

      const qb = this.workItemRepo.createQueryBuilder('wi')
        .leftJoinAndSelect('wi.saga', 'saga');

      if (status) {
        qb.andWhere('wi.status = :status', { status });
      }
      if (assignedTo) {
        qb.andWhere('wi.assigned_to = :assignedTo', { assignedTo });
      }
      if (priority) {
        qb.andWhere('wi.priority = :priority', { priority });
      }

      qb.orderBy('wi.priority', 'DESC')
        .addOrderBy('wi.created_at', 'ASC')
        .limit(parseInt(limit as string, 10))
        .offset(parseInt(offset as string, 10));

      const [workItems, total] = await qb.getManyAndCount();

      return res.json({
        success: true,
        data: workItems,
        pagination: {
          total,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
        },
        correlationId,
      });
    });

    // GET /work-items/:workItemId
    this.app.get('/work-items/:workItemId', async (req: Request, res: Response) => {
      const correlationId = (req as any).correlationId;
      const { workItemId } = req.params;

      const workItem = await this.workItemRepo.findOne({
        where: { workItemId },
        relations: ['saga'],
      });

      if (!workItem) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Work item not found' },
          correlationId,
        });
      }

      return res.json({
        success: true,
        data: workItem,
        correlationId,
      });
    });

    // POST /work-items/:workItemId/complete - HITL decision endpoint
    this.app.post('/work-items/:workItemId/complete', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const { workItemId } = req.params;
        const body = req.body as CompleteWorkItemRequest;

        if (!body.decision || !body.decidedBy) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'decision and decidedBy are required' },
            correlationId,
          });
        }

        const workItem = await this.workItemRepo.findOne({
          where: { workItemId },
          relations: ['saga'],
        });

        if (!workItem) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Work item not found' },
            correlationId,
          });
        }

        if (workItem.status === 'approved' || workItem.status === 'rejected') {
          return res.status(400).json({
            success: false,
            error: { code: 'ALREADY_DECIDED', message: 'Work item has already been decided' },
            correlationId,
          });
        }

        workItem.status = body.decision;
        workItem.decidedBy = body.decidedBy;
        workItem.decisionNotes = body.notes || null;
        workItem.completedAt = new Date();
        workItem.updatedAt = new Date();
        await this.workItemRepo.save(workItem);

        const saga = await this.sagaRepo.findOne({ where: { sagaId: workItem.sagaId } });
        if (saga) {
          saga.completedSteps = [...saga.completedSteps, workItem.stepName];
          saga.updatedAt = new Date();

          if (body.decision === 'rejected') {
            await this.completeSaga(saga, false, `Rejected at ${workItem.stepName}: ${body.notes || 'No notes'}`);
          } else if (body.decision === 'escalated') {
            workItem.status = 'escalated';
            await this.workItemRepo.save(workItem);
          } else if (body.decision === 'approved' && saga.context) {
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
          decision: body.decision,
          decidedBy: body.decidedBy,
        });

        return res.json({
          success: true,
          data: {
            workItemId: workItem.workItemId,
            status: workItem.status,
            sagaId: workItem.sagaId,
          },
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to complete work item', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to complete work item' },
          correlationId: (req as any).correlationId,
        });
      }
    });

    // POST /work-items/:workItemId/assign
    this.app.post('/work-items/:workItemId/assign', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const { workItemId } = req.params;
        const { assignedTo } = req.body;

        if (!assignedTo) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'assignedTo is required' },
            correlationId,
          });
        }

        const workItem = await this.workItemRepo.findOne({ where: { workItemId } });
        if (!workItem) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Work item not found' },
            correlationId,
          });
        }

        workItem.assignedTo = assignedTo;
        workItem.status = 'in_progress';
        workItem.updatedAt = new Date();
        await this.workItemRepo.save(workItem);

        return res.json({
          success: true,
          data: {
            workItemId: workItem.workItemId,
            assignedTo: workItem.assignedTo,
            status: workItem.status,
          },
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to assign work item', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to assign work item' },
          correlationId: (req as any).correlationId,
        });
      }
    });
  }
}
