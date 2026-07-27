import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePolicyTables1700000000401 implements MigrationInterface {
  name = 'CreatePolicyTables1700000000401';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS policies (
        policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        policy_number TEXT NOT NULL,
        unique_code TEXT,
        status TEXT NOT NULL DEFAULT 'inquiry',
        party_id UUID NOT NULL,
        line_of_business TEXT NOT NULL,
        start_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ NOT NULL,
        premium_amount NUMERIC NOT NULL,
        coverages JSONB,
        deductibles JSONB,
        installments JSONB,
        application_data JSONB,
        risk_assessment JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_policies_policy_number ON policies(policy_number);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_policies_unique_code ON policies(unique_code) WHERE unique_code IS NOT NULL;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policies_party_id ON policies(party_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policies_status_updated_at ON policies(status, updated_at);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS policy_changes (
        change_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        policy_id UUID NOT NULL,
        type TEXT NOT NULL,
        actor_user_id TEXT,
        payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policy_changes_policy_created_at ON policy_changes(policy_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policy_changes_type_created_at ON policy_changes(type, created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS policy_changes;`);
    await queryRunner.query(`DROP TABLE IF EXISTS policies;`);
  }
}
