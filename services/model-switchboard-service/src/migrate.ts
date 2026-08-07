import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { Init1700000001300 } from './migrations/1700000001300-init';
import { AddTenantIdToModelCards1700000001301 } from './migrations/1700000001301-add-tenant-id-to-model-cards';

async function migrate() {
  const connection = await createConnection({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
    schema: process.env.DB_SCHEMA || 'model_switchboard',
    synchronize: false,
    logging: true,
  });

  const queryRunner = connection.createQueryRunner();
  const migrations = [
    new Init1700000001300(),
    new AddTenantIdToModelCards1700000001301(),
  ];

  try {
    await queryRunner.connect();
    for (const migration of migrations) {
      console.log(`Running migration ${migration.name} up...`);
      await migration.up(queryRunner);
      console.log(`Migration ${migration.name} completed successfully`);
    }
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await queryRunner.release();
    await connection.close();
  }
}

migrate();
