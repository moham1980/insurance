import { MigrationInterface, QueryRunner } from 'typeorm';

export class P8FederationBackfill1880000000000 implements MigrationInterface {
  name = 'P8FederationBackfill1880000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add federation fields to claims table if not present
    await queryRunner.query(`
      ALTER TABLE claims
        ADD COLUMN IF NOT EXISTS federation_status TEXT DEFAULT 'local',
        ADD COLUMN IF NOT EXISTS source_version INT DEFAULT 1,
        ADD COLUMN IF NOT EXISTS source_system_id TEXT,
        ADD COLUMN IF NOT EXISTS external_id TEXT;
    `);

    // Backfill federation fields on claims
    await queryRunner.query(`
      UPDATE claims
      SET
        authoritative_tenant_id = COALESCE(authoritative_tenant_id, tenant_id::uuid),
        record_owner_organization_id = COALESCE(record_owner_organization_id, tenant_id::uuid),
        carrier_organization_id = COALESCE(carrier_organization_id, tenant_id::uuid),
        source_system_id = COALESCE(source_system_id, 'claims-service'),
        source_version = COALESCE(source_version, 1),
        federation_status = COALESCE(federation_status, 'local'),
        external_id = COALESCE(external_id, external_claim_id)
      WHERE authoritative_tenant_id IS NULL
         OR record_owner_organization_id IS NULL
         OR source_system_id IS NULL
         OR federation_status IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_claims_federation_status ON claims(federation_status);
      CREATE INDEX IF NOT EXISTS idx_claims_source_version ON claims(source_version);
      CREATE INDEX IF NOT EXISTS idx_claims_source_system_id ON claims(source_system_id);
    `);

    // Add federation fields to claim_projections table if not present
    await queryRunner.query(`
      ALTER TABLE claim_projections
        ADD COLUMN IF NOT EXISTS federation_status TEXT DEFAULT 'projected',
        ADD COLUMN IF NOT EXISTS authoritative_tenant_id UUID,
        ADD COLUMN IF NOT EXISTS record_owner_organization_id UUID,
        ADD COLUMN IF NOT EXISTS external_id TEXT;
    `);

    // Backfill claim_projections
    await queryRunner.query(`
      UPDATE claim_projections
      SET
        federation_status = 'projected',
        authoritative_tenant_id = COALESCE(
          authoritative_tenant_id,
          (payload->>'sourceTenantId')::uuid
        ),
        record_owner_organization_id = COALESCE(
          record_owner_organization_id,
          carrier_organization_id
        ),
        external_id = COALESCE(
          external_id,
          external_claim_id
        )
      WHERE federation_status IS NULL OR federation_status = 'projected';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_claim_projections_federation_status ON claim_projections(federation_status);
      CREATE INDEX IF NOT EXISTS idx_claim_projections_authoritative_tenant ON claim_projections(authoritative_tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_claim_projections_authoritative_tenant;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_claim_projections_federation_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_claims_source_system_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_claims_source_version;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_claims_federation_status;`);

    await queryRunner.query(`
      ALTER TABLE claim_projections
        DROP COLUMN IF EXISTS external_id,
        DROP COLUMN IF EXISTS record_owner_organization_id,
        DROP COLUMN IF EXISTS authoritative_tenant_id,
        DROP COLUMN IF EXISTS federation_status;
    `);

    await queryRunner.query(`
      ALTER TABLE claims
        DROP COLUMN IF EXISTS external_id,
        DROP COLUMN IF EXISTS source_system_id,
        DROP COLUMN IF EXISTS source_version,
        DROP COLUMN IF EXISTS federation_status;
    `);
  }
}
