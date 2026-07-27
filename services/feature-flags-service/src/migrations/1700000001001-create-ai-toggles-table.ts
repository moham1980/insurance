import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAiTogglesTable1700000001001 implements MigrationInterface {
  name = 'CreateAiTogglesTable1700000001001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_toggles (
        ai_toggle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        is_enabled BOOLEAN NOT NULL DEFAULT false,
        model_name TEXT,
        model_version TEXT,
        config JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_toggles_name ON ai_toggles(name);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_toggles_is_enabled ON ai_toggles(is_enabled);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_toggles_model_name ON ai_toggles(model_name);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ai_toggles;`);
  }
}
