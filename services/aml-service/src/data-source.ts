import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AmlConsent } from './entities/AmlConsent';
import { AmlRule } from './entities/AmlRule';
import { AmlAlert } from './entities/AmlAlert';
import { AmlAlertDecision } from './entities/AmlAlertDecision';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  schema: process.env.DB_SCHEMA || 'public',
  entities: [AmlConsent, AmlRule, AmlAlert, AmlAlertDecision],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
