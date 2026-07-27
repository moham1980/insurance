import { AppDataSource } from './data-source';
import { createLogger } from '@insurance/shared';

const logger = createLogger({
  serviceName: 'claims-readmodel-service',
  prettyPrint: process.env.NODE_ENV !== 'production',
});

async function main() {
  await AppDataSource.initialize();
  try {
    await AppDataSource.runMigrations({ transaction: 'all' });
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((e) => {
  const err = e instanceof Error ? e : new Error(String(e));
  logger.error('migrate.failed', err);
  process.exitCode = 1;
});
