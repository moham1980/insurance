import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReinsuranceReadModelColumns1700000000502 implements MigrationInterface {
  name = 'AddReinsuranceReadModelColumns1700000000502';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rm_claims_cases (
        claim_id UUID PRIMARY KEY,
        claim_number TEXT NOT NULL,
        policy_id UUID NOT NULL,
        status TEXT NOT NULL,
        loss_date TIMESTAMPTZ,
        loss_type TEXT,
        requires_human_triage BOOLEAN,
        created_at TIMESTAMPTZ,
        last_event_id UUID,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`ALTER TABLE rm_claims_cases ADD COLUMN IF NOT EXISTS ri_contract_id UUID;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases ADD COLUMN IF NOT EXISTS ri_last_recovery_id UUID;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases ADD COLUMN IF NOT EXISTS ri_recoverable_amount NUMERIC(18,2);`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases ADD COLUMN IF NOT EXISTS ri_recovered_amount NUMERIC(18,2);`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases ADD COLUMN IF NOT EXISTS ri_currency TEXT;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases ADD COLUMN IF NOT EXISTS ri_last_identified_at TIMESTAMPTZ;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases ADD COLUMN IF NOT EXISTS ri_last_received_at TIMESTAMPTZ;`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_claims_cases_ri_contract ON rm_claims_cases(ri_contract_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_claims_cases_ri_identified_at ON rm_claims_cases(ri_last_identified_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_claims_cases_ri_received_at ON rm_claims_cases(ri_last_received_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_rm_claims_cases_ri_received_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_rm_claims_cases_ri_identified_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_rm_claims_cases_ri_contract;`);

    await queryRunner.query(`ALTER TABLE rm_claims_cases DROP COLUMN IF EXISTS ri_last_received_at;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases DROP COLUMN IF EXISTS ri_last_identified_at;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases DROP COLUMN IF EXISTS ri_currency;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases DROP COLUMN IF EXISTS ri_recovered_amount;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases DROP COLUMN IF EXISTS ri_recoverable_amount;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases DROP COLUMN IF EXISTS ri_last_recovery_id;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases DROP COLUMN IF EXISTS ri_contract_id;`);
  }
}
