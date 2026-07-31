import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantIdToOrganizations1800000000010 implements MigrationInterface {
  name = 'AddTenantIdToOrganizations1800000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add tenant_id to organizations
    await queryRunner.query(`
      ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
    `);

    // Drop old non-tenant-scoped indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_organizations_national_id_blind_index;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_organizations_regulatory_code;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_organizations_country_status;`);

    // Create new tenant-scoped indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_tenant_national_id
      ON organizations(tenant_id, national_id_blind_index) WHERE national_id_blind_index IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_tenant_regulatory_code
      ON organizations(tenant_id, regulatory_code) WHERE regulatory_code IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_organizations_tenant_country_status
      ON organizations(tenant_id, country, status);
    `);

    // Add tenant_id to organization_relationships
    await queryRunner.query(`
      ALTER TABLE organization_relationships
      ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
    `);

    // Drop old non-tenant-scoped indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_org_relationships_source_target_type;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_org_relationships_agreement;`);

    // Create new tenant-scoped indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_relationships_tenant_source_target_type
      ON organization_relationships(tenant_id, source_organization_id, target_organization_id, relationship_type);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_relationships_tenant_agreement
      ON organization_relationships(tenant_id, distribution_agreement_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore organizations old indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_organizations_tenant_national_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_organizations_tenant_regulatory_code;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_organizations_tenant_country_status;`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_national_id_blind_index
      ON organizations(national_id_blind_index) WHERE national_id_blind_index IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_regulatory_code
      ON organizations(regulatory_code) WHERE regulatory_code IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_organizations_country_status ON organizations(country, status);
    `);
    await queryRunner.query(`ALTER TABLE organizations DROP COLUMN IF EXISTS tenant_id;`);

    // Restore organization_relationships old indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_org_relationships_tenant_source_target_type;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_org_relationships_tenant_agreement;`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_relationships_source_target_type
      ON organization_relationships(source_organization_id, target_organization_id, relationship_type);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_relationships_agreement
      ON organization_relationships(distribution_agreement_id);
    `);
    await queryRunner.query(`ALTER TABLE organization_relationships DROP COLUMN IF EXISTS tenant_id;`);
  }
}
