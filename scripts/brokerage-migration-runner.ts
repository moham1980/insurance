#!/usr/bin/env bun
/**
 * P0 zero-downtime migration runner with dry-run, reconciliation and rollback support.
 * Usage:
 *   bun run scripts/brokerage-migration-runner.ts --service auth-service --dry-run
 *   bun run scripts/brokerage-migration-runner.ts --service auth-service --reconcile
 *   bun run scripts/brokerage-migration-runner.ts --service auth-service --rollback N
 */
import { AppDataSource as AuthDataSource } from '../services/auth-service/src/data-source';
import { AppDataSource as PartyDataSource } from '../services/party-kyc-service/src/data-source';
import { AppDataSource as SalesDataSource } from '../services/sales-network-service/src/data-source';

const services: Record<string, any> = {
  'auth-service': AuthDataSource,
  'party-kyc-service': PartyDataSource,
  'sales-network-service': SalesDataSource,
};

interface Args {
  service: string;
  dryRun: boolean;
  reconcile: boolean;
  rollback?: number;
  backup: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const out: Args = { service: '', dryRun: false, reconcile: false, backup: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--service' && args[i + 1]) out.service = args[++i];
    if (args[i] === '--dry-run') out.dryRun = true;
    if (args[i] === '--reconcile') out.reconcile = true;
    if (args[i] === '--rollback' && args[i + 1]) out.rollback = parseInt(args[++i], 10);
    if (args[i] === '--backup') out.backup = true;
  }
  return out;
}

async function run() {
  const args = parseArgs();
  if (!args.service || !services[args.service]) {
    console.error(`Usage: --service <${Object.keys(services).join('|')}> [--dry-run] [--reconcile] [--rollback N] [--backup]`);
    process.exit(1);
  }

  const ds = services[args.service];
  await ds.initialize();
  const queryRunner = ds.createQueryRunner();

  try {
    if (args.backup) {
      const schema = ds.options.schema || 'public';
      const backupName = `pre_p0_backup_${schema}_${Date.now()}`;
      await queryRunner.query(`CREATE DATABASE "${backupName}" TEMPLATE "${ds.options.database}"`);
      console.log(`Backup database created: ${backupName}`);
    }

    if (args.dryRun) {
      const migrations = await ds.showMigrations();
      console.log('Pending migrations (dry-run):', migrations ? 'yes' : 'none');
    } else if (args.reconcile) {
      const pending = await ds.showMigrations();
      if (!pending) {
        console.log('Reconciliation: no pending migrations.');
      } else {
        console.log('Reconciliation: running pending migrations...');
        await ds.runMigrations({ transaction: 'all' });
      }
    } else if (args.rollback && args.rollback > 0) {
      for (let i = 0; i < args.rollback; i++) {
        await ds.undoLastMigration({ transaction: 'all' });
      }
      console.log(`Rolled back ${args.rollback} migration(s)`);
    } else {
      await ds.runMigrations({ transaction: 'all' });
      console.log('Migrations applied successfully.');
    }
  } finally {
    await queryRunner.release();
    await ds.destroy();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
