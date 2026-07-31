import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePartyRoleAssignment1800000000011 implements MigrationInterface {
  name = 'CreatePartyRoleAssignment1800000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS party_role_assignments (
        assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        party_id UUID NOT NULL,
        organization_id UUID NOT NULL,
        tenant_id TEXT NOT NULL,
        role_type TEXT NOT NULL,
        scope TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        valid_from TIMESTAMPTZ NOT NULL,
        valid_to TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_party_role_assignments_party_org_tenant_role
      ON party_role_assignments(party_id, organization_id, tenant_id, role_type);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_party_role_assignments_org_tenant_role_status
      ON party_role_assignments(organization_id, tenant_id, role_type, status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS party_role_assignments;`);
  }
}
