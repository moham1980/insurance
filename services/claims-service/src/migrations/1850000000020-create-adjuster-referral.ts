import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdjusterReferral1850000000020 implements MigrationInterface {
  name = 'CreateAdjusterReferral1850000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS adjuster_referrals (
        referral_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        claim_id UUID NOT NULL,
        case_id UUID NOT NULL,
        adjuster_organization_id UUID NOT NULL,
        adjuster_party_id UUID NOT NULL,
        referral_date TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        estimated_fee_amount NUMERIC,
        estimated_fee_currency TEXT NOT NULL DEFAULT 'IRR',
        report_ref TEXT,
        report_checksum TEXT,
        report_received_at TIMESTAMPTZ,
        report_metadata JSONB,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_adjuster_referrals_claim_id ON adjuster_referrals(claim_id);
      CREATE INDEX IF NOT EXISTS idx_adjuster_referrals_case_id ON adjuster_referrals(case_id);
      CREATE INDEX IF NOT EXISTS idx_adjuster_referrals_adjuster_organization_id ON adjuster_referrals(adjuster_organization_id);
      CREATE INDEX IF NOT EXISTS idx_adjuster_referrals_adjuster_party_id ON adjuster_referrals(adjuster_party_id);
      CREATE INDEX IF NOT EXISTS idx_adjuster_referrals_tenant_id ON adjuster_referrals(tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS adjuster_referrals;`);
  }
}
