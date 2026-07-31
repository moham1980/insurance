import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIssuerOrganizationToPolicy1760000000410 implements MigrationInterface {
  name = 'AddIssuerOrganizationToPolicy1760000000410';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE policies
      ADD COLUMN IF NOT EXISTS issuer_organization_id UUID;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_policies_issuer_organization_id ON policies(issuer_organization_id);
    `);

    // Backfill issuer_organization_id from the tenant's organization (issuer tenant owns the policy).
    // The tenants table has organization_id which maps to the issuing insurer organization.
    await queryRunner.query(`
      UPDATE policies p
      SET issuer_organization_id = t.organization_id
      FROM tenants t
      WHERE p.tenant_id = t.tenant_id
        AND p.issuer_organization_id IS NULL
        AND t.organization_id IS NOT NULL;
    `);

    // Backfill distribution_organization_id from producer_org_unit_id where still null.
    await queryRunner.query(`
      UPDATE policies
      SET distribution_organization_id = producer_org_unit_id
      WHERE distribution_organization_id IS NULL
        AND producer_org_unit_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_policies_issuer_organization_id;
    `);
    await queryRunner.query(`
      ALTER TABLE policies
      DROP COLUMN IF EXISTS issuer_organization_id;
    `);
  }
}
