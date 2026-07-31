import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ConsumedEvent } from '@insurance/shared';
import { SalesPartner } from './entities/SalesPartner';
import { CommissionContract } from './entities/CommissionContract';
import { CommissionLedgerEntry } from './entities/CommissionLedgerEntry';
import { SalesKpiDaily } from './entities/SalesKpiDaily';
import { SalesPolicyAttribution } from './entities/SalesPolicyAttribution';
import { DistributionAgreement } from './entities/DistributionAgreement';
import { CommissionTier } from './entities/CommissionTier';
import { ReferralRule } from './entities/ReferralRule';
import { ClawbackRule } from './entities/ClawbackRule';
import { BonusTier } from './entities/BonusTier';
import { MarkupRule } from './entities/MarkupRule';
import { BindingAuthorityProfile } from './entities/BindingAuthorityProfile';
import { AgreementApproval } from './entities/AgreementApproval';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  schema: process.env.DB_SCHEMA || 'sales',
  entities: [SalesPartner, CommissionContract, CommissionLedgerEntry, SalesKpiDaily, SalesPolicyAttribution, DistributionAgreement, CommissionTier, ReferralRule, ClawbackRule, BonusTier, MarkupRule, BindingAuthorityProfile, AgreementApproval, ConsumedEvent],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
