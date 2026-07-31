import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Policy } from './entities/Policy';
import { PolicyChange } from './entities/PolicyChange';
import { PolicyInquiry } from './entities/PolicyInquiry';
import { PolicyRenewal } from './entities/PolicyRenewal';
import { PolicyProjection } from './entities/PolicyProjection';
import { PolicyCoverage } from './entities/PolicyCoverage';
import { PolicyParty } from './entities/PolicyParty';
import { PolicyDocument } from './entities/PolicyDocument';
import { Endorsement } from './entities/Endorsement';
import { EndorsementChange } from './entities/EndorsementChange';
import { AuditRecord } from './entities/AuditRecord';
import { TransitionAudit } from './entities/TransitionAudit';
import { OutboxEvent, ConsumedEvent, DeadLetterEvent, TenantIsolationInterceptor, TracingInterceptor } from '@insurance/shared';
import { PolicyController } from './policy.controller';
import { P3PolicyController } from './p3-policy.controller';
import { PolicyProjectionController } from './policy-projection.controller';
import { PolicyService } from './policy.service';
import { P3PolicyLifecycleService } from './p3-policy-lifecycle.service';
import { PolicyProjectionService } from './policy-projection.service';
import { ProjectionSyncService } from './projection-sync.service';
import { BrokerLicenseClient } from './broker-license.client';
import { DistributionAgreementClient } from './distribution-agreement.client';
import { AuditService } from './audit.service';
import { RenewalService } from './renewal/renewal.service';
import { PolicyArchiveJob } from './archive-job';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { PiiMaskingInterceptor } from './pii-masking.interceptor';
import { PaymentConsumer } from './payment.consumer';
import { ProjectionEventHandler } from './projection-event-handler';
import { MigrationReconciliationService } from './migration-reconciliation.service';
import { ProjectionReconciliationService } from './projection-reconciliation.service';
import { SyncLatencyMonitor } from './sync-latency-monitor';
import { HealthController } from './health.controller';
import { AppDataSource } from './data-source';
import { UniqueCodeService } from './unique-code/unique-code.service';
import { UniqueCodeSyncService } from './unique-code/unique-code-sync.service';
import { UniqueCodeReportController } from './unique-code/unique-code-report.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      synchronize: process.env.DB_SYNC === 'true',
      migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
    }),
    TypeOrmModule.forFeature([Policy, PolicyChange, PolicyInquiry, PolicyRenewal, PolicyProjection, PolicyCoverage, PolicyParty, PolicyDocument, Endorsement, EndorsementChange, AuditRecord, TransitionAudit, OutboxEvent, ConsumedEvent, DeadLetterEvent]),
  ],
  controllers: [PolicyController, P3PolicyController, PolicyProjectionController, UniqueCodeReportController, HealthController],
  providers: [PolicyService, P3PolicyLifecycleService, RenewalService, ProjectionSyncService, PolicyProjectionService, AuditService, BrokerLicenseClient, DistributionAgreementClient, PolicyArchiveJob, PaymentConsumer, ProjectionEventHandler, MigrationReconciliationService, ProjectionReconciliationService, SyncLatencyMonitor, UniqueCodeService, UniqueCodeSyncService, JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard, {
    provide: APP_INTERCEPTOR,
    useClass: TracingInterceptor,
  }, {
    provide: APP_INTERCEPTOR,
    useClass: PiiMaskingInterceptor,
  }, {
    provide: APP_INTERCEPTOR,
    useClass: TenantIsolationInterceptor,
  }],
  exports: [PolicyService, RenewalService],
})
export class AppModule {}
