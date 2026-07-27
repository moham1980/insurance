import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStandardAuditFields1700000000902 implements MigrationInterface {
  name = 'AddStandardAuditFields1700000000902';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE document_ai.document_ai_audit ADD COLUMN IF NOT EXISTS tenant_id TEXT;`);
    await queryRunner.query(`ALTER TABLE document_ai.document_ai_audit ADD COLUMN IF NOT EXISTS actor_user_id TEXT;`);
    await queryRunner.query(`ALTER TABLE document_ai.document_ai_audit ADD COLUMN IF NOT EXISTS action TEXT;`);
    await queryRunner.query(`ALTER TABLE document_ai.document_ai_audit ADD COLUMN IF NOT EXISTS status TEXT;`);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_document_ai_audit_tenant_created_at ON document_ai.document_ai_audit(tenant_id, created_at);`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_document_ai_audit_tenant_created_at;`);
    await queryRunner.query(`ALTER TABLE document_ai.document_ai_audit DROP COLUMN IF EXISTS status;`);
    await queryRunner.query(`ALTER TABLE document_ai.document_ai_audit DROP COLUMN IF EXISTS action;`);
    await queryRunner.query(`ALTER TABLE document_ai.document_ai_audit DROP COLUMN IF EXISTS actor_user_id;`);
    await queryRunner.query(`ALTER TABLE document_ai.document_ai_audit DROP COLUMN IF EXISTS tenant_id;`);
  }
}
