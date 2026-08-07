import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowDefinition } from './entities/WorkflowDefinition';
import { WorkflowInstance } from './entities/WorkflowInstance';
import { WorkflowTemplate } from './entities/WorkflowTemplate';
import { HealthController } from './health.controller';
import { ProfileRecoAdapter } from './profile-reco.adapter';
import { ProfileRecoController } from './profile-reco.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';

import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { OutboxEvent } from '@insurance/shared';
import { TaskExecutor } from './task-executor.interface';
import { PlaceholderTaskExecutor } from './task-executor.service';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'workflow_service',
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
      entities: [WorkflowDefinition, WorkflowInstance, WorkflowTemplate, OutboxEvent],
    }),
    TypeOrmModule.forFeature([WorkflowDefinition, WorkflowInstance, WorkflowTemplate, OutboxEvent]),
  ],
  controllers: [WorkflowController, HealthController, ProfileRecoController],
  providers: [TenantGuard, AbacGuard, WorkflowService, ProfileRecoAdapter, JwtAuthGuard, PermissionsGuard,
    { provide: TaskExecutor, useClass: PlaceholderTaskExecutor }],
})
export class AppModule {}
