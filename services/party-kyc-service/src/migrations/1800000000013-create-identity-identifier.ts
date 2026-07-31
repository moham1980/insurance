import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdentityIdentifier1800000000013 implements MigrationInterface {
  name = 'CreateIdentityIdentifier1800000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS identity_identifiers (
        identifier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        global_subject_id UUID NOT NULL,
        type TEXT NOT NULL,
        blind_index TEXT NOT NULL,
        encrypted_value_ref TEXT,
        verified_at TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_identity_identifiers_global_subject_type_index
      ON identity_identifiers(global_subject_id, type, blind_index);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_identity_identifiers_blind_index
      ON identity_identifiers(blind_index);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS identity_identifiers;`);
  }
}
