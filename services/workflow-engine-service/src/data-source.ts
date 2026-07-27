import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ProcessDefinition } from './entities/process-definition.entity';
import { ProcessInstance } from './entities/process-instance.entity';
import { ProcessToken } from './entities/process-token.entity';
import { ProcessVariable } from './entities/process-variable.entity';
import { ProcessHistory } from './entities/process-history.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
  schema: process.env.DB_SCHEMA || 'workflow',
  entities: [ProcessDefinition, ProcessInstance, ProcessToken, ProcessVariable, ProcessHistory],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
