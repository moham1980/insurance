import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Policy } from './entities/Policy';
import { PolicyChange } from './entities/PolicyChange';
import { PolicyInquiry } from './entities/PolicyInquiry';
import { PolicyRenewal } from './entities/PolicyRenewal';
import { AuditRecord } from './entities/AuditRecord';
import { TransitionAudit } from './entities/TransitionAudit';
import { PolicyProjection } from './entities/PolicyProjection';
import { PolicyCoverage } from './entities/PolicyCoverage';
import { PolicyParty } from './entities/PolicyParty';
import { PolicyDocument } from './entities/PolicyDocument';
import { Endorsement } from './entities/Endorsement';
import { EndorsementChange } from './entities/EndorsementChange';
import { OutboxEvent, ConsumedEvent, DeadLetterEvent } from '@insurance/shared';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  schema: process.env.DB_SCHEMA || 'public',
  entities: [Policy, PolicyChange, PolicyInquiry, PolicyRenewal, PolicyProjection, PolicyCoverage, PolicyParty, PolicyDocument, Endorsement, EndorsementChange, AuditRecord, TransitionAudit, OutboxEvent, ConsumedEvent, DeadLetterEvent],
  migrations: [__dirname + '/migrations/*.js'],
  migrationsRun: true,
});
