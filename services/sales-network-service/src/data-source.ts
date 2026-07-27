import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ConsumedEvent } from '@insurance/shared';
import { SalesPartner } from './entities/SalesPartner';
import { CommissionContract } from './entities/CommissionContract';
import { CommissionLedgerEntry } from './entities/CommissionLedgerEntry';
import { SalesKpiDaily } from './entities/SalesKpiDaily';
import { SalesPolicyAttribution } from './entities/SalesPolicyAttribution';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  schema: process.env.DB_SCHEMA || 'sales',
  entities: [SalesPartner, CommissionContract, CommissionLedgerEntry, SalesKpiDaily, SalesPolicyAttribution, ConsumedEvent],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
