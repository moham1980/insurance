import { MigrationInterface, QueryRunner } from 'typeorm';

export class P3CreateEndorsement1830000000010 implements MigrationInterface {
  name = 'P3CreateEndorsement1830000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS endorsements (
        endorsement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT,
        policy_id UUID NOT NULL,
        endorsement_type TEXT NOT NULL,
        effective_date TIMESTAMPTZ NOT NULL,
        requested_by_party_id UUID NOT NULL,
        approved_by_party_id UUID,
        premium_delta_amount NUMERIC DEFAULT 0,
        premium_delta_currency TEXT DEFAULT 'IRR',
        tax_delta_amount NUMERIC DEFAULT 0,
        tax_delta_currency TEXT DEFAULT 'IRR',
        status TEXT DEFAULT 'draft',
        reason TEXT,
        source_placement_id UUID,
        applied_at TIMESTAMPTZ,
        rejected_at TIMESTAMPTZ,
        rejection_reason TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_endorsements_policy_id ON endorsements(policy_id);
      CREATE INDEX IF NOT EXISTS idx_endorsements_tenant_status ON endorsements(tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_endorsements_effective_date ON endorsements(effective_date);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_endorsements_effective_date;
      DROP INDEX IF EXISTS idx_endorsements_tenant_status;
      DROP INDEX IF EXISTS idx_endorsements_policy_id;
      DROP TABLE IF EXISTS endorsements;
    `);
  }
}
