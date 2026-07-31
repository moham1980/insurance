import { MigrationInterface, QueryRunner } from 'typeorm';

export class P3CreatePolicyDocument1830000000003 implements MigrationInterface {
  name = 'P3CreatePolicyDocument1830000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS policy_documents (
        policy_document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT,
        policy_id UUID NOT NULL,
        document_type TEXT NOT NULL,
        storage_ref TEXT NOT NULL,
        checksum TEXT,
        digest TEXT,
        signed_by TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_policy_documents_policy_id ON policy_documents(policy_id);
      CREATE INDEX IF EXISTS idx_policy_documents_policy_type ON policy_documents(policy_id, document_type);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_policy_documents_policy_type;
      DROP INDEX IF EXISTS idx_policy_documents_policy_id;
      DROP TABLE IF EXISTS policy_documents;
    `);
  }
}
