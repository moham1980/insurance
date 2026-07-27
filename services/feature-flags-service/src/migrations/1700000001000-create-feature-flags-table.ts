import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeatureFlagsTable1700000001000 implements MigrationInterface {
  name = 'CreateFeatureFlagsTable1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS feature_flags (
        feature_flag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        is_enabled BOOLEAN NOT NULL DEFAULT false,
        rollout_percentage INTEGER NOT NULL DEFAULT 0,
        target_audience JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(name);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_feature_flags_is_enabled ON feature_flags(is_enabled);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_feature_flags_updated_at ON feature_flags(updated_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS feature_flags;`);
  }
}
