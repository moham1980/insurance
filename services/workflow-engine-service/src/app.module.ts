import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowEngineController } from './workflow-engine.controller';
import { HealthController } from './health.controller';
import { ProcessDefinition } from './entities/process-definition.entity';
import { ProcessInstance } from './entities/process-instance.entity';
import { ProcessToken } from './entities/process-token.entity';
import { ProcessVariable } from './entities/process-variable.entity';
import { ProcessHistory } from './entities/process-history.entity';
import { ProcessTimer } from './entities/process-timer.entity';
import { AuditLog } from './entities/audit-log.entity'; // P1 #10
import { EntityVersion } from './entities/entity-version.entity'; // P1 #10
import { ConsumedEvent, DeadLetterEvent, OutboxEvent, IdempotencyInterceptor } from '@insurance/shared';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';

import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'workflow',
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
      entities: [ProcessDefinition, ProcessInstance, ProcessToken, ProcessVariable, ProcessHistory, ProcessTimer, AuditLog, EntityVersion, OutboxEvent, ConsumedEvent, DeadLetterEvent],
    }),
    TypeOrmModule.forFeature([ProcessDefinition, ProcessInstance, ProcessToken, ProcessVariable, ProcessHistory, ProcessTimer, AuditLog, EntityVersion, OutboxEvent, ConsumedEvent, DeadLetterEvent]),
    HttpModule,
  ],
  controllers: [WorkflowEngineController, HealthController],
  providers: [AbacGuard, TenantGuard, WorkflowEngineService, JwtAuthGuard, PermissionsGuard, IdempotencyInterceptor, {
    provide: 'TIMER_POLL_INTERVAL_MS',
    useValue: parseInt(process.env.TIMER_POLL_INTERVAL_MS || '5000', 10),
  }],
})
export class AppModule {}
