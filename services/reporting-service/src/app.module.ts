import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsumedEvent, DeadLetterEvent, OutboxEvent } from '@insurance/shared';
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
import { BrokerTransactionReport } from './entities/BrokerTransactionReport';
import { BrokerReportController } from './broker-report/broker-report.controller';
import { BrokerReportGenerator } from './broker-report/broker-report-generator';
import { TCoRReport } from './entities/TCoRReport';
import { TCoRReportController } from './tcor-report/tcor-report.controller';
import { TCoRReportCalculator } from './tcor-report/tcor-report.calculator';
import { BiAggregateService } from './bi-aggregate/bi-aggregate.service';
import { BiAggregateController } from './bi-aggregate/bi-aggregate.controller';
import { DataQualityIssue } from './entities/DataQualityIssue';
import { DataQualityService } from './data-quality/data-quality.service';
import { DataQualityController } from './data-quality/data-quality.controller';
import { AuditReport } from './entities/AuditReport';
import { AuditReportService } from './audit-report/audit-report.service';
import { AuditReportController } from './audit-report/audit-report.controller';
import { SettlementDashboardService } from './settlement/settlement-dashboard.service';
import { SettlementDashboardController } from './settlement/settlement-dashboard.controller';
import { ReportRetentionService } from './retention/report-retention.service';
import { ReportRetentionController } from './retention/report-retention.controller';
import { PolicyLedgerReconciliation } from './reconciliation/policy-ledger-reconciliation';
import { PaymentLedgerReconciliation } from './reconciliation/payment-ledger-reconciliation';
import { ReconciliationController } from './reconciliation/reconciliation.controller';
import { P6EventProducer } from './events/p6-event-producer';
import { RegulatoryReport } from './entities/RegulatoryReport';
import { RegulatoryReportService } from './regulatory-report/regulatory-report.service';
import { RegulatoryReportController } from './regulatory-report/regulatory-report.controller';
import { AmlFraudRegulatoryService } from './aml-fraud/aml-fraud-regulatory.service';
import { AmlFraudRegulatoryController } from './aml-fraud/aml-fraud-regulatory.controller';
import { HealthController } from './health.controller';

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
        BrokerTransactionReport,
        TCoRReport,
        DataQualityIssue,
        AuditReport,
        RegulatoryReport,
        ConsumedEvent,
        DeadLetterEvent,
        OutboxEvent,
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
      BrokerTransactionReport,
      TCoRReport,
      DataQualityIssue,
      AuditReport,
      RegulatoryReport,
      ConsumedEvent,
      DeadLetterEvent,
      OutboxEvent,
    ]),
  ],
  controllers: [ReportingController, BrokerReportController, TCoRReportController, BiAggregateController, DataQualityController, AuditReportController, SettlementDashboardController, ReportRetentionController, ReconciliationController, RegulatoryReportController, AmlFraudRegulatoryController, HealthController],
  providers: [TenantGuard, ReportingService, BrokerReportGenerator, TCoRReportCalculator, BiAggregateService, DataQualityService, AuditReportService, SettlementDashboardService, ReportRetentionService, PolicyLedgerReconciliation, PaymentLedgerReconciliation, P6EventProducer, RegulatoryReportService, AmlFraudRegulatoryService, KpiConsumer, JwtAuthGuard, PermissionsGuard, AbacGuard],
})
export class AppModule {}
