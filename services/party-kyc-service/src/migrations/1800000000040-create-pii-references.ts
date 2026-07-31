import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePiiReferences1800000000040 implements MigrationInterface {
  name = 'CreatePiiReferences1800000000040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pii_references (
        pii_reference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pii_type TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        key_version TEXT NOT NULL DEFAULT 'v1',
        blind_index TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        kms_provider TEXT NOT NULL DEFAULT 'local',
        vault_path TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pii_references_type_blind
      ON pii_references(pii_type, blind_index);
    `);
    await queryRunner.query(`
      ALTER TABLE parties
      ADD COLUMN IF NOT EXISTS national_id_pii_reference_id UUID,
      ADD COLUMN IF NOT EXISTS mobile_pii_reference_id UUID;
    `);
    await queryRunner.query(`
      ALTER TABLE identity_identifiers
      ADD COLUMN IF NOT EXISTS pii_reference_id UUID;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE parties
      DROP COLUMN IF EXISTS national_id_pii_reference_id,
      DROP COLUMN IF EXISTS mobile_pii_reference_id;
    `);
    await queryRunner.query(`
      ALTER TABLE identity_identifiers
      DROP COLUMN IF EXISTS pii_reference_id;
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS pii_references;`);
  }
}
