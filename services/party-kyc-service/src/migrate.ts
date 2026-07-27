import { AppDataSource } from './data-source';
import * as fs from 'fs';

async function main() {
  await AppDataSource.initialize();
  try {
    const executed = await AppDataSource.runMigrations({ transaction: 'all' });
    console.log('Migrations executed:', executed.length);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((e) => {
  const message = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
  fs.writeFileSync('migrate-error.log', message, 'utf8');
  console.error(e);
  process.exit(1);
});
