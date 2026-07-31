import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommissionTierExtraColumns1810000000002 implements MigrationInterface {
  name = 'AddCommissionTierExtraColumns1810000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE commission_tiers
      ADD COLUMN IF NOT EXISTS cap_amount_minor NUMERIC,
      ADD COLUMN IF NOT EXISTS floor_amount_minor NUMERIC,
      ADD COLUMN IF NOT EXISTS split_percent_bps INT,
      ADD COLUMN IF NOT EXISTS hierarchy_level TEXT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE commission_tiers
      DROP COLUMN IF EXISTS hierarchy_level,
      DROP COLUMN IF EXISTS split_percent_bps,
      DROP COLUMN IF EXISTS floor_amount_minor,
      DROP COLUMN IF EXISTS cap_amount_minor;
    `);
  }
}
