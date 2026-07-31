import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBonusTier1800000000034 implements MigrationInterface {
  name = 'CreateBonusTier1800000000034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bonus_tiers (
        bonus_tier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agreement_id UUID NOT NULL,
        name TEXT NOT NULL,
        metric TEXT NOT NULL,
        threshold_amount_minor NUMERIC NOT NULL,
        threshold_currency TEXT NOT NULL,
        bonus_amount_minor NUMERIC NOT NULL,
        bonus_currency TEXT NOT NULL,
        rules JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bonus_tiers_agreement ON bonus_tiers(agreement_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS bonus_tiers;`);
  }
}
