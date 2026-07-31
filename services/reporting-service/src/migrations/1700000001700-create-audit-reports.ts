import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditReports1700000001700 implements MigrationInterface {
  name = 'CreateAuditReports1700000001700';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_reports (
        report_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid,
        report_type text NOT NULL,
        period_id text,
        period_start_date timestamptz,
        period_end_date timestamptz,
        status text NOT NULL DEFAULT 'draft',
        generated_by uuid,
        generated_at timestamptz,
        payload jsonb,
        signature text,
        previous_signature text,
        export_masked boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_reports_tenant ON audit_reports(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_reports_type ON audit_reports(report_type);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_reports_status ON audit_reports(status);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_reports;`);
  }
}
