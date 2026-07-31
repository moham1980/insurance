import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClaimAdvocacyCase1850000000010 implements MigrationInterface {
  name = 'CreateClaimAdvocacyCase1850000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS claim_advocacy_cases (
        case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        broker_organization_id UUID NOT NULL,
        claim_id UUID NOT NULL,
        customer_party_id UUID NOT NULL,
        carrier_organization_id UUID NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        priority TEXT NOT NULL DEFAULT 'medium',
        assigned_party_id UUID,
        escalation_reason TEXT,
        opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        closed_at TIMESTAMPTZ,
        case_metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_claim_advocacy_cases_claim_id ON claim_advocacy_cases(claim_id);
      CREATE INDEX IF NOT EXISTS idx_claim_advocacy_cases_broker_organization_id ON claim_advocacy_cases(broker_organization_id);
      CREATE INDEX IF NOT EXISTS idx_claim_advocacy_cases_customer_party_id ON claim_advocacy_cases(customer_party_id);
      CREATE INDEX IF NOT EXISTS idx_claim_advocacy_cases_tenant_id ON claim_advocacy_cases(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_claim_advocacy_cases_status ON claim_advocacy_cases(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS claim_advocacy_cases;`);
  }
}
