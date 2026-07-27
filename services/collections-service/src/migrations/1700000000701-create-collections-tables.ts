import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCollectionsTables1700000000701 implements MigrationInterface {
  name = 'CreateCollectionsTables1700000000701';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS installment_plans (
        plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        policy_id UUID NOT NULL,
        premium_amount NUMERIC NOT NULL,
        currency TEXT NOT NULL DEFAULT 'IRR',
        status TEXT NOT NULL DEFAULT 'active',
        idempotency_key TEXT NOT NULL,
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_installment_plans_idempotency_key ON installment_plans(idempotency_key);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_installment_plans_policy_id ON installment_plans(policy_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_installment_plans_status_updated_at ON installment_plans(status, updated_at);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS installments (
        installment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id UUID NOT NULL,
        policy_id UUID NOT NULL,
        installment_no INT NOT NULL,
        due_date TIMESTAMPTZ NOT NULL,
        amount NUMERIC NOT NULL,
        currency TEXT NOT NULL DEFAULT 'IRR',
        status TEXT NOT NULL DEFAULT 'pending',
        paid_at TIMESTAMPTZ,
        provider TEXT,
        provider_ref TEXT,
        payment_details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_installments_plan_no ON installments(plan_id, installment_no);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_installments_policy_due_date ON installments(policy_id, due_date);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_installments_status_updated_at ON installments(status, updated_at);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_installments_provider_ref ON installments(provider_ref) WHERE provider_ref IS NOT NULL;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS installments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS installment_plans;`);
  }
}
