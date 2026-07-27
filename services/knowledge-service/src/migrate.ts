import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { Init1700000001200 } from './migrations/1700000001200-init';

async function migrate() {
  const connection = await createConnection({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
    schema: process.env.DB_SCHEMA || 'knowledge',
    synchronize: false,
    logging: true,
  });

  const queryRunner = connection.createQueryRunner();
  const migration = new Init1700000001200();

  try {
    await queryRunner.connect();
    console.log('Running migration up...');
    await migration.up(queryRunner);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await queryRunner.release();
    await connection.close();
  }
}

migrate();
