import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKpiGovernanceColumns1700000001203 implements MigrationInterface {
  name = 'AddKpiGovernanceColumns1700000001203';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE kpi_snapshots ADD COLUMN IF NOT EXISTS period_granularity TEXT;`);
    await queryRunner.query(`ALTER TABLE kpi_snapshots ADD COLUMN IF NOT EXISTS official_source_system TEXT;`);

    await queryRunner.query(`ALTER TABLE kpi_ingestion_audit ADD COLUMN IF NOT EXISTS period_granularity TEXT;`);
    await queryRunner.query(`ALTER TABLE kpi_ingestion_audit ADD COLUMN IF NOT EXISTS official_source_system TEXT;`);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_granularity ON kpi_snapshots(kpi_key, period_granularity, created_at);`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_kpi_snapshots_granularity;`);

    await queryRunner.query(`ALTER TABLE kpi_ingestion_audit DROP COLUMN IF EXISTS official_source_system;`);
    await queryRunner.query(`ALTER TABLE kpi_ingestion_audit DROP COLUMN IF EXISTS period_granularity;`);

    await queryRunner.query(`ALTER TABLE kpi_snapshots DROP COLUMN IF EXISTS official_source_system;`);
    await queryRunner.query(`ALTER TABLE kpi_snapshots DROP COLUMN IF EXISTS period_granularity;`);
  }
}
