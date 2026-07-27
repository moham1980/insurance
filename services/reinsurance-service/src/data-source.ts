import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ConsumedEvent, DeadLetterEvent, OutboxEvent } from '@insurance/shared';
import { ReTreaty } from './entities/ReTreaty';
import { ReCession } from './entities/ReCession';
import { ReStatement } from './entities/ReStatement';
import { ReReconciliation } from './entities/ReReconciliation';
import { ReClaimRecovery } from './entities/ReClaimRecovery';
import { ReTicket } from './entities/ReTicket';
import { ReTicketMessage } from './entities/ReTicketMessage';
import { ReTicketAttachment } from './entities/ReTicketAttachment';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  schema: process.env.DB_SCHEMA || 'public',
  entities: [
    ReTreaty,
    ReCession,
    ReStatement,
    ReReconciliation,
    ReClaimRecovery,
    ReTicket,
    ReTicketMessage,
    ReTicketAttachment,
    OutboxEvent,
    ConsumedEvent,
    DeadLetterEvent,
  ],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
