import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Metric, SLO, Alert, AlertSilence, DashboardConfig } from './entities/MonitoringEntities';
import { ConsumedEvent, DeadLetterEvent } from '@insurance/shared';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { ComplaintSlaConsumer } from './complaint-sla.consumer';
import { HealthController } from './health.controller';

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
      schema: process.env.DB_SCHEMA || 'monitoring',
      entities: [Metric, SLO, Alert, AlertSilence, DashboardConfig, ConsumedEvent, DeadLetterEvent],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([Metric, SLO, Alert, AlertSilence, DashboardConfig, ConsumedEvent, DeadLetterEvent]),
  ],
  controllers: [MonitoringController, HealthController],
  providers: [TenantGuard, AbacGuard, MonitoringService, ComplaintSlaConsumer, JwtAuthGuard, PermissionsGuard],
})
export class AppModule {}
