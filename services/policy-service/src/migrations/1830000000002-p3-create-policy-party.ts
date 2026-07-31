import { MigrationInterface, QueryRunner } from 'typeorm';

export class P3CreatePolicyParty1830000000002 implements MigrationInterface {
  name = 'P3CreatePolicyParty1830000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS policy_parties (
        policy_party_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT,
        policy_id UUID NOT NULL,
        party_id UUID NOT NULL,
        role TEXT NOT NULL,
        allocation NUMERIC DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_policy_parties_policy_id ON policy_parties(policy_id);
      CREATE INDEX IF NOT EXISTS idx_policy_parties_policy_role ON policy_parties(policy_id, role);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_policy_parties_policy_role;
      DROP INDEX IF EXISTS idx_policy_parties_policy_id;
      DROP TABLE IF EXISTS policy_parties;
    `);
  }
}
