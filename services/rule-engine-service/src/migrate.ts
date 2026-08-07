import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { Init1700000001100 } from './migrations/1700000001100-init';
import { AddSodApprovalFields1700000001101 } from './migrations/1700000001101-add-sod-approval-fields';
import { AddAuditLogAndEntityVersion1700000001102 } from './migrations/1700000001102-add-audit-log-and-entity-version';

async function migrate() {
  const connection = await createConnection({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
    schema: process.env.DB_SCHEMA || 'rule_engine',
    synchronize: false,
    logging: true,
  });

  const queryRunner = connection.createQueryRunner();
  const migrations = [
    new Init1700000001100(),
    new AddSodApprovalFields1700000001101(),
    new AddAuditLogAndEntityVersion1700000001102(),
  ];

  try {
    await queryRunner.connect();
    for (const migration of migrations) {
      console.log(`Running migration: ${migration.name}...`);
      await migration.up(queryRunner);
      console.log(`Migration ${migration.name} completed successfully`);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await queryRunner.release();
    await connection.close();
  }
}

migrate();
