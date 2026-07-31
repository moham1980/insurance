import { MigrationInterface, QueryRunner } from 'typeorm';

export class P2CreatePlacement1820000000002 implements MigrationInterface {
  name = 'P2CreatePlacement1820000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS placements (
        placement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        submission_id UUID NOT NULL,
        quote_request_id UUID NOT NULL,
        quote_response_id UUID NOT NULL,
        carrier_organization_id UUID NOT NULL,
        broker_organization_id UUID NOT NULL,
        broker_license_id UUID,
        status TEXT NOT NULL DEFAULT 'draft',
        bind_saga_state TEXT NOT NULL DEFAULT 'not_started',
        policy_id UUID,
        policy_number TEXT,
        premium_reservation_id UUID,
        subjectivities_status TEXT NOT NULL DEFAULT 'pending',
        saga_steps JSONB,
        bind_attempts INT NOT NULL DEFAULT 0,
        last_error JSONB,
        effective_from TIMESTAMPTZ NOT NULL,
        effective_to TIMESTAMPTZ NOT NULL,
        idempotency_key TEXT,
        created_by TEXT,
        version INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_placements_tenant ON placements(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_placements_submission ON placements(submission_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_placements_quote_response ON placements(quote_response_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_placements_carrier ON placements(carrier_organization_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_placements_status ON placements(status);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_placements_idempotency ON placements(idempotency_key) WHERE idempotency_key IS NOT NULL;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS subjectivities (
        subjectivity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        placement_id UUID,
        submission_id UUID NOT NULL,
        kind TEXT NOT NULL,
        description TEXT NOT NULL,
        required_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        document_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        fulfilled_at TIMESTAMPTZ,
        waived_at TIMESTAMPTZ,
        waived_by TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_subjectivities_placement ON subjectivities(placement_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_subjectivities_submission ON subjectivities(submission_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS quote_documents (
        quote_document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        quote_response_id UUID NOT NULL,
        document_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'required',
        storage_ref TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_quote_documents_quote ON quote_documents(quote_response_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS connector_configs (
        connector_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        carrier_organization_id UUID NOT NULL,
        name TEXT NOT NULL,
        connector_type TEXT NOT NULL,
        config JSONB NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'active',
        timeout_ms INT NOT NULL DEFAULT 30000,
        retry_policy JSONB,
        circuit_breaker_config JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_connector_configs_tenant ON connector_configs(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_connector_configs_carrier ON connector_configs(carrier_organization_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_connector_configs_type ON connector_configs(connector_type);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_connector_configs_status ON connector_configs(status);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS connector_configs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS quote_documents;`);
    await queryRunner.query(`DROP TABLE IF EXISTS subjectivities;`);
    await queryRunner.query(`DROP TABLE IF EXISTS placements;`);
  }
}
