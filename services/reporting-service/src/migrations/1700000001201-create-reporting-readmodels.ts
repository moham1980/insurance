import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReportingReadmodels1700000001201 implements MigrationInterface {
  name = 'CreateReportingReadmodels1700000001201';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rm_policy_lifecycle (
        policy_id UUID PRIMARY KEY,
        policy_number TEXT,
        quoted_at TIMESTAMPTZ,
        docs_submitted_at TIMESTAMPTZ,
        risk_assessed_at TIMESTAMPTZ,
        issued_at TIMESTAMPTZ,
        unique_code_set_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_policy_lifecycle_updated_at ON rm_policy_lifecycle(updated_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_policy_lifecycle_quoted_at ON rm_policy_lifecycle(quoted_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_policy_lifecycle_issued_at ON rm_policy_lifecycle(issued_at);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rm_claim_payment (
        claim_id UUID PRIMARY KEY,
        claim_number TEXT,
        policy_id UUID,
        registered_at TIMESTAMPTZ,
        payment_requested_at TIMESTAMPTZ,
        approved_amount NUMERIC,
        payment_executed_at TIMESTAMPTZ,
        claim_paid_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_claim_payment_updated_at ON rm_claim_payment(updated_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_claim_payment_registered_at ON rm_claim_payment(registered_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_claim_payment_paid_at ON rm_claim_payment(claim_paid_at);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rm_fraud_signal (
        claim_id UUID PRIMARY KEY,
        claim_number TEXT,
        latest_score INT,
        hold_claim BOOLEAN,
        score_computed_at TIMESTAMPTZ,
        case_opened_at TIMESTAMPTZ,
        case_closed_at TIMESTAMPTZ,
        case_resolution TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_fraud_signal_updated_at ON rm_fraud_signal(updated_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_fraud_signal_score_computed_at ON rm_fraud_signal(score_computed_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_fraud_signal_case_closed_at ON rm_fraud_signal(case_closed_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS rm_fraud_signal;`);
    await queryRunner.query(`DROP TABLE IF EXISTS rm_claim_payment;`);
    await queryRunner.query(`DROP TABLE IF EXISTS rm_policy_lifecycle;`);
  }
}
