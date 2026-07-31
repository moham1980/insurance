import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBrokerTransactionReport1700000001400 implements MigrationInterface {
  name = 'CreateBrokerTransactionReport1700000001400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS broker_transaction_reports (
        report_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid,
        broker_organization_id uuid,
        period_id text NOT NULL,
        period_start_date timestamptz,
        period_end_date timestamptz,
        report_type text NOT NULL DEFAULT 'broker_transaction',
        status text NOT NULL DEFAULT 'draft',
        currency text NOT NULL DEFAULT 'IRR',
        policy_count int NOT NULL DEFAULT 0,
        premium_amount numeric,
        claim_count int NOT NULL DEFAULT 0,
        claim_paid_amount numeric,
        commission_amount numeric,
        technical_result numeric,
        generated_at timestamptz,
        submitted_at timestamptz,
        approved_by uuid,
        payload jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_broker_transaction_reports_tenant ON broker_transaction_reports(tenant_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_broker_transaction_reports_broker ON broker_transaction_reports(broker_organization_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_broker_transaction_reports_period ON broker_transaction_reports(period_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_broker_transaction_reports_status ON broker_transaction_reports(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS broker_transaction_reports;`);
  }
}
