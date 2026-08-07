import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { FeatureFlag } from './entities/FeatureFlag';
import { AiToggle } from './entities/AiToggle';
import { AuditLog } from './entities/AuditLog'; // P1 #10
import { EntityVersion } from './entities/EntityVersion'; // P1 #10

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'postgres',
  schema: process.env.DB_SCHEMA || 'feature_flags',
  entities: [FeatureFlag, AiToggle, AuditLog, EntityVersion],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
