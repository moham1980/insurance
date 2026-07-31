import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSalesNetworkMemberships1800000000006 implements MigrationInterface {
  name = 'CreateSalesNetworkMemberships1800000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sales_network_memberships (
        membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        tenant_id UUID NOT NULL,
        party_id UUID NOT NULL,
        parent_party_id UUID,
        role_type TEXT NOT NULL,
        carrier_organization_id UUID,
        scope TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        valid_from TIMESTAMPTZ NOT NULL,
        valid_to TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_network_memberships_org_tenant_party
      ON sales_network_memberships(organization_id, tenant_id, party_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_network_memberships_parent
      ON sales_network_memberships(parent_party_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_network_memberships_carrier_status
      ON sales_network_memberships(carrier_organization_id, status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sales_network_memberships;`);
  }
}
