// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FraudMLModel, ModelStatus } from '../entities/FraudMLModel';
import { FraudScoreAudit } from '../entities/FraudScoreAudit';
import { FraudCase } from '../entities/FraudCase';
import { FraudMLTrainingService } from './ml-training.service';

export interface DriftDetectionResult {
  modelId: string;
  modelName: string;
  driftDetected: boolean;
  driftType: 'concept_drift' | 'data_drift' | 'performance_drift' | 'none';
  driftScore: number;
  threshold: number;
  metrics: {
    currentAccuracy: number;
    baselineAccuracy: number;
    accuracyDelta: number;
    currentPrecision: number;
    baselinePrecision: number;
    precisionDelta: number;
    currentRecall: number;
    baselineRecall: number;
    recallDelta: number;
    currentF1: number;
    baselineF1: number;
    f1Delta: number;
    predictionCount: number;
    period: string;
  };
  recommendation: 'retrain' | 'monitor' | 'degrade' | 'no_action';
  detectedAt: Date;
}

export interface RetrainingConfig {
  minSamplesForRetraining: number;
  performanceThreshold: number;
  driftThreshold: number;
  autoRetrain: boolean;
  retrainSchedule: 'daily' | 'weekly' | 'monthly';
  maxRetrainAttempts: number;
}

@Injectable()
export class FraudMLDriftDetectionService {
  private readonly logger = new Logger(FraudMLDriftDetectionService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(FraudMLModel) private readonly modelRepo: Repository<FraudMLModel>,
    @InjectRepository(FraudScoreAudit) private readonly scoreAuditRepo: Repository<FraudScoreAudit>,
    @InjectRepository(FraudCase) private readonly fraudCaseRepo: Repository<FraudCase>,
    private readonly mlTrainingService: FraudMLTrainingService
  ) {}

  private getDefaultRetrainingConfig(): RetrainingConfig {
    return {
      minSamplesForRetraining: parseInt(process.env.ML_RETRAIN_MIN_SAMPLES || '500', 10),
      performanceThreshold: parseFloat(process.env.ML_PERFORMANCE_THRESHOLD || '0.1'),
      driftThreshold: parseFloat(process.env.ML_DRIFT_THRESHOLD || '0.15'),
      autoRetrain: process.env.ML_AUTO_RETRAIN === 'true',
      retrainSchedule: (process.env.ML_RETRAIN_SCHEDULE as any) || 'weekly',
      maxRetrainAttempts: parseInt(process.env.ML_MAX_RETRAIN_ATTEMPTS || '3', 10),
    };
  }

