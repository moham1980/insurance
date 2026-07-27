import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantAndGatewayColumns1700000000504 implements MigrationInterface {
  name = 'AddTenantAndGatewayColumns1700000000504';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'public';
    await queryRunner.query(`SET search_path TO ${schema}, public;`);

    await queryRunner.query(`
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'system',
      ADD COLUMN IF NOT EXISTS gateway_payment_id UUID NULL,
      ADD COLUMN IF NOT EXISTS prepared_by_user_id TEXT NULL
    `);

    await queryRunner.query(`ALTER TABLE payment_intents ALTER COLUMN tenant_id DROP DEFAULT;`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_intents_tenant_idempotency_key
      ON payment_intents(tenant_id, idempotency_key);
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_payment_intents_idempotency_key;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payment_intents_tenant_id ON payment_intents(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payment_intents_gateway_payment_id ON payment_intents(gateway_payment_id);`);

    await queryRunner.query(`
      ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'system',
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);
    await queryRunner.query(`ALTER TABLE payments ALTER COLUMN tenant_id DROP DEFAULT;`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_tenant_intent_provider_status
      ON payments(tenant_id, payment_intent_id, COALESCE(provider_ref, ''), status)
      WHERE status IN ('executed');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_payments_tenant_intent_provider_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payments_tenant_id;`);
    await queryRunner.query(`ALTER TABLE payments DROP COLUMN IF EXISTS tenant_id, DROP COLUMN IF EXISTS updated_at;`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_intents_gateway_payment_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_intents_tenant_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_payment_intents_tenant_idempotency_key;`);
    await queryRunner.query(`ALTER TABLE payment_intents DROP COLUMN IF EXISTS tenant_id, DROP COLUMN IF EXISTS gateway_payment_id, DROP COLUMN IF EXISTS prepared_by_user_id;`);
  }
}
