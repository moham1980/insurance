import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ConsumedEvent, DeadLetterEvent, OutboxEvent } from '@insurance/shared';
import { SagaInstance } from './entities/SagaInstance';
import { SagaStep } from './entities/SagaStep';
import { WorkItem } from './entities/WorkItem';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  schema: process.env.DB_SCHEMA || 'public',
  entities: [SagaInstance, SagaStep, WorkItem, ConsumedEvent, DeadLetterEvent, OutboxEvent],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
