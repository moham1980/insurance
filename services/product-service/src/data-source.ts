import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Product } from './entities/Product';
import { ProductVersion } from './entities/ProductVersion';
import { Coverage } from './entities/Coverage';
import { Deductible } from './entities/Deductible';
import { PricingRule } from './entities/PricingRule';
import { CoverageDefinition } from './entities/CoverageDefinition';
import { RateTableVersion } from './entities/RateTableVersion';
import { ProductVisibility } from './entities/ProductVisibility';
import { BrokerProductOffering } from './entities/BrokerProductOffering';
import { BundleRule } from './entities/BundleRule';
import { RecommendationRule } from './entities/RecommendationRule';
import { OutboxEvent } from '@insurance/shared';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  schema: process.env.DB_SCHEMA || 'public',
  entities: [Product, ProductVersion, Coverage, Deductible, PricingRule, CoverageDefinition, RateTableVersion, ProductVisibility, BrokerProductOffering, BundleRule, RecommendationRule, OutboxEvent],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
