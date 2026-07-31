import { MigrationInterface, QueryRunner } from 'typeorm';

export class P3MigrationQuarantine1830000000030 implements MigrationInterface {
  name = 'P3MigrationQuarantine1830000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS migration_quarantine (
        id SERIAL PRIMARY KEY,
        migration_name TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        raw_data JSONB,
        status TEXT NOT NULL DEFAULT 'quarantined',
        resolved_at TIMESTAMPTZ,
        resolved_by TEXT,
        resolution_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_migration_quarantine_status
      ON migration_quarantine (status, created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_migration_quarantine_entity
      ON migration_quarantine (entity_type, entity_id);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS migration_reconciliation_log (
        id SERIAL PRIMARY KEY,
        migration_name TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        before_count INTEGER NOT NULL DEFAULT 0,
        after_count INTEGER NOT NULL DEFAULT 0,
        before_premium_total NUMERIC NOT NULL DEFAULT 0,
        after_premium_total NUMERIC NOT NULL DEFAULT 0,
        missing_org_count INTEGER NOT NULL DEFAULT 0,
        quarantined_count INTEGER NOT NULL DEFAULT 0,
        verified BOOLEAN NOT NULL DEFAULT false,
        verified_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS migration_reconciliation_log;`);
    await queryRunner.query(`DROP TABLE IF EXISTS migration_quarantine;`);
  }
}
