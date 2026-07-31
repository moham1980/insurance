import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClaimDocument1850000000002 implements MigrationInterface {
  name = 'CreateClaimDocument1850000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS claim_documents (
        document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        claim_id UUID NOT NULL,
        case_id UUID,
        uploaded_by_party_id UUID NOT NULL,
        document_type TEXT NOT NULL,
        storage_ref TEXT NOT NULL,
        checksum TEXT NOT NULL,
        file_name TEXT,
        file_size INTEGER,
        mime_type TEXT,
        classification TEXT NOT NULL DEFAULT 'INTERNAL',
        consent_required BOOLEAN NOT NULL DEFAULT false,
        consent_record_id UUID,
        virus_scan_status TEXT NOT NULL DEFAULT 'pending',
        pii_scan_status TEXT NOT NULL DEFAULT 'pending',
        uploaded_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_claim_documents_claim_id ON claim_documents(claim_id);
      CREATE INDEX IF NOT EXISTS idx_claim_documents_case_id ON claim_documents(case_id);
      CREATE INDEX IF NOT EXISTS idx_claim_documents_uploaded_by_party_id ON claim_documents(uploaded_by_party_id);
      CREATE INDEX IF NOT EXISTS idx_claim_documents_tenant_id ON claim_documents(tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS claim_documents;`);
  }
}
