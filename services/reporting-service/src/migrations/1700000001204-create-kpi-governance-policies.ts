import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKpiGovernancePolicies1700000001204 implements MigrationInterface {
  name = 'CreateKpiGovernancePolicies1700000001204';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpi_governance_policies (
        kpi_key TEXT PRIMARY KEY,
        allowed_period_granularities TEXT[] NOT NULL DEFAULT '{}',
        allowed_source_systems TEXT[] NOT NULL DEFAULT '{}',
        expected_unit TEXT,
        min_value NUMERIC,
        max_value NUMERIC,
        enforced BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kpi_governance_policies_enforced ON kpi_governance_policies(enforced);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS kpi_governance_policies;`);
  }
}
