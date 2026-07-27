import { AppDataSource } from './data-source';

async function main() {
  await AppDataSource.initialize();
  const schema = (AppDataSource.options as any).schema || 'public';
  try {
    await AppDataSource.query(`SET search_path TO "${schema}", public;`);
    await AppDataSource.runMigrations({ transaction: 'all' });
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