  async detectDrift(modelId: string, periodDays: number = 7): Promise<DriftDetectionResult> {
    this.logger.log(`Detecting drift for model: ${modelId} (period: ${periodDays} days)`);

    const model = await this.modelRepo.findOne({ where: { id: modelId } });
    if (!model) {
      throw new Error('Model not found');
    }

    if (model.status !== ModelStatus.DEPLOYED) {
      throw new Error('Model must be deployed to detect drift');
    }

    const config = this.getDefaultRetrainingConfig();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get current performance metrics from recent predictions
    const currentMetrics = await this.calculateCurrentMetrics(modelId, startDate, endDate);
    
    // Get baseline metrics from model training/validation
    const baselineMetrics = this.getBaselineMetrics(model);

    // Calculate drift
    const driftScore = this.calculateDriftScore(currentMetrics, baselineMetrics);
    const driftDetected = driftScore > config.driftThreshold;
    
    // Determine drift type
    const driftType = this.determineDriftType(currentMetrics, baselineMetrics, config);

    // Generate recommendation
    const recommendation = this.generateRecommendation(driftDetected, driftType, driftScore, config, currentMetrics);

    const result: DriftDetectionResult = {
      modelId,
      modelName: model.modelName,
      driftDetected,
      driftType,
      driftScore,
      threshold: config.driftThreshold,
      metrics: {
        currentAccuracy: currentMetrics.accuracy,
        baselineAccuracy: baselineMetrics.accuracy,
        accuracyDelta: currentMetrics.accuracy - baselineMetrics.accuracy,
        currentPrecision: currentMetrics.precision,
        baselinePrecision: baselineMetrics.precision,
        precisionDelta: currentMetrics.precision - baselineMetrics.precision,
        currentRecall: currentMetrics.recall,
        baselineRecall: baselineMetrics.recall,
        recallDelta: currentMetrics.recall - baselineMetrics.recall,
        currentF1: currentMetrics.f1Score,
        baselineF1: baselineMetrics.f1Score,
        f1Delta: currentMetrics.f1Score - baselineMetrics.f1Score,
        predictionCount: currentMetrics.sampleCount,
        period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      },
      recommendation,
      detectedAt: new Date(),
    };

    // Store drift detection result in model metadata
    const existingMetadata = model.metadata || {};
    await this.modelRepo.update(modelId, {
      metadata: {
        ...existingMetadata,
        lastDriftDetection: result,
      },
    });

    // Auto-trigger retraining if configured
    if (driftDetected && recommendation === 'retrain' && config.autoRetrain) {
      this.logger.log(`Auto-triggering retraining for model: ${modelId}`);
      this.triggerRetraining(modelId, config).catch((error) => {
        this.logger.error(`Auto-retraining failed for model: ${modelId}`, error);
      });
    }

    return result;
  }

  private async calculateCurrentMetrics(
    modelId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    sampleCount: number;
  }> {
    // Get recent score audits for this model
    const scoreAudits = await this.scoreAuditRepo
      .createQueryBuilder('sa')
      .where('sa.createdAt >= :startDate', { startDate })
      .andWhere('sa.createdAt <= :endDate', { endDate })
      .getMany();

    if (scoreAudits.length === 0) {
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        sampleCount: 0,
      };
    }

    // Get corresponding fraud cases to determine actual fraud status
    const claimIds = scoreAudits.map((sa) => sa.claimId);
    const fraudCases = await this.fraudCaseRepo
      .createQueryBuilder('fc')
      .where('fc.claimId IN (:...claimIds)', { claimIds })
      .getMany();

    const fraudCaseMap = new Map(fraudCases.map((fc) => [fc.claimId, fc]));

    // Calculate metrics
    let truePositive = 0;
    let trueNegative = 0;
    let falsePositive = 0;
    let falseNegative = 0;

    for (const audit of scoreAudits) {
      const fraudCase = fraudCaseMap.get(audit.claimId);
      const isFraud = !!fraudCase;
      const predictedFraud = audit.holdClaim;

      if (isFraud && predictedFraud) {
        truePositive++;
      } else if (!isFraud && !predictedFraud) {
        trueNegative++;
      } else if (!isFraud && predictedFraud) {
        falsePositive++;
      } else {
        falseNegative++;
      }
    }

