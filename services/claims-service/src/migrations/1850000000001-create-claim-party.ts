import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClaimParty1850000000001 implements MigrationInterface {
  name = 'CreateClaimParty1850000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS claim_parties (
        claim_party_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        claim_id UUID NOT NULL,
        party_id UUID NOT NULL,
        party_role TEXT NOT NULL,
        role_description TEXT,
        contact_info JSONB,
        consent_record_id UUID,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_claim_parties_claim_id ON claim_parties(claim_id);
      CREATE INDEX IF NOT EXISTS idx_claim_parties_party_id ON claim_parties(party_id);
      CREATE INDEX IF NOT EXISTS idx_claim_parties_tenant_id ON claim_parties(tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS claim_parties;`);
  }
}
