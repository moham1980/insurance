import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SagaInstance } from './entities/SagaInstance';
import { SagaStep } from './entities/SagaStep';
import { WorkItem } from './entities/WorkItem';
import { ConsumedEvent, DeadLetterEvent, OutboxEvent, DeadLetterQueueService, createLogger } from '@insurance/shared';
import { OrchestrationsController } from './orchestrations.controller';
import { WorkflowsController } from './workflows.controller';
import { DlqController } from './dlq.controller';
import { WorkItemsController } from './work-items.controller';
import { OrchestratorService } from './orchestrator.service';
import { SlaMonitorService } from './sla-monitor.service';
import { EcosystemAiClient } from './ecosystem-ai.client';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { HealthController } from './health.controller';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { DataSource } from 'typeorm';

export const DLQ_PROVIDER = {
  provide: 'DLQ_SERVICE',
  useFactory: (dataSource: DataSource) => {
    const brokersEnv = process.env.KAFKA_BROKERS;
    const logger = createLogger({ serviceName: 'orchestrator-service', level: process.env.LOG_LEVEL || 'info' });
    return new DeadLetterQueueService(
      {
        dataSource,
        ...(typeof brokersEnv === 'string' && brokersEnv.trim().length > 0
          ? {
              kafkaConfig: {
                brokers: brokersEnv
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean),
                clientId: process.env.KAFKA_CLIENT_ID || 'orchestrator-dlq',
              },
            }
          : {}),
        maxRetries: parseInt(process.env.DLQ_MAX_RETRIES || '3', 10),
      },
      logger
    );
  },
  inject: [DataSource],
};

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'public',
      entities: [SagaInstance, SagaStep, WorkItem, ConsumedEvent, DeadLetterEvent, OutboxEvent],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([SagaInstance, SagaStep, WorkItem, ConsumedEvent, DeadLetterEvent, OutboxEvent]),
  ],
  controllers: [OrchestrationsController, WorkflowsController, WorkItemsController, DlqController, HealthController],
  providers: [AbacGuard, TenantGuard, OrchestratorService, SlaMonitorService, EcosystemAiClient, JwtAuthGuard, PermissionsGuard, DLQ_PROVIDER],
})
export class AppModule {}
