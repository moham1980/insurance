import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OutboxPublisher } from '@insurance/shared';
import { ModelInventory, ModelStatus, ModelRiskLevel } from '../entities/ModelInventory';

export interface ModelStateTransition {
  from: ModelStatus;
  to: ModelStatus;
  requiresApproval: boolean;
  requiredRiskLevel: ModelRiskLevel[];
  requiresValidationReport: boolean;
}

export interface TransitionResult {
  success: boolean;
  previousStatus: ModelStatus;
  newStatus: ModelStatus;
  message: string;
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

@Injectable()
export class ModelLifecycleService {
  private readonly stateTransitions: Map<string, ModelStateTransition> = new Map();

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ModelInventory)
    private readonly modelRepository: Repository<ModelInventory>,
  ) {
    this.initializeTransitions();
  }

  private initializeTransitions(): void {
    // Development -> Testing
    this.stateTransitions.set('development->testing', {
      from: 'development',
      to: 'testing',
      requiresApproval: false,
      requiredRiskLevel: ['low', 'medium'],
      requiresValidationReport: false,
    });

    // Testing -> Staging
    this.stateTransitions.set('testing->staging', {
      from: 'testing',
      to: 'staging',
      requiresApproval: true,
      requiredRiskLevel: ['low', 'medium'],
      requiresValidationReport: true,
    });

    // Staging -> Production
    this.stateTransitions.set('staging->production', {
      from: 'staging',
      to: 'production',
      requiresApproval: true,
      requiredRiskLevel: ['low', 'medium', 'high'],
      requiresValidationReport: true,
    });

    // Production -> Deprecated
    this.stateTransitions.set('production->deprecated', {
      from: 'production',
      to: 'deprecated',
      requiresApproval: true,
      requiredRiskLevel: ['low', 'medium', 'high', 'critical'],
      requiresValidationReport: false,
    });

    // Deprecated -> Retired
    this.stateTransitions.set('deprecated->retired', {
      from: 'deprecated',
      to: 'retired',
      requiresApproval: true,
      requiredRiskLevel: ['low', 'medium', 'high', 'critical'],
      requiresValidationReport: false,
    });

    // Rollback transitions (for emergency)
    this.stateTransitions.set('production->staging', {
      from: 'production',
      to: 'staging',
      requiresApproval: true,
      requiredRiskLevel: ['low', 'medium', 'high', 'critical'],
      requiresValidationReport: false,
    });

    this.stateTransitions.set('staging->testing', {
      from: 'staging',
      to: 'testing',
      requiresApproval: false,
      requiredRiskLevel: ['low', 'medium', 'high', 'critical'],
      requiresValidationReport: false,
    });

    this.stateTransitions.set('testing->development', {
      from: 'testing',
      to: 'development',
      requiresApproval: false,
      requiredRiskLevel: ['low', 'medium', 'high', 'critical'],
      requiresValidationReport: false,
    });
  }

  async transitionModel(
    modelId: string,
    targetStatus: ModelStatus,
    approvedBy?: string,
  ): Promise<TransitionResult> {
    const model = await this.modelRepository.findOne({ where: { modelId } });
    
    if (!model) {
      throw new BadRequestException(`Model with ID ${modelId} not found`);
    }

    const currentStatus = model.status;
    const transitionKey = `${currentStatus}->${targetStatus}`;
    const transition = this.stateTransitions.get(transitionKey);

    if (!transition) {
      throw new BadRequestException(
        `Invalid transition from ${currentStatus} to ${targetStatus}. Allowed transitions: ${this.getAllowedTransitions(currentStatus).join(', ')}`,
      );
    }

    // Check if approval is required
    if (transition.requiresApproval && !approvedBy) {
      return {
        success: false,
        previousStatus: currentStatus,
        newStatus: currentStatus,
        message: `Transition from ${currentStatus} to ${targetStatus} requires approval`,
        requiresApproval: true,
      };
    }

    // Check risk level requirements
    if (transition.requiredRiskLevel.length > 0 && 
        !transition.requiredRiskLevel.includes(model.riskLevel)) {
      throw new BadRequestException(
        `Transition from ${currentStatus} to ${targetStatus} requires risk level to be one of: ${transition.requiredRiskLevel.join(', ')}. Current risk level: ${model.riskLevel}`,
      );
    }

    // Check if validation report is required
    if (transition.requiresValidationReport && !model.lastEvaluationDate) {
      throw new BadRequestException(
        `Transition from ${currentStatus} to ${targetStatus} requires a validation report. Please run model evaluation first.`,
      );
    }

    // Update model status
    const previousStatus = model.status;
    model.status = targetStatus;
    
    if (targetStatus === 'production') {
      model.deploymentDate = new Date();
    }

    // Update evaluation dates
    if (targetStatus === 'production' || targetStatus === 'staging') {
      model.lastEvaluationDate = new Date();
      // Set next evaluation date to 30 days from now
      model.nextEvaluationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const correlationId = uuidv4();

    await this.dataSource.transaction(async (manager) => {
      await manager.save(model);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.ai.model.transitioned',
        eventType: 'AiModelTransitioned',
        eventVersion: 1,
        correlationId,
        subject: {
          modelId: model.modelId,
        },
        payload: {
          modelId: model.modelId,
          modelName: model.modelName,
          previousStatus,
          newStatus: targetStatus,
          approvedBy: approvedBy || null,
          transitionedAt: new Date().toISOString(),
        },
      });
      if (targetStatus === 'production') {
        await outbox.publish({
          topic: 'insurance.ai.model.deployed',
          eventType: 'ModelDeployed',
          eventVersion: 1,
          correlationId,
          subject: {
            modelId: model.modelId,
          },
          payload: {
            modelId: model.modelId,
            modelName: model.modelName,
            modelKey: model.modelId,
            version: model.version,
            deployedBy: approvedBy || null,
            riskLevel: model.riskLevel,
            previousStatus,
          },
        });
      }
    });

    return {
      success: true,
      previousStatus,
      newStatus: targetStatus,
      message: `Model successfully transitioned from ${previousStatus} to ${targetStatus}`,
      requiresApproval: false,
      approvedBy,
      approvedAt: approvedBy ? new Date() : undefined,
    };
  }

  getAllowedTransitions(currentStatus: ModelStatus): ModelStatus[] {
    const transitions: ModelStatus[] = [];
    
    for (const [key, transition] of this.stateTransitions.entries()) {
      if (transition.from === currentStatus) {
        transitions.push(transition.to);
      }
    }
    
    return transitions;
  }

  async getModelState(modelId: string): Promise<{
    modelId: string;
    modelName: string;
    currentStatus: ModelStatus;
    allowedTransitions: ModelStatus[];
    riskLevel: ModelRiskLevel;
    deploymentDate: Date | null;
    nextEvaluationDate: Date | null;
  }> {
    const model = await this.modelRepository.findOne({ where: { modelId } });
    
    if (!model) {
      throw new BadRequestException(`Model with ID ${modelId} not found`);
    }

    return {
      modelId: model.modelId,
      modelName: model.modelName,
      currentStatus: model.status,
      allowedTransitions: this.getAllowedTransitions(model.status),
      riskLevel: model.riskLevel,
      deploymentDate: model.deploymentDate,
      nextEvaluationDate: model.nextEvaluationDate,
    };
  }

  async getModelsByStatus(status: ModelStatus): Promise<ModelInventory[]> {
    return this.modelRepository.find({ where: { status } });
  }

  async getModelsNeedingEvaluation(): Promise<ModelInventory[]> {
    const now = new Date();
    return this.modelRepository
      .createQueryBuilder('model')
      .where('model.nextEvaluationDate <= :now', { now })
      .andWhere('model.status IN (:...statuses)', { statuses: ['staging', 'production'] })
      .getMany();
  }

  async autoRetireDeprecatedModels(daysThreshold: number = 90): Promise<ModelInventory[]> {
    const thresholdDate = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);
    
    const deprecatedModels = await this.modelRepository
      .createQueryBuilder('model')
      .where('model.status = :status', { status: 'deprecated' })
      .andWhere('model.updatedAt <= :thresholdDate', { thresholdDate })
      .getMany();

    const retiredModels: ModelInventory[] = [];
    const correlationId = uuidv4();

    await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      for (const model of deprecatedModels) {
        model.status = 'retired';
        await manager.save(model);
        retiredModels.push(model);
        await outbox.publish({
          topic: 'insurance.ai.model.retired',
          eventType: 'AiModelRetired',
          eventVersion: 1,
          correlationId,
          subject: {
            modelId: model.modelId,
          },
          payload: {
            modelId: model.modelId,
            modelName: model.modelName,
            retiredAt: new Date().toISOString(),
            daysDeprecated: daysThreshold,
          },
        });
      }
    });

    return retiredModels;
  }

  getTransitionRules(): ModelStateTransition[] {
    return Array.from(this.stateTransitions.values());
  }
}
