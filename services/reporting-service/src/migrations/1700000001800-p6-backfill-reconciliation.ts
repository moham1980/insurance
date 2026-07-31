import { MigrationInterface, QueryRunner } from 'typeorm';

export class P6BackfillReconciliation1700000001800 implements MigrationInterface {
  name = 'P6BackfillReconciliation1700000001800';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add tamper-evident columns to audit_reports if not exists
    await queryRunner.query(`
      ALTER TABLE audit_reports
      ADD COLUMN IF NOT EXISTS signature text,
      ADD COLUMN IF NOT EXISTS previous_signature text,
      ADD COLUMN IF NOT EXISTS export_masked boolean NOT NULL DEFAULT false;
    `);

    // Create consent_log table for audit reports
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rm_consent_log (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid,
        consent_type text NOT NULL,
        consent_status text NOT NULL,
        party_id uuid,
        policy_id uuid,
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_consent_log_tenant ON rm_consent_log(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_consent_log_type ON rm_consent_log(consent_type);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_consent_log_status ON rm_consent_log(consent_status);`);

    // Create reconciliation_run_log table to track reconciliation job runs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reconciliation_run_log (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid,
        reconciliation_type text NOT NULL,
        status text NOT NULL DEFAULT 'completed',
        total_records int,
        issues_created int,
        discrepancy numeric(18,2),
        payload jsonb,
        started_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_recon_log_tenant ON reconciliation_run_log(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_recon_log_type ON reconciliation_run_log(reconciliation_type);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_recon_log_status ON reconciliation_run_log(status);`);

    // Backfill: Set export_masked=false for all existing audit reports
    await queryRunner.query(`
      UPDATE audit_reports SET export_masked = false WHERE export_masked IS NULL;
    `);

    // Create regulatory_report table for per-issuer/broker regulatory reports
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS regulatory_reports (
        report_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid,
        report_type text NOT NULL,
        issuer_id text,
        broker_organization_id text,
        period_id text NOT NULL,
        period_start_date timestamptz,
        period_end_date timestamptz,
        status text NOT NULL DEFAULT 'draft',
        format text DEFAULT 'json',
        payload jsonb,
        xml_content text,
        pdf_content bytea,
        generated_by uuid,
        generated_at timestamptz,
        submitted_at timestamptz,
        signature text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_reg_reports_tenant ON regulatory_reports(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_reg_reports_type ON regulatory_reports(report_type);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_reg_reports_issuer ON regulatory_reports(issuer_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_reg_reports_broker ON regulatory_reports(broker_organization_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_reg_reports_status ON regulatory_reports(status);`);

    // Create data_retention_policy table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS data_retention_policies (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid,
        entity_type text NOT NULL,
        retention_days int NOT NULL DEFAULT 365,
        action text NOT NULL DEFAULT 'archive',
        purge_pii boolean NOT NULL DEFAULT false,
        last_run_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_retention_tenant ON data_retention_policies(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_retention_entity ON data_retention_policies(entity_type);`);

    // Insert default retention policies
    await queryRunner.query(`
      INSERT INTO data_retention_policies (entity_type, retention_days, action, purge_pii)
      VALUES
        ('audit_logs', 2555, 'archive', false),
        ('kpi_snapshots', 1095, 'archive', false),
        ('outbox_events', 365, 'delete', false),
        ('consumed_events', 365, 'delete', false),
        ('data_quality_issues', 1095, 'archive', false),
        ('audit_reports', 2555, 'archive', false),
        ('broker_transaction_reports', 2555, 'archive', false),
        ('tcor_reports', 2555, 'archive', false),
        ('rm_policies', 3650, 'archive', true),
        ('rm_claim_payments', 3650, 'archive', true),
        ('rm_fraud_signals', 1825, 'archive', false)
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS data_retention_policies;`);
    await queryRunner.query(`DROP TABLE IF EXISTS regulatory_reports;`);
    await queryRunner.query(`ALTER TABLE regulatory_reports DROP COLUMN IF EXISTS signature;`);
    await queryRunner.query(`DROP TABLE IF EXISTS reconciliation_run_log;`);
    await queryRunner.query(`DROP TABLE IF EXISTS rm_consent_log;`);
    await queryRunner.query(`
      ALTER TABLE audit_reports
      DROP COLUMN IF EXISTS signature,
      DROP COLUMN IF EXISTS previous_signature,
      DROP COLUMN IF EXISTS export_masked;
    `);
  }
}
