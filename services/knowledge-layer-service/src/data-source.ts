import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Document } from './entities/document.entity';
import { DocumentChunk } from './entities/document-chunk.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  schema: process.env.DB_SCHEMA || 'knowledge',
  entities: [Document, DocumentChunk],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
