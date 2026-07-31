import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentOcrColumns1700000000906 implements MigrationInterface {
  name = 'AddDocumentOcrColumns1700000000906';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA || 'document_ai';

    const tableExists = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = 'documents') as exists`
    );

    if (!tableExists?.[0]?.exists) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.documents (
          document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          claim_id UUID NOT NULL,
          document_type TEXT NOT NULL DEFAULT 'unknown',
          file_name TEXT NOT NULL,
          storage_ref TEXT NOT NULL,
          mime_type TEXT,
          file_size INTEGER,
          extracted_text TEXT,
          redacted_text TEXT,
          redacted_spans JSONB,
          extracted_fields JSONB,
          classification_confidence DOUBLE PRECISION,
          confirmation_status TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_documents_claim_id ON ${schema}.documents(claim_id);`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_documents_status_created_at ON ${schema}.documents(status, created_at);`);
    } else {
      await queryRunner.query(`ALTER TABLE ${schema}.documents ADD COLUMN IF NOT EXISTS redacted_text TEXT;`);
      await queryRunner.query(`ALTER TABLE ${schema}.documents ADD COLUMN IF NOT EXISTS redacted_spans JSONB;`);
      await queryRunner.query(`ALTER TABLE ${schema}.documents ADD COLUMN IF NOT EXISTS classification_confidence DOUBLE PRECISION;`);
      await queryRunner.query(`ALTER TABLE ${schema}.documents ADD COLUMN IF NOT EXISTS confirmation_status TEXT;`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA || 'document_ai';
    await queryRunner.query(`ALTER TABLE ${schema}.documents DROP COLUMN IF EXISTS redacted_text;`);
    await queryRunner.query(`ALTER TABLE ${schema}.documents DROP COLUMN IF EXISTS redacted_spans;`);
    await queryRunner.query(`ALTER TABLE ${schema}.documents DROP COLUMN IF EXISTS classification_confidence;`);
    await queryRunner.query(`ALTER TABLE ${schema}.documents DROP COLUMN IF EXISTS confirmation_status;`);
  }
}
