import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFnolFields1760000000900 implements MigrationInterface {
  name = 'AddFnolFields1760000000900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE claims
      ADD COLUMN IF NOT EXISTS notification_channel TEXT,
      ADD COLUMN IF NOT EXISTS notification_source TEXT,
      ADD COLUMN IF NOT EXISTS auto_assigned_adjuster_id UUID,
      ADD COLUMN IF NOT EXISTS auto_triage_score INTEGER,
      ADD COLUMN IF NOT EXISTS auto_triage_category TEXT,
      ADD COLUMN IF NOT EXISTS policy_validated BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS policy_validation_result JSONB,
      ADD COLUMN IF NOT EXISTS contact_phone TEXT,
      ADD COLUMN IF NOT EXISTS contact_email TEXT,
      ADD COLUMN IF NOT EXISTS location_address TEXT,
      ADD COLUMN IF NOT EXISTS location_city TEXT,
      ADD COLUMN IF NOT EXISTS location_province TEXT,
      ADD COLUMN IF NOT EXISTS witnesses JSONB,
      ADD COLUMN IF NOT EXISTS attached_documents JSONB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE claims
      DROP COLUMN IF EXISTS notification_channel,
      DROP COLUMN IF EXISTS notification_source,
      DROP COLUMN IF EXISTS auto_assigned_adjuster_id,
      DROP COLUMN IF EXISTS auto_triage_score,
      DROP COLUMN IF EXISTS auto_triage_category,
      DROP COLUMN IF EXISTS policy_validated,
      DROP COLUMN IF EXISTS policy_validation_result,
      DROP COLUMN IF EXISTS contact_phone,
      DROP COLUMN IF EXISTS contact_email,
      DROP COLUMN IF EXISTS location_address,
      DROP COLUMN IF EXISTS location_city,
      DROP COLUMN IF EXISTS location_province,
      DROP COLUMN IF EXISTS witnesses,
      DROP COLUMN IF EXISTS attached_documents
    `);
  }
}
