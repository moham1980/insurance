import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChannelWorkspaces1800000000020 implements MigrationInterface {
  name = 'CreateChannelWorkspaces1800000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS channel_workspaces (
        workspace_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        organization_id UUID NOT NULL,
        channel_type TEXT NOT NULL,
        brand_key TEXT NOT NULL,
        domain TEXT,
        allowed_capabilities TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_channel_workspaces_tenant_status ON channel_workspaces(tenant_id, status);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_channel_workspaces_org_status ON channel_workspaces(organization_id, status);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_channel_workspaces_brand_key ON channel_workspaces(brand_key);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS channel_workspaces;`);
  }
}
