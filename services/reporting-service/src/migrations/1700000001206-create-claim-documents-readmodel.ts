import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClaimDocumentsReadmodel1700000001206 implements MigrationInterface {
  name = 'CreateClaimDocumentsReadmodel1700000001206';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rm_claim_documents_attached (
        claim_id TEXT PRIMARY KEY,
        documents_count INT NOT NULL DEFAULT 0,
        types_summary JSONB,
        last_document_id TEXT,
        last_attached_at TIMESTAMPTZ,
        last_event_id UUID,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_claim_documents_attached_updated_at ON rm_claim_documents_attached(updated_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_claim_documents_attached_last_attached_at ON rm_claim_documents_attached(last_attached_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS rm_claim_documents_attached;`);
  }
}
