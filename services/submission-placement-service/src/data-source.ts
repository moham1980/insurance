import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Submission } from './entities/Submission';
import { CoverageRequest } from './entities/CoverageRequest';
import { DocumentRef } from './entities/DocumentRef';
import { QuoteRequest } from './entities/QuoteRequest';
import { QuoteResponse } from './entities/QuoteResponse';
import { QuoteError } from './entities/QuoteError';
import { Placement } from './entities/Placement';
import { Subjectivity } from './entities/Subjectivity';
import { QuoteDocument } from './entities/QuoteDocument';
import { ConnectorConfig } from './entities/ConnectorConfig';
import { OutboxEvent, AuditRecord, IdempotencyRecord } from '@insurance/shared';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  schema: process.env.DB_SCHEMA || 'public',
  entities: [Submission, CoverageRequest, DocumentRef, QuoteRequest, QuoteResponse, QuoteError, Placement, Subjectivity, QuoteDocument, ConnectorConfig, OutboxEvent, AuditRecord, IdempotencyRecord],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
