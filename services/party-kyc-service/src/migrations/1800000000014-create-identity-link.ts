import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdentityLink1800000000014 implements MigrationInterface {
  name = 'CreateIdentityLink1800000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS identity_links (
        link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        global_subject_id UUID NOT NULL,
        tenant_id TEXT NOT NULL,
        local_party_id UUID NOT NULL,
        verification_level TEXT NOT NULL DEFAULT 'none',
        linked_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_identity_links_global_tenant_party
      ON identity_links(global_subject_id, tenant_id, local_party_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_identity_links_tenant_party
      ON identity_links(tenant_id, local_party_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS identity_links;`);
  }
}
