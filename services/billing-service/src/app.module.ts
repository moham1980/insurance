import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { HealthController } from './health.controller';
import { PaymentGatewayService } from './payment-gateway/payment-gateway.service';
import { AutoDepositVerificationService } from './payment-gateway/auto-deposit-verification.service';
import { IdempotencyService } from './idempotency.service';
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
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';

import { TenantGuard } from './tenant.guard';
import { OutboxEvent } from '@insurance/shared';
import { Init1700000001400 } from './migrations/1700000001400-init';

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
  OutboxEvent,
];

@Module({
  imports: [
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
      migrations: [Init1700000001400],
      migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
      migrationsTableName: 'migrations',
    }),
    TypeOrmModule.forFeature(entities),
  ],
  controllers: [BillingController, HealthController],
  providers: [
    TenantGuard,
    BillingService,
    PaymentGatewayService,
    AutoDepositVerificationService,
    IdempotencyService,
    JwtAuthGuard,
    PermissionsGuard,
  ],
})
export class AppModule {}