    const accuracy = (truePositive + trueNegative) / scoreAudits.length;
    const precision = truePositive + falsePositive > 0 ? truePositive / (truePositive + falsePositive) : 0;
    const recall = truePositive + falseNegative > 0 ? truePositive / (truePositive + falseNegative) : 0;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      sampleCount: scoreAudits.length,
    };
  }

  private getBaselineMetrics(model: FraudMLModel): {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  } {
    // Use validation metrics if available, otherwise use training metrics
    const metrics = model.validationMetrics || model.trainingMetrics;
    
    return {
      accuracy: metrics?.accuracy || 0.8,
      precision: metrics?.precision || 0.8,
      recall: metrics?.recall || 0.8,
      f1Score: metrics?.f1Score || 0.8,
    };
  }

  private calculateDriftScore(
    currentMetrics: { accuracy: number; precision: number; recall: number; f1Score: number },
    baselineMetrics: { accuracy: number; precision: number; recall: number; f1Score: number }
  ): number {
    // Calculate weighted drift score based on metric degradation
    const accuracyDelta = Math.abs(baselineMetrics.accuracy - currentMetrics.accuracy);
    const precisionDelta = Math.abs(baselineMetrics.precision - currentMetrics.precision);
    const recallDelta = Math.abs(baselineMetrics.recall - currentMetrics.recall);
    const f1Delta = Math.abs(baselineMetrics.f1Score - currentMetrics.f1Score);

    // Weighted average (F1 score is most important)
    const driftScore = (
      accuracyDelta * 0.2 +
      precisionDelta * 0.2 +
      recallDelta * 0.2 +
      f1Delta * 0.4
    );

    return driftScore;
  }

  private determineDriftType(
    currentMetrics: { accuracy: number; precision: number; recall: number; f1Score: number },
    baselineMetrics: { accuracy: number; precision: number; recall: number; f1Score: number },
    config: RetrainingConfig
  ): 'concept_drift' | 'data_drift' | 'performance_drift' | 'none' {
    const performanceDrift = this.calculateDriftScore(currentMetrics, baselineMetrics);
    
    if (performanceDrift < config.performanceThreshold) {
      return 'none';
    }

    // If precision drops significantly but recall stays stable -> data drift
    if (baselineMetrics.precision - currentMetrics.precision > config.performanceThreshold &&
        Math.abs(baselineMetrics.recall - currentMetrics.recall) < config.performanceThreshold) {
      return 'data_drift';
    }

    // If recall drops significantly -> concept drift
    if (baselineMetrics.recall - currentMetrics.recall > config.performanceThreshold) {
      return 'concept_drift';
    }

    // General performance degradation
    return 'performance_drift';
  }

  private generateRecommendation(
    driftDetected: boolean,
    driftType: string,
    driftScore: number,
    config: RetrainingConfig,
    currentMetrics: { sampleCount: number }
  ): 'retrain' | 'monitor' | 'degrade' | 'no_action' {
    if (!driftDetected) {
      return 'no_action';
    }

    // Check if we have enough data for retraining
    if (currentMetrics.sampleCount < config.minSamplesForRetraining) {
      return 'monitor';
    }

    // If drift is severe, recommend retraining
    if (driftScore > config.driftThreshold * 1.5) {
      return 'retrain';
    }

    // If drift is moderate, recommend monitoring
    if (driftScore > config.driftThreshold) {
      return 'monitor';
    }

    // If performance is degrading but not severe, consider degrading
    if (driftType === 'performance_drift') {
      return 'degrade';
    }

    return 'monitor';
  }

  async triggerRetraining(modelId: string, config?: RetrainingConfig): Promise<{ modelId: string; status: string }> {
    this.logger.log(`Triggering retraining for model: ${modelId}`);

    const model = await this.modelRepo.findOne({ where: { id: modelId } });
    if (!model) {
      throw new Error('Model not found');
    }

    const retrainConfig = config || this.getDefaultRetrainingConfig();

    // Check if we've exceeded max retrain attempts
    const retrainAttempts = ((model.metadata?.retrainAttempts || 0) as number);
    if (retrainAttempts >= retrainConfig.maxRetrainAttempts) {
      this.logger.warn(`Max retrain attempts reached for model: ${modelId}`);
      const existingMetadata = model.metadata || {};
      await this.modelRepo.update(modelId, {
        status: ModelStatus.DEPRECATED,
        metadata: {
          ...existingMetadata,
          deprecationReason: 'Max retrain attempts reached',
          deprecatedAt: new Date(),
        },
      });
      return { modelId, status: 'deprecated' };
    }

    // Create new model version for retraining
    const trainingResult = await this.mlTrainingService.startTraining({
      modelName: model.modelName,
      modelType: model.modelType,
      config: model.modelConfig as any,
      description: `Retrained from model ${modelId} due to drift detection`,
      tenantId: model.tenantId || undefined,
      trainedBy: 'system_drift_detection',
    });

    // Update original model metadata
    const existingMetadata = model.metadata || {};
    await this.modelRepo.update(modelId, {
      metadata: {
        ...existingMetadata,
        retrainAttempts: retrainAttempts + 1,
        lastRetrainedAt: new Date(),
        retrainedModelId: trainingResult.modelId,
      },
    });

    this.logger.log(`Retraining started for model: ${modelId} -> new model: ${trainingResult.modelId}`);

    return { modelId, status: 'retraining_started' };
  }

  async scheduledDriftDetection(): Promise<void> {
    this.logger.log('Running scheduled drift detection for all deployed models');

    const deployedModels = await this.modelRepo.find({
      where: { status: ModelStatus.DEPLOYED, isDefault: true },
    });

    for (const model of deployedModels) {
      try {
        const result = await this.detectDrift(model.id, 7); // Check last 7 days
        
        if (result.driftDetected) {
          this.logger.warn(`Drift detected for model: ${model.id} (${model.modelName})`, {
            driftType: result.driftType,
            driftScore: result.driftScore,
            recommendation: result.recommendation,
          });
        }
      } catch (error) {
        this.logger.error(`Drift detection failed for model: ${model.id}`, error);
      }
    }

    this.logger.log(`Scheduled drift detection completed for ${deployedModels.length} models`);
  }

  async getDriftHistory(modelId: string, limit: number = 30): Promise<DriftDetectionResult[]> {
    const model = await this.modelRepo.findOne({ where: { id: modelId } });
    if (!model) {
      throw new Error('Model not found');
    }

    const history = model.metadata?.driftHistory || [];
    return history.slice(0, limit);
  }

  async compareModelVersions(modelId1: string, modelId2: string): Promise<{
    model1: {
      id: string;
      name: string;
      version: string;
      metrics: any;
    };
    model2: {
      id: string;
      name: string;
      version: string;
      metrics: any;
    };
    comparison: {
      accuracyDelta: number;
      precisionDelta: number;
      recallDelta: number;
      f1Delta: number;
      recommendation: string;
    };
  }> {
    const [model1, model2] = await Promise.all([
      this.modelRepo.findOne({ where: { id: modelId1 } }),
      this.modelRepo.findOne({ where: { id: modelId2 } }),
    ]);

    if (!model1 || !model2) {
      throw new Error('One or both models not found');
    }

    const metrics1 = model1.validationMetrics || model1.trainingMetrics;
    const metrics2 = model2.validationMetrics || model2.trainingMetrics;

    const accuracyDelta = (metrics2?.accuracy || 0) - (metrics1?.accuracy || 0);
    const precisionDelta = (metrics2?.precision || 0) - (metrics1?.precision || 0);
    const recallDelta = (metrics2?.recall || 0) - (metrics1?.recall || 0);
    const f1Delta = (metrics2?.f1Score || 0) - (metrics1?.f1Score || 0);

    let recommendation = 'keep_current';
    if (f1Delta > 0.05) {
      recommendation = 'switch_to_model2';
    } else if (f1Delta < -0.05) {
      recommendation = 'keep_current';
    } else {
      recommendation = 'insignificant_difference';
    }

    return {
      model1: {
        id: model1.id,
        name: model1.modelName,
        version: model1.modelVersion,
        metrics: metrics1,
      },
      model2: {
        id: model2.id,
        name: model2.modelName,
        version: model2.modelVersion,
        metrics: metrics2,
      },
      comparison: {
        accuracyDelta,
        precisionDelta,
        recallDelta,
        f1Delta,
        recommendation,
      },
    };
  }

  async getRetrainingConfig(): Promise<RetrainingConfig> {
    return this.getDefaultRetrainingConfig();
  }

  async updateRetrainingConfig(config: Partial<RetrainingConfig>): Promise<RetrainingConfig> {
    // In a real implementation, this would store the config in the database
    // For now, just return the updated config
    const currentConfig = this.getDefaultRetrainingConfig();
    return { ...currentConfig, ...config };
  }
}
