import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTCoRReport1700000001500 implements MigrationInterface {
  name = 'CreateTCoRReport1700000001500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tcor_reports (
        report_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid,
        period_id text NOT NULL,
        period_start_date timestamptz,
        period_end_date timestamptz,
        report_type text NOT NULL DEFAULT 'tcor',
        status text NOT NULL DEFAULT 'draft',
        currency text NOT NULL DEFAULT 'IRR',
        total_premium numeric,
        total_claim_paid numeric,
        acquisition_cost numeric,
        operating_expense numeric,
        reinsurance_cost numeric,
        total_cost_of_risk numeric,
        combined_ratio numeric,
        loss_ratio numeric,
        expense_ratio numeric,
        generated_at timestamptz,
        submitted_at timestamptz,
        approved_by uuid,
        payload jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tcor_reports_tenant ON tcor_reports(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tcor_reports_period ON tcor_reports(period_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tcor_reports_status ON tcor_reports(status);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tcor_reports;`);
  }
}
