import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDistributionAgreement1800000000030 implements MigrationInterface {
  name = 'CreateDistributionAgreement1800000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS distribution_agreements (
        agreement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        carrier_organization_id UUID NOT NULL,
        distributor_organization_id UUID NOT NULL,
        agreement_type TEXT NOT NULL,
        version INT NOT NULL DEFAULT 1,
        effective_from TIMESTAMPTZ NOT NULL,
        effective_to TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'draft',
        lines_of_business TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        product_scope TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        territories TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        binding_authority_amount_minor NUMERIC NOT NULL,
        binding_authority_currency TEXT NOT NULL,
        settlement_terms JSONB NOT NULL DEFAULT '{}',
        document_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        approval_workflow_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_distribution_agreements_carrier_distributor_status
      ON distribution_agreements(carrier_organization_id, distributor_organization_id, status);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_distribution_agreements_tenant_status
      ON distribution_agreements(tenant_id, status);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_distribution_agreements_status_dates
      ON distribution_agreements(status, effective_from, effective_to);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS distribution_agreements;`);
  }
}
