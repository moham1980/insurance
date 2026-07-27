import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnderwritingRequestTenantAndAudit1700000000603 implements MigrationInterface {
  name = 'AddUnderwritingRequestTenantAndAudit1700000000603';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE underwriting_requests ADD COLUMN IF NOT EXISTS tenant_id UUID;`);
    await queryRunner.query(`UPDATE underwriting_requests SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;`);
    await queryRunner.query(`ALTER TABLE underwriting_requests ALTER COLUMN tenant_id SET NOT NULL;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_underwriting_requests_tenant_status ON underwriting_requests(tenant_id, status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_underwriting_requests_tenant_created_at ON underwriting_requests(tenant_id, created_at);`);

    await queryRunner.query(`ALTER TABLE underwriting_requests ADD COLUMN IF NOT EXISTS assigned_underwriter_id TEXT;`);
    await queryRunner.query(`ALTER TABLE underwriting_requests ADD COLUMN IF NOT EXISTS escalation_reason TEXT;`);
    await queryRunner.query(`ALTER TABLE underwriting_requests ADD COLUMN IF NOT EXISTS source TEXT;`);
    await queryRunner.query(`ALTER TABLE underwriting_requests ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;`);
    await queryRunner.query(`ALTER TABLE underwriting_requests ADD COLUMN IF NOT EXISTS risk_assessment_history JSONB DEFAULT '[]'::jsonb;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE underwriting_requests DROP COLUMN IF EXISTS tenant_id;`);
    await queryRunner.query(`ALTER TABLE underwriting_requests DROP COLUMN IF EXISTS assigned_underwriter_id;`);
    await queryRunner.query(`ALTER TABLE underwriting_requests DROP COLUMN IF EXISTS escalation_reason;`);
    await queryRunner.query(`ALTER TABLE underwriting_requests DROP COLUMN IF EXISTS source;`);
    await queryRunner.query(`ALTER TABLE underwriting_requests DROP COLUMN IF EXISTS version;`);
    await queryRunner.query(`ALTER TABLE underwriting_requests DROP COLUMN IF EXISTS risk_assessment_history;`);
  }
}
