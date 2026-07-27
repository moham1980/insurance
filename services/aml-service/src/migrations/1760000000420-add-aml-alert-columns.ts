import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAmlAlertColumns1760000000420 implements MigrationInterface {
  name = 'AddAmlAlertColumns1760000000420';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE aml_alerts
        ADD COLUMN IF NOT EXISTS risk_level TEXT,
        ADD COLUMN IF NOT EXISTS risk_score NUMERIC,
        ADD COLUMN IF NOT EXISTS reason TEXT,
        ADD COLUMN IF NOT EXISTS party_id TEXT,
        ADD COLUMN IF NOT EXISTS party_name TEXT,
        ADD COLUMN IF NOT EXISTS transaction_type TEXT,
        ADD COLUMN IF NOT EXISTS amount NUMERIC,
        ADD COLUMN IF NOT EXISTS currency TEXT,
        ADD COLUMN IF NOT EXISTS reference_type TEXT,
        ADD COLUMN IF NOT EXISTS reference_id TEXT,
        ADD COLUMN IF NOT EXISTS matched_rules JSONB,
        ADD COLUMN IF NOT EXISTS metadata JSONB,
        ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS resolution TEXT;
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_aml_alerts_party_id_created_at ON aml_alerts(party_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_aml_alerts_reference ON aml_alerts(reference_type, reference_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_aml_alerts_reference;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_aml_alerts_party_id_created_at;`);

    await queryRunner.query(`
      ALTER TABLE aml_alerts
        DROP COLUMN IF EXISTS resolution,
        DROP COLUMN IF EXISTS resolved_at,
        DROP COLUMN IF EXISTS escalated_at,
        DROP COLUMN IF EXISTS metadata,
        DROP COLUMN IF EXISTS matched_rules,
        DROP COLUMN IF EXISTS reference_id,
        DROP COLUMN IF EXISTS reference_type,
        DROP COLUMN IF EXISTS currency,
        DROP COLUMN IF EXISTS amount,
        DROP COLUMN IF EXISTS transaction_type,
        DROP COLUMN IF EXISTS party_name,
        DROP COLUMN IF EXISTS party_id,
        DROP COLUMN IF EXISTS reason,
        DROP COLUMN IF EXISTS risk_score,
        DROP COLUMN IF EXISTS risk_level;
    `);
  }
}
