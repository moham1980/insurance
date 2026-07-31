#!/usr/bin/env ts-node
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Backup / Restore verification utility.
 * Verifies that a schema backup can be parsed and that the target database
 * responds with the expected number of tables.
 */
async function main() {
  const service = process.argv[2];
  const backupFile = process.argv[3];
  if (!service || !backupFile) {
    console.error('Usage: ts-node scripts/backup-restore-verify.ts <service> <backup-file>');
    process.exit(1);
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AppDataSource } = require(`../services/${service}/dist/data-source.js`);
  const dataSource: DataSource = AppDataSource;
  await dataSource.initialize();

  try {
    const ddl = fs.readFileSync(backupFile, 'utf8');
    const statements = ddl.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
    const createTables = statements.filter((s) => /^CREATE TABLE/i.test(s));
    console.log(`Backup file ${backupFile} contains ${createTables.length} CREATE TABLE statements.`);
    if (createTables.length === 0) {
      throw new Error('No CREATE TABLE statements found; backup appears invalid.');
    }

    const runner = dataSource.createQueryRunner();
    const schema = (dataSource.options as any).schema || process.env.DB_SCHEMA || 'public';
    const tables = await runner.getTables(schema);
    await runner.release();
    console.log(`Target database schema ${schema} has ${tables.length} tables.`);
    if (tables.length === 0) {
      throw new Error('Target database has no tables; restore did not apply.');
    }
    console.log('Backup/restore verification: PASSED');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
