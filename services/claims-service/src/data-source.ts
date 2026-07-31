import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  Claim,
  ClaimParty,
  ClaimDocument,
  ClaimAdvocacyCase,
  AdvocacyTask,
  AdvocacyCommunication,
  AdjusterReferral,
  ClaimProjection,
  RecoveryCase,
} from './entities';
import { OutboxEvent, ConsumedEvent, DeadLetterEvent } from '@insurance/shared';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'postgres',
  schema: process.env.DB_SCHEMA || 'claims',
  entities: [
    Claim,
    ClaimParty,
    ClaimDocument,
    ClaimAdvocacyCase,
    AdvocacyTask,
    AdvocacyCommunication,
    AdjusterReferral,
    ClaimProjection,
    RecoveryCase,
    OutboxEvent,
    ConsumedEvent,
    DeadLetterEvent,
  ],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
