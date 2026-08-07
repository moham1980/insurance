import { MigrationInterface, QueryRunner } from 'typeorm';

// P2 #5: Migration for dashboard_configs table (customizable dashboards)
export class CreateDashboardConfigs1700000000830 implements MigrationInterface {
  name = 'CreateDashboardConfigs1700000000830';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dashboard_configs (
        dashboard_id UUID NOT NULL DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        widgets JSONB,
        layout JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (dashboard_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_dashboard_configs_tenant_user ON dashboard_configs(tenant_id, user_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_dashboard_configs_tenant_name ON dashboard_configs(tenant_id, name);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS dashboard_configs;`);
  }
}
