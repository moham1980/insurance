import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrokerOrgToPayments1850000000001 implements MigrationInterface {
  name = 'AddBrokerOrgToPayments1850000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'payments';
    await queryRunner.query(`SET search_path TO ${schema}, public;`);

    await queryRunner.query(`
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS broker_organization_id UUID,
      ADD COLUMN IF NOT EXISTS payment_type TEXT,
      ADD COLUMN IF NOT EXISTS policy_id TEXT;
    `);

    await queryRunner.query(`
      ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS broker_organization_id UUID,
      ADD COLUMN IF NOT EXISTS payment_type TEXT,
      ADD COLUMN IF NOT EXISTS policy_id TEXT,
      ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS metadata JSONB;
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payment_intents_broker_org ON payment_intents(broker_organization_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payments_broker_org ON payments(broker_organization_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payment_intents_policy_id ON payment_intents(policy_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payments_policy_id ON payments(policy_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'payments';
    await queryRunner.query(`SET search_path TO ${schema}, public;`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_payments_policy_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_intents_policy_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payments_broker_org;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_intents_broker_org;`);

    await queryRunner.query(`
      ALTER TABLE payments
      DROP COLUMN IF EXISTS metadata,
      DROP COLUMN IF EXISTS refunded_amount,
      DROP COLUMN IF EXISTS policy_id,
      DROP COLUMN IF EXISTS payment_type,
      DROP COLUMN IF EXISTS broker_organization_id;
    `);

    await queryRunner.query(`
      ALTER TABLE payment_intents
      DROP COLUMN IF EXISTS policy_id,
      DROP COLUMN IF EXISTS payment_type,
      DROP COLUMN IF EXISTS broker_organization_id;
    `);
  }
}
