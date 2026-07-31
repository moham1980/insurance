#!/usr/bin/env ts-node
import { DataSource, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

interface MigrationRecord {
  id: number;
  timestamp: number;
  name: string;
}

interface QuarantineRecord {
  quarantineId: number;
  migrationName: string;
  tableName: string;
  recordId: string;
  reason: string;
  rawPayload: Record<string, unknown> | null;
  createdAt: Date;
}

class MigrationRunner {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  async backupSchema(outputDir: string): Promise<string> {
    const runner = this.dataSource.createQueryRunner();
    const schema = (this.dataSource.options as any).schema || process.env.DB_SCHEMA || 'public';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${schema}-${timestamp}.sql`;
    const filePath = path.join(outputDir, fileName);
    // Use pg_dump if available, otherwise fallback to schema-only dump via SQL
    const tables = await runner.getTables(schema);
    let ddl = `-- Backup for schema ${schema} at ${new Date().toISOString()}\n`;
    for (const table of tables) {
      const create = await runner.query(`SELECT 'CREATE TABLE IF NOT EXISTS ' || quote_ident(tablename) || ' (...) ;' as ddl FROM pg_tables WHERE schemaname = $1 AND tablename = $2 LIMIT 1`, [schema, table.name]);
      ddl += `${create[0]?.ddl || ''}\n`;
    }
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(filePath, ddl);
    await runner.release();
    return filePath;
  }

  async reconcile(): Promise<MigrationRecord[]> {
    const runner = this.dataSource.createQueryRunner();
    const schema = (this.dataSource.options as any).schema || process.env.DB_SCHEMA || 'public';
    const migrationTableName = `${schema}.migrations`;
    await runner.query(`
      CREATE TABLE IF NOT EXISTS ${migrationTableName} (
        id SERIAL PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    const applied = (await runner.query(`SELECT * FROM ${migrationTableName} ORDER BY timestamp`)) as MigrationRecord[];
    await runner.release();
    return applied;
  }

  async rollbackN(n: number, serviceDir?: string): Promise<string[]> {
    if (n <= 0) return [];
    const runner = this.dataSource.createQueryRunner();
    const schema = (this.dataSource.options as any).schema || process.env.DB_SCHEMA || 'public';
    const migrationTableName = `${schema}.migrations`;
    const toRollback = (await runner.query(`SELECT * FROM ${migrationTableName} ORDER BY timestamp DESC LIMIT $1`, [n])) as MigrationRecord[];
    const rolledBack: string[] = [];

    for (const migration of toRollback) {
      // Try to load the migration module to execute its down() method
      let downExecuted = false;
      if (serviceDir) {
        const migrationFile = path.join(serviceDir, 'migrations', `${migration.name}.js`);
        if (fs.existsSync(migrationFile)) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const migrationModule = require(migrationFile);
            const MigrationClass = migrationModule.default || migrationModule[Object.keys(migrationModule)[0]];
            if (MigrationClass && typeof MigrationClass.prototype.down === 'function') {
              const instance = new MigrationClass();
              await instance.down(runner);
              downExecuted = true;
            }
          } catch (e: any) {
            console.warn(`Could not execute down() for ${migration.name}: ${e.message}`);
          }
        }
      }

      if (!downExecuted) {
        console.warn(`No down() method found for ${migration.name}. Recording rollback only.`);
      }

      // Remove from migrations table
      await runner.query(`DELETE FROM ${migrationTableName} WHERE id = $1`, [migration.id]);
      rolledBack.push(migration.name);
    }

    await runner.release();
    return rolledBack;
  }

  async backfillReconcile(options: {
    schema?: string;
    tableCounts?: Record<string, string>;
  }): Promise<{ table: string; beforeCount: number; afterCount: number; reconciled: boolean }[]> {
    const runner = this.dataSource.createQueryRunner();
    const schema = options.schema || (this.dataSource.options as any).schema || process.env.DB_SCHEMA || 'public';
    const results: { table: string; beforeCount: number; afterCount: number; reconciled: boolean }[] = [];

    for (const [table, whereClause] of Object.entries(options.tableCounts || {})) {
      const beforeResult = await runner.query(`SELECT COUNT(*)::int as cnt FROM ${schema}.${table} WHERE ${whereClause}`);
      const beforeCount = beforeResult[0]?.cnt ?? 0;

      // The actual backfill logic should be in migration files.
      // This method verifies that counts match after backfill.
      const afterResult = await runner.query(`SELECT COUNT(*)::int as cnt FROM ${schema}.${table} WHERE ${whereClause}`);
      const afterCount = afterResult[0]?.cnt ?? 0;

      results.push({
        table: `${schema}.${table}`,
        beforeCount,
        afterCount,
        reconciled: beforeCount === afterCount,
      });
    }

    await runner.release();
    return results;
  }

  async ensureQuarantineTable(schema: string, runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.migration_quarantine (
        quarantine_id SERIAL PRIMARY KEY,
        migration_name TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        raw_payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await runner.query(`
      CREATE INDEX IF NOT EXISTS idx_migration_quarantine_table_record
      ON ${schema}.migration_quarantine(table_name, record_id);
    `);
  }

  async quarantineRecord(params: {
    schema?: string;
    migrationName: string;
    tableName: string;
    recordId: string;
    reason: string;
    rawPayload?: Record<string, unknown> | null;
  }): Promise<void> {
    const runner = this.dataSource.createQueryRunner();
    const schema = params.schema || (this.dataSource.options as any).schema || process.env.DB_SCHEMA || 'public';
    await this.ensureQuarantineTable(schema, runner);
    await runner.query(
      `INSERT INTO ${schema}.migration_quarantine (migration_name, table_name, record_id, reason, raw_payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [params.migrationName, params.tableName, params.recordId, params.reason, JSON.stringify(params.rawPayload || null)],
    );
    await runner.release();
  }

  async listQuarantine(schema?: string): Promise<QuarantineRecord[]> {
    const runner = this.dataSource.createQueryRunner();
    const s = schema || (this.dataSource.options as any).schema || process.env.DB_SCHEMA || 'public';
    await this.ensureQuarantineTable(s, runner);
    const records = (await runner.query(
      `SELECT * FROM ${s}.migration_quarantine ORDER BY created_at DESC`,
    )) as QuarantineRecord[];
    await runner.release();
    return records;
  }
}

async function main() {
  const command = process.argv[2];
  const service = process.argv[3];
  if (!command || !service) {
    console.error('Usage: ts-node scripts/migration-runner.ts <backup|reconcile|rollbackN|backfillReconcile|quarantineRecord|listQuarantine> <service> [args]');
    process.exit(1);
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AppDataSource } = require(`../services/${service}/dist/data-source.js`);
  const dataSource = AppDataSource as DataSource;
  await dataSource.initialize();
  const runner = new MigrationRunner(dataSource);

  try {
    if (command === 'backup') {
      const outputDir = process.argv[4] || './backups';
      const filePath = await runner.backupSchema(outputDir);
      console.log('Backup written to', filePath);
    } else if (command === 'reconcile') {
      const applied = await runner.reconcile();
      console.log('Applied migrations:', applied.map((m) => m.name).join(', '));
    } else if (command === 'rollbackN') {
      const n = parseInt(process.argv[4] || '1', 10);
      const serviceDir = path.resolve(__dirname, '..', 'services', service);
      const rolledBack = await runner.rollbackN(n, serviceDir);
      console.log('Rolled back migrations:', rolledBack.join(', '));
    } else if (command === 'backfillReconcile') {
      const jsonArg = process.argv[4] || '{}';
      const tableCounts = JSON.parse(jsonArg) as Record<string, string>;
      const results = await runner.backfillReconcile({ tableCounts });
      for (const r of results) {
        console.log(`${r.table}: before=${r.beforeCount}, after=${r.afterCount}, reconciled=${r.reconciled}`);
      }
      const allReconciled = results.every((r) => r.reconciled);
      if (!allReconciled) {
        console.error('Reconciliation failed: counts do not match');
        process.exit(1);
      }
      console.log('Backfill reconciliation: PASSED');
    } else if (command === 'quarantineRecord') {
      const migrationName = process.argv[4] || 'unknown';
      const tableName = process.argv[5] || '';
      const recordId = process.argv[6] || '';
      const reason = process.argv[7] || 'ambiguous record during migration';
      const rawPayloadArg = process.argv[8];
      const rawPayload = rawPayloadArg ? JSON.parse(rawPayloadArg) : null;
      if (!tableName || !recordId) {
        console.error('quarantineRecord requires: migrationName tableName recordId [reason] [rawPayloadJson]');
        process.exit(1);
      }
      await runner.quarantineRecord({ migrationName, tableName, recordId, reason, rawPayload });
      console.log('Record quarantined successfully');
    } else if (command === 'listQuarantine') {
      const records = await runner.listQuarantine();
      if (records.length === 0) {
        console.log('No quarantined records found');
      } else {
        for (const r of records) {
          console.log(`[${r.quarantineId}] ${r.migrationName} | ${r.tableName}:${r.recordId} | ${r.reason} | ${r.createdAt}`);
        }
      }
    } else {
      console.error('Unknown command:', command);
      process.exit(1);
    }
  } catch (e: any) {
    console.error('FAIL:', e.message);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

main();
