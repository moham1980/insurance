import { MigrationInterface, QueryRunner } from 'typeorm';

export class P3CreatePolicyCoverage1830000000001 implements MigrationInterface {
  name = 'P3CreatePolicyCoverage1830000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS policy_coverages (
        policy_coverage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT,
        policy_id UUID NOT NULL,
        coverage_code TEXT NOT NULL,
        limit_amount NUMERIC DEFAULT 0,
        limit_currency TEXT DEFAULT 'IRR',
        deductible_amount NUMERIC DEFAULT 0,
        deductible_currency TEXT DEFAULT 'IRR',
        premium_amount NUMERIC DEFAULT 0,
        premium_currency TEXT DEFAULT 'IRR',
        status TEXT DEFAULT 'active',
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_policy_coverages_policy_id ON policy_coverages(policy_id);
      CREATE INDEX IF NOT EXISTS idx_policy_coverages_policy_code ON policy_coverages(policy_id, coverage_code);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_policy_coverages_policy_code;
      DROP INDEX IF EXISTS idx_policy_coverages_policy_id;
      DROP TABLE IF EXISTS policy_coverages;
    `);
  }
}
