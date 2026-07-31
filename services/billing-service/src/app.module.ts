import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BrokerageController } from './brokerage.controller';
import { HealthController } from './health.controller';
import { PaymentGatewayService } from './payment-gateway/payment-gateway.service';
import { AutoDepositVerificationService } from './payment-gateway/auto-deposit-verification.service';
import { EcosystemPaymentAdapter } from './payment-gateway/ecosystem-payment.adapter';
import { ZarinpalPaymentAdapter } from './payment-gateway/zarinpal.adapter';
import { IdempotencyService } from './idempotency.service';
import { CommissionCalculationService } from './commission/commission-calculation.service';
import { CommissionPostingService } from './commission/commission-posting.service';
import { LedgerPostingService } from './ledger/ledger-posting.service';
import { PolicyPostingService } from './ledger/policy-posting.service';
import { PaymentPostingService } from './ledger/payment-posting.service';
import { EndorsementPostingService } from './ledger/endorsement-posting.service';
import { CancellationPostingService } from './ledger/cancellation-posting.service';
import { ClaimPostingService } from './ledger/claim-posting.service';
import { ClaimPaymentService } from './claims/claim-payment.service';
import { SettlementPaymentService } from './settlement/settlement-payment.service';
import { SettlementReconciliationService } from './settlement/settlement-reconciliation.service';
import { PremiumInvoiceService } from './invoicing/invoice.service';
import { PremiumInvoiceController } from './invoicing/invoice.controller';
import { CustomerPaymentService } from './payments/customer-payment.service';
import { PaymentWebhookController } from './payments/payment-webhook.controller';
import { RefundService } from './refunds/refund.service';
import { RefundCalculationService } from './refunds/refund-calculation.service';
import { EscrowService } from './escrow/escrow.service';
import { EscrowRulesService } from './escrow/escrow-rules.service';
import { ClawbackService } from './clawback/clawback.service';
import { PolicyVerificationService } from './policy-verification.service';
import { BillingSchedulerService } from './billing-scheduler.service';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentReportService } from './reports/payment-report.service';
import { CollectionsReportController } from './reports/collections-report.controller';
import { ReceivableCreationConsumer } from './receivables/receivable-creation.consumer';
import { Invoice } from './entities/Invoice';
import { JournalEntry } from './entities/JournalEntry';
import { Account } from './entities/Account';
import { FinancialPeriod } from './entities/FinancialPeriod';
import { CostCenter } from './entities/CostCenter';
import { ReconciliationResult } from './entities/ReconciliationResult';
import { PaymentTransaction } from './entities/PaymentTransaction';
import { IdempotencyKey } from './entities/IdempotencyKey';
import { AutoDepositConfig } from './entities/AutoDepositConfig';
import { BankTransaction } from './entities/BankTransaction';
import { BrokerageLedgerAccount } from './ledger/ledger-account.entity';
import { BrokerageJournalEntry } from './ledger/journal-entry.entity';
import { BrokerageJournalLine } from './ledger/journal-line.entity';
import { CommissionSplit } from './commission/commission-split.entity';
import { BrokeragePayable } from './payables/payable.entity';
import { BrokerageReceivable } from './receivables/receivable.entity';
import { BrokerageSettlementBatch } from './settlement/settlement-batch.entity';
import { SettlementBatchLine } from './settlement/settlement-batch-line.entity';
import { PremiumInvoice } from './invoicing/premium-invoice.entity';
import { PremiumInvoiceLine } from './invoicing/invoice-line.entity';
import { PremiumInstallmentPlan } from './invoicing/installment-plan.entity';
import { EscrowHolding } from './escrow/escrow-holding.entity';
import { EscrowRelease } from './escrow/escrow-release.entity';
import { RefundRequest } from './refunds/refund-request.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';

import { TenantGuard } from './tenant.guard';
import { OutboxEvent } from '@insurance/shared';

const entities = [
  Invoice,
  JournalEntry,
  Account,
  FinancialPeriod,
  CostCenter,
  ReconciliationResult,
  PaymentTransaction,
  IdempotencyKey,
  AutoDepositConfig,
  BankTransaction,
  BrokerageLedgerAccount,
  BrokerageJournalEntry,
  BrokerageJournalLine,
  CommissionSplit,
  BrokeragePayable,
  BrokerageReceivable,
  BrokerageSettlementBatch,
  SettlementBatchLine,
  PremiumInvoice,
  PremiumInvoiceLine,
  PremiumInstallmentPlan,
  EscrowHolding,
  EscrowRelease,
  RefundRequest,
  OutboxEvent,
];

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'billing',
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
      entities,
      migrations: [__dirname + '/migrations/*.js'],
      migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
      migrationsTableName: 'migrations',
    }),
    TypeOrmModule.forFeature(entities),
  ],
  controllers: [
    BillingController,
    BrokerageController,
    PremiumInvoiceController,
    PaymentWebhookController,
    CollectionsReportController,
    HealthController,
  ],
  providers: [
    TenantGuard,
    BillingService,
    PaymentGatewayService,
    EcosystemPaymentAdapter,
    ZarinpalPaymentAdapter,
    AutoDepositVerificationService,
    IdempotencyService,
    CommissionCalculationService,
    CommissionPostingService,
    LedgerPostingService,
    PolicyPostingService,
    PaymentPostingService,
    EndorsementPostingService,
    CancellationPostingService,
    ClaimPostingService,
    ClaimPaymentService,
    SettlementPaymentService,
    SettlementReconciliationService,
    PremiumInvoiceService,
    CustomerPaymentService,
    RefundService,
    RefundCalculationService,
    EscrowService,
    EscrowRulesService,
    ClawbackService,
    PolicyVerificationService,
    BillingSchedulerService,
    PaymentReportService,
    ReceivableCreationConsumer,
    JwtAuthGuard,
    PermissionsGuard,
  ],
})
export class AppModule {}
