import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentAiAudit1700000000901 implements MigrationInterface {
  name = 'CreateDocumentAiAudit1700000000901';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_ai.document_ai_audit (
        audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL,
        claim_id UUID,
        correlation_id TEXT,
        input JSONB,
        output JSONB,
        confidence NUMERIC(6,3),
        decision TEXT NOT NULL,
        reason TEXT,
        provider JSONB,
        error_message TEXT,
        error_stack TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_document_ai_audit_decision CHECK (decision IN ('extracted','needs_review','failed'))
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_document_ai_audit_doc_created_at ON document_ai.document_ai_audit(document_id, created_at);`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_document_ai_audit_decision_created_at ON document_ai.document_ai_audit(decision, created_at);`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS document_ai.document_ai_audit;`);
  }
}
