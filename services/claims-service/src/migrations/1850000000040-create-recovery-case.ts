import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecoveryCase1850000000040 implements MigrationInterface {
  name = 'CreateRecoveryCase1850000000040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS recovery_cases (
        recovery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        claim_id UUID NOT NULL,
        responsible_party_id UUID,
        expected_recovery_amount NUMERIC NOT NULL,
        expected_recovery_currency TEXT NOT NULL DEFAULT 'IRR',
        recovered_amount NUMERIC NOT NULL DEFAULT 0,
        recovered_currency TEXT NOT NULL DEFAULT 'IRR',
        status TEXT NOT NULL DEFAULT 'open',
        journal_entry_id UUID,
        recovery_metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_recovery_cases_claim_id ON recovery_cases(claim_id);
      CREATE INDEX IF NOT EXISTS idx_recovery_cases_responsible_party_id ON recovery_cases(responsible_party_id);
      CREATE INDEX IF NOT EXISTS idx_recovery_cases_tenant_id ON recovery_cases(tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS recovery_cases;`);
  }
}
