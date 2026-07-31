import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFederationConsent1800000000015 implements MigrationInterface {
  name = 'CreateFederationConsent1800000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS federation_consents (
        consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        global_subject_id UUID NOT NULL,
        source_tenant_id TEXT NOT NULL,
        target_tenant_id TEXT NOT NULL,
        consent_type TEXT NOT NULL,
        data_categories JSONB DEFAULT '[]',
        purpose TEXT NOT NULL,
        status TEXT DEFAULT 'granted',
        granted_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        revoked_reason TEXT,
        audit_trail JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_fed_consent_subject_target_type ON federation_consents(global_subject_id, target_tenant_id, consent_type);
      CREATE INDEX IF NOT EXISTS idx_fed_consent_status ON federation_consents(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS federation_consents;`);
  }
}
