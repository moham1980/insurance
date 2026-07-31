import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCommissionTier1800000000031 implements MigrationInterface {
  name = 'CreateCommissionTier1800000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS commission_tiers (
        tier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agreement_id UUID NOT NULL,
        tier_type TEXT NOT NULL,
        line_of_business TEXT,
        min_premium_amount_minor NUMERIC,
        max_premium_amount_minor NUMERIC,
        rate_bps INT,
        fixed_amount_minor NUMERIC,
        currency TEXT NOT NULL DEFAULT 'IRR',
        rules JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_commission_tiers_agreement
      ON commission_tiers(agreement_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS commission_tiers;`);
  }
}
