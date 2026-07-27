import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ModelSwitchboardService } from './model-switchboard.service';
import { ModelSwitchboardController } from './model-switchboard.controller';
import { HealthController } from './health.controller';
import { ModelDefinition } from './entities/ModelDefinition';
import { ModelInvocation } from './entities/ModelInvocation';
import { RoutePolicy } from './entities/RoutePolicy';
import { UsageRecord } from './entities/UsageRecord';
import { ModelCard } from './entities/ModelCard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';

import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { OutboxEvent } from '@insurance/shared';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'model_switchboard',
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
      entities: [ModelDefinition, ModelInvocation, RoutePolicy, UsageRecord, ModelCard, OutboxEvent],
    }),
    TypeOrmModule.forFeature([ModelDefinition, ModelInvocation, RoutePolicy, UsageRecord, ModelCard, OutboxEvent]),
    HttpModule,
  ],
  controllers: [ModelSwitchboardController, HealthController],
  providers: [TenantGuard, AbacGuard, ModelSwitchboardService, JwtAuthGuard, PermissionsGuard],
})
export class AppModule {}
