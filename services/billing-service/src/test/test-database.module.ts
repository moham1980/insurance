import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../entities/Invoice';
import { JournalEntry } from '../entities/JournalEntry';
import { Account } from '../entities/Account';
import { FinancialPeriod } from '../entities/FinancialPeriod';
import { CostCenter } from '../entities/CostCenter';
import { ReconciliationResult } from '../entities/ReconciliationResult';
import { PaymentTransaction } from '../entities/PaymentTransaction';
import { IdempotencyKey } from '../entities/IdempotencyKey';
import { AutoDepositConfig } from '../entities/AutoDepositConfig';
import { BankTransaction } from '../entities/BankTransaction';

const testEntities = [
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
];

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      entities: testEntities,
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature(testEntities),
  ],
  exports: [TypeOrmModule],
})
export class TestDatabaseModule {}
