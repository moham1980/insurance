import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Policy } from './entities/Policy';
import { PolicyChange } from './entities/PolicyChange';
import { PolicyInquiry } from './entities/PolicyInquiry';
import { PolicyRenewal } from './entities/PolicyRenewal';
import { OutboxEvent, ConsumedEvent, DeadLetterEvent } from '@insurance/shared';
import { PolicyController } from './policy.controller';
import { PolicyService } from './policy.service';
import { PolicyArchiveJob } from './archive-job';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { PiiMaskingInterceptor } from './pii-masking.interceptor';
import { PaymentConsumer } from './payment.consumer';
import { HealthController } from './health.controller';
import { AppDataSource } from './data-source';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      synchronize: process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([Policy, PolicyChange, PolicyInquiry, PolicyRenewal, OutboxEvent, ConsumedEvent, DeadLetterEvent]),
  ],
  controllers: [PolicyController, HealthController],
  providers: [PolicyService, PolicyArchiveJob, PaymentConsumer, JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard, {
    provide: APP_INTERCEPTOR,
    useClass: PiiMaskingInterceptor,
  }],
  exports: [PolicyService],
})
export class AppModule {}
