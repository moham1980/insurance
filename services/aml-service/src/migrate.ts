import { AppDataSource } from './data-source';

async function main() {
  await AppDataSource.initialize();
  try {
    await AppDataSource.runMigrations({ transaction: 'all' });
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
