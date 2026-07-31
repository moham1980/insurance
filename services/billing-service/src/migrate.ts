import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Init1700000001400 } from './migrations/1700000001400-init';

async function migrate() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
    schema: process.env.DB_SCHEMA || 'billing',
    synchronize: false,
    logging: true,
    migrations: [__dirname + '/migrations/*.js'],
    migrationsRun: false,
    migrationsTableName: 'migrations',
  });

  try {
    await dataSource.initialize();
    console.log('Running migrations...');
    const results = await dataSource.runMigrations({ transaction: 'all' });
    for (const migration of results) {
      console.log(`Executed migration: ${migration.name}`);
    }
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

migrate();
