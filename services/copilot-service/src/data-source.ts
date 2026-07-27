import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ClaimEntity } from './entities/ClaimEntity';
import { DocumentEntity } from './entities/DocumentEntity';
import { CopilotAudit } from './entities/CopilotAudit';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  schema: process.env.DB_SCHEMA || 'public',
  entities: [ClaimEntity, DocumentEntity, CopilotAudit],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
