import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ConsumedEvent, DeadLetterEvent } from '@insurance/shared';
import { RmClaimCase } from './entities/RmClaimCase';
import { RmFraudCase } from './entities/RmFraudCase';
import { RmComplaintOps } from './entities/RmComplaintOps';

const ENTITIES = [RmClaimCase, RmFraudCase, RmComplaintOps, ConsumedEvent, DeadLetterEvent];

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  schema: process.env.DB_SCHEMA || 'claims_rm',
  entities: ENTITIES,
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
