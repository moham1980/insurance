import { AppDataSource } from './data-source';

async function main() {
  try {
    await AppDataSource.initialize();
    console.log('Running migrations...');
    await AppDataSource.runMigrations();
    console.log('Migrations completed successfully');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
