import { Module, OnModuleInit, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AmlController } from './aml.controller';
import { AmlService } from './aml.service';
import { TransactionConsumer } from './transaction.consumer';
import { AmlConsent } from './entities/AmlConsent';
import { AmlRule } from './entities/AmlRule';
import { AmlAlert } from './entities/AmlAlert';
import { OutboxEvent, ConsumedEvent, DeadLetterEvent } from '@insurance/shared';
import { AmlAlertDecision } from './entities/AmlAlertDecision';
import { ExternalDataSource } from './entities/ExternalDataSource';
import { HealthController } from './health.controller';
import { PiiMaskingMiddleware } from './pii-masking.middleware';

import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { BulkRateLimitGuard } from './bulk-rate-limit.guard'; // P2 #1: bulk rate limiting
import { AsyncJobService } from './async-job.service'; // P2 #2: async processing
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
      entities: [AmlConsent, AmlRule, AmlAlert, AmlAlertDecision, ExternalDataSource, OutboxEvent, ConsumedEvent, DeadLetterEvent],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([AmlConsent, AmlRule, AmlAlert, AmlAlertDecision, ExternalDataSource, OutboxEvent, ConsumedEvent, DeadLetterEvent]),
  ],
  controllers: [AmlController, HealthController],
  providers: [TenantGuard, AbacGuard, AmlService, TransactionConsumer, JwtAuthGuard, PermissionsGuard, BulkRateLimitGuard, AsyncJobService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PiiMaskingMiddleware).forRoutes('*');
  }
}
