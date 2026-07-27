import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditArchive1700000000900 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_archive (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_table VARCHAR(100) NOT NULL,
        original_id UUID NOT NULL,
        tenant_id UUID NOT NULL,
        actor_user_id UUID,
        action VARCHAR(50) NOT NULL,
        resource_type VARCHAR(100),
        resource_id VARCHAR(100),
        status VARCHAR(50),
        request_data JSONB,
        response_data JSONB,
        error_data JSONB,
        correlation_id VARCHAR(100),
        created_at TIMESTAMP NOT NULL,
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        retention_until TIMESTAMP NOT NULL
      );

      CREATE INDEX idx_audit_archive_tenant_id ON audit_archive(tenant_id);
      CREATE INDEX idx_audit_archive_original_table ON audit_archive(original_table);
      CREATE INDEX idx_audit_archive_archived_at ON audit_archive(archived_at);
      CREATE INDEX idx_audit_archive_retention_until ON audit_archive(retention_until);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_archive`);
  }
}
