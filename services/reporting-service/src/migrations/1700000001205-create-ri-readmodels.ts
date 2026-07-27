import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRiReadmodels1700000001205 implements MigrationInterface {
  name = 'CreateRiReadmodels1700000001205';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rm_ri_ceded (
        ri_key TEXT PRIMARY KEY,
        contract_id UUID NOT NULL,
        policy_id TEXT,
        claim_id TEXT,
        calculation_basis TEXT NOT NULL,
        gross_amount NUMERIC(18,2),
        ceded_amount NUMERIC(18,2),
        retained_amount NUMERIC(18,2),
        currency TEXT,
        counterparty_id TEXT,
        occurred_at TIMESTAMPTZ,
        last_event_id UUID,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_ri_ceded_contract_updated_at ON rm_ri_ceded(contract_id, updated_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_ri_ceded_policy_updated_at ON rm_ri_ceded(policy_id, updated_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_ri_ceded_claim_updated_at ON rm_ri_ceded(claim_id, updated_at);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rm_ri_borderaux (
        borderaux_id UUID PRIMARY KEY,
        contract_id UUID NOT NULL,
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        items_count INT NOT NULL,
        document_id TEXT,
        occurred_at TIMESTAMPTZ,
        last_event_id UUID,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_ri_borderaux_contract_updated_at ON rm_ri_borderaux(contract_id, updated_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_ri_borderaux_period ON rm_ri_borderaux(period_start, period_end);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rm_ri_recoveries (
        recovery_id UUID PRIMARY KEY,
        claim_id TEXT NOT NULL,
        contract_id UUID NOT NULL,
        counterparty_id TEXT,
        recoverable_amount NUMERIC(18,2),
        recovered_amount NUMERIC(18,2),
        currency TEXT,
        identified_at TIMESTAMPTZ,
        received_at TIMESTAMPTZ,
        occurred_at TIMESTAMPTZ,
        last_event_id UUID,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_ri_recoveries_contract_updated_at ON rm_ri_recoveries(contract_id, updated_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_ri_recoveries_claim_updated_at ON rm_ri_recoveries(claim_id, updated_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_ri_recoveries_identified_at ON rm_ri_recoveries(identified_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_ri_recoveries_received_at ON rm_ri_recoveries(received_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS rm_ri_recoveries;`);
    await queryRunner.query(`DROP TABLE IF EXISTS rm_ri_borderaux;`);
    await queryRunner.query(`DROP TABLE IF EXISTS rm_ri_ceded;`);
  }
}
