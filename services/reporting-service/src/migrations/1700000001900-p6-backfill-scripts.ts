import { MigrationInterface, QueryRunner } from 'typeorm';

export class P6BackfillScripts1700000001900 implements MigrationInterface {
  name = 'P6BackfillScripts1700000001900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Backfill uniqueCode for issued policies that have sanhabStatus=confirmed but no uniqueCode
    await queryRunner.query(`
      UPDATE rm_policies p
      SET unique_code = 'UC-BF-' || substring(p.policy_id::text, 1, 8),
          updated_at = now()
      WHERE p.status = 'issued'
        AND p.unique_code IS NULL
        AND p.sanhab_status = 'confirmed'
        AND p.tenant_id IS NOT NULL;
    `);

    // Backfill broker_transaction_reports from historical policy data
    // Create initial broker reports for each (broker_organization_id, period) combination
    await queryRunner.query(`
      INSERT INTO broker_transaction_reports (report_id, tenant_id, broker_organization_id, period_id, report_type, status, created_at, updated_at)
      SELECT
        uuid_generate_v4(),
        p.tenant_id,
        p.broker_organization_id,
        to_char(p.issued_at, 'YYYY-MM') as period_id,
        'monthly',
        'draft',
        now(),
        now()
      FROM rm_policies p
      WHERE p.issued_at IS NOT NULL
        AND p.broker_organization_id IS NOT NULL
        AND p.tenant_id IS NOT NULL
      GROUP BY p.tenant_id, p.broker_organization_id, to_char(p.issued_at, 'YYYY-MM')
      ON CONFLICT DO NOTHING;
    `);

    // Backfill tcor_reports from historical data
    await queryRunner.query(`
      INSERT INTO tcor_reports (report_id, tenant_id, period_id, period_start_date, period_end_date, status, created_at, updated_at)
      SELECT
        uuid_generate_v4(),
        tenant_id,
        to_char(date_trunc('quarter', issued_at), 'YYYY-Q') as period_id,
        date_trunc('quarter', issued_at) as period_start_date,
        date_trunc('quarter', issued_at) + interval '3 months' - interval '1 day' as period_end_date,
        'draft',
        now(),
        now()
      FROM rm_policies
      WHERE issued_at IS NOT NULL AND tenant_id IS NOT NULL
      GROUP BY tenant_id, to_char(date_trunc('quarter', issued_at), 'YYYY-Q'), date_trunc('quarter', issued_at)
      ON CONFLICT DO NOTHING;
    `);

    // Run initial data quality check: flag policies without unique code
    await queryRunner.query(`
      INSERT INTO data_quality_issues (issue_id, tenant_id, rule_id, rule_name, entity_type, entity_id, severity, status, issue_message, created_at, updated_at)
      SELECT
        uuid_generate_v4(),
        p.tenant_id,
        'unique_code_missing',
        'Active policy missing unique code',
        'policy',
        p.policy_id,
        'high',
        'open',
        'Policy ' || p.policy_number || ' is issued but has no unique code',
        now(),
        now()
      FROM rm_policies p
      WHERE p.status = 'issued'
        AND (p.unique_code IS NULL OR p.unique_code = '')
        AND p.tenant_id IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);

    // Flag negative premium amounts
    await queryRunner.query(`
      INSERT INTO data_quality_issues (issue_id, tenant_id, rule_id, rule_name, entity_type, entity_id, severity, status, issue_message, created_at, updated_at)
      SELECT
        uuid_generate_v4(),
        p.tenant_id,
        'negative_premium',
        'Negative premium amount',
        'policy',
        p.policy_id,
        'critical',
        'open',
        'Policy ' || p.policy_number || ' has negative premium amount',
        now(),
        now()
      FROM rm_policies p
      WHERE p.premium_amount < 0
        AND p.tenant_id IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);

    // Flag policies without broker organization
    await queryRunner.query(`
      INSERT INTO data_quality_issues (issue_id, tenant_id, rule_id, rule_name, entity_type, entity_id, severity, status, issue_message, created_at, updated_at)
      SELECT
        uuid_generate_v4(),
        p.tenant_id,
        'broker_org_missing',
        'Issued policy missing broker organization',
        'policy',
        p.policy_id,
        'medium',
        'open',
        'Policy ' || p.policy_number || ' is issued but has no broker organization',
        now(),
        now()
      FROM rm_policies p
      WHERE p.status = 'issued'
        AND (p.broker_organization_id IS NULL OR p.broker_organization_id = '')
        AND p.tenant_id IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);

    // Create migration_quarantine table for ambiguous records
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS migration_quarantine (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        source_table text NOT NULL,
        source_id text NOT NULL,
        reason text NOT NULL,
        data jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        resolved_at timestamptz,
        resolution text
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_quarantine_source ON migration_quarantine(source_table, source_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_quarantine_unresolved ON migration_quarantine(resolved_at) WHERE resolved_at IS NULL;`);

    // Quarantine policies with mismatched tenant in projections
    await queryRunner.query(`
      INSERT INTO migration_quarantine (source_table, source_id, reason, data)
      SELECT
        'rm_policies',
        p.policy_id::text,
        'Policy tenant mismatch with projection',
        json_build_object('policy_tenant', p.tenant_id, 'projection_tenant', pp.tenant_id)
      FROM rm_policies p
      JOIN rm_policy_projections pp ON p.policy_id = pp.policy_id
      WHERE p.tenant_id IS DISTINCT FROM pp.tenant_id
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS migration_quarantine;`);
    // Note: backfilled data quality issues and reports are not reversed
    // as they represent actual data state, not schema changes
  }
}
