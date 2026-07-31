import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClaimOwnerFields1850000000000 implements MigrationInterface {
  name = 'AddClaimOwnerFields1850000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE claims
        ADD COLUMN IF NOT EXISTS authoritative_tenant_id UUID,
        ADD COLUMN IF NOT EXISTS record_owner_organization_id UUID,
        ADD COLUMN IF NOT EXISTS carrier_organization_id UUID,
        ADD COLUMN IF NOT EXISTS distribution_organization_id UUID,
        ADD COLUMN IF NOT EXISTS broker_organization_id UUID,
        ADD COLUMN IF NOT EXISTS policy_number TEXT,
        ADD COLUMN IF NOT EXISTS external_claim_id TEXT,
        ADD COLUMN IF NOT EXISTS representative_party_id UUID,
        ADD COLUMN IF NOT EXISTS claim_type TEXT NOT NULL DEFAULT 'first_party',
        ADD COLUMN IF NOT EXISTS reported_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS reserve_amount NUMERIC,
        ADD COLUMN IF NOT EXISTS settlement_amount NUMERIC;
    `);

    await queryRunner.query(`
      UPDATE claims
      SET record_owner_organization_id = tenant_id::uuid,
          carrier_organization_id = tenant_id::uuid,
          authoritative_tenant_id = tenant_id::uuid
      WHERE record_owner_organization_id IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE claims
        ALTER COLUMN authoritative_tenant_id SET NOT NULL,
        ALTER COLUMN record_owner_organization_id SET NOT NULL,
        ALTER COLUMN carrier_organization_id SET NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_claims_carrier_organization_id ON claims(carrier_organization_id);
      CREATE INDEX IF NOT EXISTS idx_claims_distribution_organization_id ON claims(distribution_organization_id);
      CREATE INDEX IF NOT EXISTS idx_claims_broker_organization_id ON claims(broker_organization_id);
      CREATE INDEX IF NOT EXISTS idx_claims_claimant_party_id ON claims(claimant_party_id);
      CREATE INDEX IF NOT EXISTS idx_claims_record_owner_organization_id ON claims(record_owner_organization_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE claims
        DROP COLUMN IF EXISTS authoritative_tenant_id,
        DROP COLUMN IF EXISTS record_owner_organization_id,
        DROP COLUMN IF EXISTS carrier_organization_id,
        DROP COLUMN IF EXISTS distribution_organization_id,
        DROP COLUMN IF EXISTS broker_organization_id,
        DROP COLUMN IF EXISTS policy_number,
        DROP COLUMN IF EXISTS external_claim_id,
        DROP COLUMN IF EXISTS representative_party_id,
        DROP COLUMN IF EXISTS claim_type,
        DROP COLUMN IF EXISTS reported_date,
        DROP COLUMN IF EXISTS reserve_amount,
        DROP COLUMN IF EXISTS settlement_amount;
    `);
  }
}
