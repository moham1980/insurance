import { MigrationInterface, QueryRunner } from 'typeorm';

export class P1DistributionAgreementLifecycle1810000000000 implements MigrationInterface {
  name = 'P1DistributionAgreementLifecycle1810000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE distribution_agreements
      ADD COLUMN IF NOT EXISTS binding_authority_profile_id UUID,
      ADD COLUMN IF NOT EXISTS version_chain_id UUID,
      ADD COLUMN IF NOT EXISTS previous_agreement_id UUID;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_distribution_agreements_profile ON distribution_agreements(binding_authority_profile_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_distribution_agreements_chain ON distribution_agreements(version_chain_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS binding_authority_profiles (
        profile_id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL,
        carrier_organization_id UUID NOT NULL,
        line_of_business TEXT NOT NULL,
        per_risk_amount_minor NUMERIC NOT NULL,
        per_occurrence_amount_minor NUMERIC NOT NULL,
        aggregate_amount_minor NUMERIC NOT NULL,
        currency TEXT NOT NULL,
        auto_bind BOOLEAN NOT NULL DEFAULT false,
        referral_threshold_amount_minor NUMERIC,
        referral_threshold_currency TEXT,
        effective_from TIMESTAMPTZ NOT NULL,
        effective_to TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'draft',
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_binding_profiles_tenant ON binding_authority_profiles(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_binding_profiles_carrier ON binding_authority_profiles(carrier_organization_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS agreement_approvals (
        approval_id UUID PRIMARY KEY,
        agreement_id UUID NOT NULL,
        tenant_id UUID NOT NULL,
        approver_organization_id UUID,
        approver_user_id TEXT,
        decision TEXT NOT NULL,
        reason TEXT,
        conditions JSONB,
        authority_profile_snapshot JSONB,
        approved_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_agreement_approvals_agreement ON agreement_approvals(agreement_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS agreement_approvals;`);
    await queryRunner.query(`DROP TABLE IF EXISTS binding_authority_profiles;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_distribution_agreements_profile;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_distribution_agreements_chain;`);
    await queryRunner.query(`
      ALTER TABLE distribution_agreements
      DROP COLUMN IF EXISTS binding_authority_profile_id,
      DROP COLUMN IF EXISTS version_chain_id,
      DROP COLUMN IF EXISTS previous_agreement_id;
    `);
  }
}
