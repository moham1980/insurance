import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDataQualityIssues1700000001600 implements MigrationInterface {
  name = 'CreateDataQualityIssues1700000001600';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS data_quality_issues (
        issue_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid,
        rule_id text NOT NULL,
        rule_name text NOT NULL,
        entity_type text NOT NULL,
        entity_id text NOT NULL,
        severity text NOT NULL,
        status text NOT NULL DEFAULT 'open',
        issue_message text NOT NULL,
        payload jsonb,
        resolved_at timestamptz,
        resolved_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_data_quality_issues_tenant ON data_quality_issues(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_data_quality_issues_rule ON data_quality_issues(rule_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_data_quality_issues_entity ON data_quality_issues(entity_type, entity_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_data_quality_issues_severity ON data_quality_issues(severity);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_data_quality_issues_status ON data_quality_issues(status);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS data_quality_issues;`);
  }
}
