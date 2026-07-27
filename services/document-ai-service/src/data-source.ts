import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ConsumedEvent, OutboxEvent } from '@insurance/shared';
import { DocumentEntity } from './entities/DocumentEntity';
import { DocumentAiAudit } from './entities/DocumentAiAudit';
import { DocumentAiJob } from './entities/DocumentAiJob';
import { DocumentAiUsageDaily } from './entities/DocumentAiUsageDaily';
import { DocumentAiEvalCase } from './entities/DocumentAiEvalCase';
import { DocumentAiEvalRun } from './entities/DocumentAiEvalRun';
import { DocumentAiEvalResult } from './entities/DocumentAiEvalResult';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  schema: process.env.DB_SCHEMA || 'document_ai',
  entities: [
    DocumentEntity,
    DocumentAiAudit,
    DocumentAiJob,
    DocumentAiUsageDaily,
    DocumentAiEvalCase,
    DocumentAiEvalRun,
    DocumentAiEvalResult,
    ConsumedEvent,
    OutboxEvent,
  ],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
