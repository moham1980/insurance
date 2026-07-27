import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateComplaintsTables1700000000311 implements MigrationInterface {
  name = 'CreateComplaintsTables1700000000311';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        complaint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        complaint_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        policy_company_name TEXT,
        policy_number TEXT,
        policy_title TEXT,
        policy_id TEXT,
        claim_id TEXT,
        complainant_national_id TEXT,
        complainant_birth_date DATE,
        complainant_mobile TEXT,
        complainant_address TEXT,
        complainant_representative_status TEXT,
        description TEXT NOT NULL,
        assigned_to TEXT,
        sla_first_response_due_at TIMESTAMPTZ,
        sla_resolution_due_at TIMESTAMPTZ,
        first_response_at TIMESTAMPTZ,
        resolved_at TIMESTAMPTZ,
        escalated_at TIMESTAMPTZ,
        resolution_summary TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_complaints_status_created_at ON complaints(status, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_complaints_type_created_at ON complaints(complaint_type, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_complaints_policy_number ON complaints(policy_number);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_complaints_claim_id ON complaints(claim_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_complaints_national_id ON complaints(complainant_national_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS complaint_attachments (
        complaint_attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        complaint_id UUID NOT NULL,
        document_id TEXT NOT NULL,
        notes TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_complaint_attachments_complaint_created_at ON complaint_attachments(complaint_id, created_at);`
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_complaint_attachments_document_id ON complaint_attachments(document_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS complaint_attachments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS complaints;`);
  }
}
