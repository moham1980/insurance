import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelInventory } from '../entities/ModelInventory';
import { ValidationWorkflowService } from './validation-workflow.service';
import { AIIncidentResponseService } from './ai-incident-response.service';

@Injectable()
export class BiasEvaluationSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BiasEvaluationSchedulerService.name);
  private intervalHandle: NodeJS.Timeout | null = null;

  private readonly intervalMs: number;

  constructor(
    @InjectRepository(ModelInventory)
    private readonly modelRepo: Repository<ModelInventory>,
    private readonly validationWorkflow: ValidationWorkflowService,
    private readonly incidentResponse: AIIncidentResponseService,
  ) {
    const ms = parseInt(process.env.BIAS_EVALUATION_INTERVAL_MS || '', 10);
    if (ms > 0) {
      this.intervalMs = ms;
    } else {
      const hours = parseInt(process.env.BIAS_EVALUATION_INTERVAL_HOURS || '24', 10);
      this.intervalMs = hours * 60 * 60 * 1000;
    }
  }

  onModuleInit() {
    const enabled = process.env.BIAS_EVALUATION_CRON_ENABLED !== 'false';
    if (!enabled) {
      this.logger.log('Bias evaluation scheduler disabled (BIAS_EVALUATION_CRON_ENABLED=false)');
      return;
    }
    this.logger.log(`Bias evaluation scheduler started (interval: ${this.intervalMs}ms)`);
    this.intervalHandle = setInterval(() => {
      this.runScheduledBiasEvaluation().catch((err) => {
        this.logger.error(`Scheduled bias evaluation failed: ${err.message}`);
      });
    }, this.intervalMs);
  }

  onModuleDestroy() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      this.logger.log('Bias evaluation scheduler stopped');
    }
  }

  async runScheduledBiasEvaluation(): Promise<void> {
    this.logger.log('Running scheduled bias evaluation for production models...');

    const productionModels = await this.modelRepo.find({
      where: { status: 'production' as any },
    });

    if (productionModels.length === 0) {
      this.logger.log('No production models found for bias evaluation');
      return;
    }

    for (const model of productionModels) {
      try {
        const report = await this.validationWorkflow.initiateValidation(
          model.modelId,
          model.version,
          'bias',
          'system-scheduler',
        );

        this.logger.log(
          `Bias validation initiated for model ${model.modelName} (${model.modelId}), report: ${report.reportId}`,
        );

        if (report.status === 'failed' && report.failedTests > 0) {
          await this.incidentResponse.createIncident(
            model.modelId,
            model.modelName,
            'bias_detected',
            'high',
            `Bias detected in ${model.modelName}`,
            `Scheduled bias evaluation failed for ${model.modelName} with ${report.failedTests} failed tests`,
            'system-scheduler',
          );
          this.logger.warn(
            `Bias incident reported for model ${model.modelName} (${model.modelId})`,
          );
        }

        model.lastEvaluationDate = new Date();
        const nextEval = new Date();
        nextEval.setTime(nextEval.getTime() + this.intervalMs);
        model.nextEvaluationDate = nextEval;
        await this.modelRepo.save(model);
      } catch (err: any) {
        this.logger.error(
          `Bias evaluation failed for model ${model.modelName} (${model.modelId}): ${err.message}`,
        );
      }
    }

    this.logger.log(`Scheduled bias evaluation completed for ${productionModels.length} models`);
  }
}
