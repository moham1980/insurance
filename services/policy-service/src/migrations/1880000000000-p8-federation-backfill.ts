import { MigrationInterface, QueryRunner } from 'typeorm';

export class P8FederationBackfill1880000000000 implements MigrationInterface {
  name = 'P8FederationBackfill1880000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add federation fields to policies table if not present
    await queryRunner.query(`
      ALTER TABLE policies
        ADD COLUMN IF NOT EXISTS federation_status TEXT DEFAULT 'local',
        ADD COLUMN IF NOT EXISTS source_version INT DEFAULT 1,
        ADD COLUMN IF NOT EXISTS external_id TEXT;
    `);

    // Backfill federation fields on policies
    await queryRunner.query(`
      UPDATE policies
      SET
        authoritative_tenant_id = COALESCE(authoritative_tenant_id, tenant_id),
        record_owner_organization_id = COALESCE(record_owner_organization_id, issuer_organization_id, distribution_organization_id),
        source_system_id = COALESCE(source_system_id, 'policy-service'),
        source_version = COALESCE(source_version, 1),
        federation_status = COALESCE(federation_status, 'local'),
        external_id = COALESCE(external_id, external_policy_id)
      WHERE authoritative_tenant_id IS NULL
         OR record_owner_organization_id IS NULL
         OR source_system_id IS NULL
         OR federation_status IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_policies_federation_status ON policies(federation_status);
      CREATE INDEX IF NOT EXISTS idx_policies_source_version ON policies(source_version);
    `);

    // Add federation fields to policy_projections table if not present
    await queryRunner.query(`
      ALTER TABLE policy_projections
        ADD COLUMN IF NOT EXISTS federation_status TEXT DEFAULT 'projected',
        ADD COLUMN IF NOT EXISTS authoritative_tenant_id TEXT,
        ADD COLUMN IF NOT EXISTS record_owner_organization_id UUID,
        ADD COLUMN IF NOT EXISTS external_id TEXT;
    `);

    // Backfill policy_projections: set federation_status='projected' and authoritative_tenant_id from payload if available
    await queryRunner.query(`
      UPDATE policy_projections
      SET
        federation_status = 'projected',
        authoritative_tenant_id = COALESCE(
          authoritative_tenant_id,
          (payload->>'sourceTenantId')::text
        ),
        record_owner_organization_id = COALESCE(
          record_owner_organization_id,
          (payload->>'issuerOrganizationId')::uuid
        ),
        external_id = COALESCE(
          external_id,
          (payload->>'policyId')::text
        )
      WHERE federation_status IS NULL OR federation_status = 'projected';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_policy_projections_federation_status ON policy_projections(federation_status);
      CREATE INDEX IF NOT EXISTS idx_policy_projections_authoritative_tenant ON policy_projections(authoritative_tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_policy_projections_authoritative_tenant;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_policy_projections_federation_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_policies_source_version;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_policies_federation_status;`);

    await queryRunner.query(`
      ALTER TABLE policy_projections
        DROP COLUMN IF EXISTS external_id,
        DROP COLUMN IF EXISTS record_owner_organization_id,
        DROP COLUMN IF EXISTS authoritative_tenant_id,
        DROP COLUMN IF EXISTS federation_status;
    `);

    await queryRunner.query(`
      ALTER TABLE policies
        DROP COLUMN IF EXISTS external_id,
        DROP COLUMN IF EXISTS source_version,
        DROP COLUMN IF EXISTS federation_status;
    `);
  }
}
