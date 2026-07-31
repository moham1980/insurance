import { MigrationInterface, QueryRunner } from 'typeorm';

export class P2CreatePolicyProjection1820000000000 implements MigrationInterface {
  name = 'P2CreatePolicyProjection1820000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS policy_projections (
        projection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        broker_organization_id UUID,
        issuer_organization_id UUID,
        policy_id UUID NOT NULL,
        policy_number TEXT NOT NULL,
        unique_code TEXT,
        placement_id UUID NOT NULL,
        source_system_id TEXT,
        source_version INT NOT NULL DEFAULT 1,
        idempotency_key TEXT,
        received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        payload JSONB,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policy_projections_tenant ON policy_projections(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policy_projections_policy ON policy_projections(tenant_id, policy_number);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policy_projections_placement ON policy_projections(placement_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policy_projections_broker ON policy_projections(tenant_id, broker_organization_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policy_projections_status ON policy_projections(status, updated_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS policy_projections;`);
  }
}
