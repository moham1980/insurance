import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantCurrencyAndAuditColumns1700000000107 implements MigrationInterface {
  name = 'TenantCurrencyAndAuditColumns1700000000107';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'claims';
    await queryRunner.query(`
      ALTER TABLE ${schema}.claims
      ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
      ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'IRR',
      ADD COLUMN IF NOT EXISTS idempotency_payload_hash TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS payment_reference TEXT DEFAULT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE ${schema}.consumed_events
      ADD COLUMN IF NOT EXISTS processed BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS error TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ DEFAULT NULL;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS ${schema}.idx_claims_idempotency_key;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_claims_tenant_idempotency_key
      ON ${schema}.claims(tenant_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_claims_tenant_payment_reference
      ON ${schema}.claims(tenant_id, payment_reference)
      WHERE payment_reference IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_claims_tenant_id
      ON ${schema}.claims(tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'claims';
    await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.idx_claims_tenant_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.uq_claims_tenant_payment_reference;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.uq_claims_tenant_idempotency_key;`);
    await queryRunner.query(`
      ALTER TABLE ${schema}.claims
      DROP COLUMN IF EXISTS tenant_id,
      DROP COLUMN IF EXISTS version,
      DROP COLUMN IF EXISTS currency,
      DROP COLUMN IF EXISTS idempotency_payload_hash,
      DROP COLUMN IF EXISTS payment_reference;
    `);
    await queryRunner.query(`
      ALTER TABLE ${schema}.consumed_events
      DROP COLUMN IF EXISTS processed,
      DROP COLUMN IF EXISTS error,
      DROP COLUMN IF EXISTS processed_at;
    `);
  }
}
