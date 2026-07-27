import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentsTables1700000000501 implements MigrationInterface {
  name = 'CreatePaymentsTables1700000000501';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'payments';
    await queryRunner.query(`SET search_path TO ${schema}, public;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_intents (
        payment_intent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        claim_id TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        currency TEXT NOT NULL DEFAULT 'IRR',
        beneficiary_party_id UUID,
        destination_iban TEXT,
        status TEXT NOT NULL DEFAULT 'prepared',
        idempotency_key TEXT NOT NULL,
        payment_docs JSONB,
        finance_approval JSONB,
        execution_result JSONB,
        notification_result JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_intents_idempotency_key ON payment_intents(idempotency_key);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payment_intents_claim_id ON payment_intents(claim_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payment_intents_status_updated_at ON payment_intents(status, updated_at);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payments (
        payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_intent_id UUID NOT NULL,
        status TEXT NOT NULL,
        provider TEXT,
        provider_ref TEXT,
        amount NUMERIC NOT NULL,
        currency TEXT NOT NULL DEFAULT 'IRR',
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payments_intent_created_at ON payments(payment_intent_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payments_status_created_at ON payments(status, created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS payments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS payment_intents;`);
  }
}
