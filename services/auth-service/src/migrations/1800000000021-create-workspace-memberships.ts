import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkspaceMemberships1800000000021 implements MigrationInterface {
  name = 'CreateWorkspaceMemberships1800000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workspace_memberships (
        membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL,
        party_id UUID NOT NULL,
        role TEXT NOT NULL,
        granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workspace_memberships_workspace ON workspace_memberships(workspace_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workspace_memberships_party ON workspace_memberships(party_id);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_memberships_unique
      ON workspace_memberships(workspace_id, party_id) WHERE revoked_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS workspace_memberships;`);
  }
}
