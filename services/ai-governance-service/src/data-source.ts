import { DataSource } from 'typeorm';
import { createDataSource } from '@insurance/shared';

export const AppDataSource = createDataSource({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'insurance_platform',
  entities: [__dirname + '/entities/*.{js,ts}'],
  synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
  logging: process.env.NODE_ENV !== 'production',
});
