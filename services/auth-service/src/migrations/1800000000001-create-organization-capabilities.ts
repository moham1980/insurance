import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrganizationCapabilities1800000000001 implements MigrationInterface {
  name = 'CreateOrganizationCapabilities1800000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organization_capabilities (
        capability_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        tenant_id UUID NOT NULL,
        capability TEXT NOT NULL,
        scope TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        binding_authority_profile_id UUID,
        effective_from TIMESTAMPTZ NOT NULL,
        effective_to TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_caps_org_tenant_capability
      ON organization_capabilities(organization_id, tenant_id, capability, status);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_caps_tenant_capability_status
      ON organization_capabilities(tenant_id, capability, status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS organization_capabilities;`);
  }
}
