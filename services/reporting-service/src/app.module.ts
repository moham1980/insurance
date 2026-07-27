import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsumedEvent, DeadLetterEvent } from '@insurance/shared';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { KpiConsumer } from './kpi.consumer';
import { RmPolicyLifecycle } from './entities/RmPolicyLifecycle';
import { RmClaimPayment } from './entities/RmClaimPayment';
import { RmFraudSignal } from './entities/RmFraudSignal';
import { RmRiCeded } from './entities/RmRiCeded';
import { RmRiBorderaux } from './entities/RmRiBorderaux';
import { RmRiRecovery } from './entities/RmRiRecovery';
import { RmClaimDocumentsAttached } from './entities/RmClaimDocumentsAttached';
import { RmFraudCaseEscalation } from './entities/RmFraudCaseEscalation';
import { RmComplaintSlaBreach } from './entities/RmComplaintSlaBreach';
import { KpiSnapshot } from './entities/KpiSnapshot';
import { KpiIngestionAudit } from './entities/KpiIngestionAudit';
import { KpiGovernancePolicy } from './entities/KpiGovernancePolicy';
import { RmPolicy } from './entities/RmPolicy';
import { RmPayment } from './entities/RmPayment';
import { RmSalesNetwork } from './entities/RmSalesNetwork';
import { RmAml } from './entities/RmAml';
import { RmUnderwriting } from './entities/RmUnderwriting';
import { ExternalSystemConnection } from './entities/ExternalSystemConnection';
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
      schema: process.env.DB_SCHEMA || 'reporting',
      entities: [
        RmPolicyLifecycle,
        RmClaimPayment,
        RmFraudSignal,
        RmRiCeded,
        RmRiBorderaux,
        RmRiRecovery,
        RmClaimDocumentsAttached,
        RmFraudCaseEscalation,
        RmComplaintSlaBreach,
        KpiSnapshot,
        KpiIngestionAudit,
        KpiGovernancePolicy,
        RmPolicy,
        RmPayment,
        RmSalesNetwork,
        RmAml,
        RmUnderwriting,
        ExternalSystemConnection,
        ConsumedEvent,
        DeadLetterEvent,
      ],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([
      RmPolicyLifecycle,
      RmClaimPayment,
      RmFraudSignal,
      RmRiCeded,
      RmRiBorderaux,
      RmRiRecovery,
      RmClaimDocumentsAttached,
      RmFraudCaseEscalation,
      RmComplaintSlaBreach,
      KpiSnapshot,
      KpiIngestionAudit,
      KpiGovernancePolicy,
      RmPolicy,
      RmPayment,
      RmSalesNetwork,
      RmAml,
      RmUnderwriting,
      ExternalSystemConnection,
      ConsumedEvent,
      DeadLetterEvent,
    ]),
  ],
  controllers: [ReportingController, HealthController],
  providers: [TenantGuard, AbacGuard, ReportingService, KpiConsumer, JwtAuthGuard, PermissionsGuard],
})
export class AppModule {}
