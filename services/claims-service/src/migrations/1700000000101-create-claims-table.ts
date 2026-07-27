import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClaimsTable1700000000101 implements MigrationInterface {
  name = 'CreateClaimsTable1700000000101';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS claims (
        claim_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        claim_number TEXT NOT NULL UNIQUE,
        policy_id UUID NOT NULL,
        claimant_party_id UUID NOT NULL,
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
      CREATE INDEX IF NOT EXISTS idx_claims_claim_number ON claims(claim_number);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_claims_policy_id ON claims(policy_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_claims_status_updated_at ON claims(status, updated_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS claims;`);
  }
}
