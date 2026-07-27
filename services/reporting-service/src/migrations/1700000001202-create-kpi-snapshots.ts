import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKpiSnapshots1700000001202 implements MigrationInterface {
  name = 'CreateKpiSnapshots1700000001202';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpi_snapshots (
        snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kpi_key TEXT NOT NULL,
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        value NUMERIC NOT NULL,
        unit TEXT,
        source_system TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_kpi_snapshots_key_period UNIQUE (kpi_key, period_start, period_end)
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_key_created_at ON kpi_snapshots(kpi_key, created_at);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpi_ingestion_audit (
        audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        idempotency_key TEXT NOT NULL,
        correlation_id TEXT,
        tenant_id TEXT,
        actor_user_id TEXT,
        kpi_key TEXT NOT NULL,
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        value NUMERIC NOT NULL,
        unit TEXT,
        source_system TEXT,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_kpi_ingestion_audit_idempotency UNIQUE (idempotency_key)
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kpi_ingestion_audit_key_created_at ON kpi_ingestion_audit(kpi_key, created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS kpi_ingestion_audit;`);
    await queryRunner.query(`DROP TABLE IF EXISTS kpi_snapshots;`);
  }
}
