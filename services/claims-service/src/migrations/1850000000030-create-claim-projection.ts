import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClaimProjection1850000000030 implements MigrationInterface {
  name = 'CreateClaimProjection1850000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS claim_projections (
        projection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        broker_organization_id UUID NOT NULL,
        carrier_organization_id UUID NOT NULL,
        claim_id UUID NOT NULL,
        external_claim_id TEXT NOT NULL,
        source_system_id TEXT NOT NULL,
        source_version INTEGER NOT NULL DEFAULT 1,
        payload JSONB NOT NULL,
        received_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_claim_projections_claim_id ON claim_projections(claim_id);
      CREATE INDEX IF NOT EXISTS idx_claim_projections_external_claim_id ON claim_projections(external_claim_id);
      CREATE INDEX IF NOT EXISTS idx_claim_projections_carrier_organization_id ON claim_projections(carrier_organization_id);
      CREATE INDEX IF NOT EXISTS idx_claim_projections_broker_organization_id ON claim_projections(broker_organization_id);
      CREATE INDEX IF NOT EXISTS idx_claim_projections_tenant_id ON claim_projections(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_claim_projections_source ON claim_projections(source_system_id, source_version);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS claim_projections;`);
  }
}
