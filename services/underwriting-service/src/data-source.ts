import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { OutboxEvent, DeadLetterEvent, ConsumedEvent } from '@insurance/shared';
import { UnderwritingRequest } from './entities/UnderwritingRequest';
import { UnderwritingAppetite } from './entities/UnderwritingAppetite';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  schema: process.env.DB_SCHEMA || 'public',
  entities: [UnderwritingRequest, UnderwritingAppetite, OutboxEvent, DeadLetterEvent, ConsumedEvent],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
  synchronize: false,
});
