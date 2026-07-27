import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { SanhabEvent } from './entities/SanhabEvent';
import { RegulatoryFailureLog } from './entities/RegulatoryFailureLog';
import { SanhabSmsInquiry } from './entities/SanhabSmsInquiry';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  schema: process.env.DB_SCHEMA || 'regulatory',
  entities: [SanhabEvent, RegulatoryFailureLog, SanhabSmsInquiry],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
