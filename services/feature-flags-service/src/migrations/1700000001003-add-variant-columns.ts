import { MigrationInterface, QueryRunner } from 'typeorm';

// P2 #9: Add A/B testing variant columns to feature_flags table.
export class AddVariantColumns1700000001003 implements MigrationInterface {
  name = 'AddVariantColumns1700000001003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE feature_flags
      ADD COLUMN IF NOT EXISTS variant_type TEXT NOT NULL DEFAULT 'boolean',
      ADD COLUMN IF NOT EXISTS variants JSONB;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_feature_flags_variant_type ON feature_flags(variant_type);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_feature_flags_variant_type;`);
    await queryRunner.query(`
      ALTER TABLE feature_flags
      DROP COLUMN IF EXISTS variants,
      DROP COLUMN IF EXISTS variant_type;
    `);
  }
}
