import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create consent_records table to replace file-based consent store.
 *
 * Replaces: consent/consent.store.ts (file-based JSON storage)
 * Table: customer360.consent_records
 */
export class CreateConsentRecords1700000001100 implements MigrationInterface {
  name = 'CreateConsentRecords1700000001100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA || 'customer360';

    await queryRunner.query(`
      CREATE SCHEMA IF NOT EXISTS "${schema}";
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schema}"."consent_records" (
        consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id VARCHAR(255) NOT NULL,
        purpose VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'granted',
        granted_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        revocation_reason TEXT,
        version VARCHAR(20) NOT NULL DEFAULT '1.0',
        source VARCHAR(100),
        channel VARCHAR(50),
        actor_user_id VARCHAR(255),
        tenant_id VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_consent_customer_id
        ON "${schema}"."consent_records" ("customer_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_consent_customer_purpose
        ON "${schema}"."consent_records" ("customer_id", "purpose");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_consent_tenant
        ON "${schema}"."consent_records" ("tenant_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_consent_status
        ON "${schema}"."consent_records" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA || 'customer360';
    await queryRunner.query(`DROP TABLE IF EXISTS "${schema}"."consent_records" CASCADE;`);
  }
}
