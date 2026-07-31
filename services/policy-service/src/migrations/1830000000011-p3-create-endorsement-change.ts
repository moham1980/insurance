import { MigrationInterface, QueryRunner } from 'typeorm';

export class P3CreateEndorsementChange1830000000011 implements MigrationInterface {
  name = 'P3CreateEndorsementChange1830000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS endorsement_changes (
        change_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT,
        endorsement_id UUID NOT NULL,
        field TEXT NOT NULL,
        old_value JSONB,
        new_value JSONB,
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_endorsement_changes_endorsement_id ON endorsement_changes(endorsement_id);
      CREATE INDEX IF NOT EXISTS idx_endorsement_changes_field ON endorsement_changes(endorsement_id, field);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_endorsement_changes_field;
      DROP INDEX IF EXISTS idx_endorsement_changes_endorsement_id;
      DROP TABLE IF EXISTS endorsement_changes;
    `);
  }
}
