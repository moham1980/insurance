import 'reflect-metadata';
import { AppDataSource } from './data-source';

async function main() {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations({ transaction: 'all' });
  console.log('Migrations finished');
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
