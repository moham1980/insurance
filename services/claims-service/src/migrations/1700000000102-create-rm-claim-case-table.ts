import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRmClaimCaseTable1700000000102 implements MigrationInterface {
  name = 'CreateRmClaimCaseTable1700000000102';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rm_claim_cases (
        rm_claim_case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        claim_id UUID NOT NULL,
        claim_number TEXT NOT NULL,
        claimant_party_id UUID NOT NULL,
        policy_id UUID NOT NULL,
        loss_date TIMESTAMPTZ NOT NULL,
        loss_type TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'registered',
        assessed_amount NUMERIC,
        approved_amount NUMERIC,
        paid_amount NUMERIC,
        requires_human_triage BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rm_claim_cases_claim_id ON rm_claim_cases(claim_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rm_claim_cases_claim_number ON rm_claim_cases(claim_number);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rm_claim_cases_status_updated_at ON rm_claim_cases(status, updated_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS rm_claim_cases;`);
  }
}
