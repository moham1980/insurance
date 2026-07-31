import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillDocumentOcr1700000000907 implements MigrationInterface {
  name = 'BackfillDocumentOcr1700000000907';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA || 'document_ai';

    // Populate new OCR columns with safe defaults for existing rows.
    await queryRunner.query(`
      UPDATE ${schema}.documents
      SET redacted_text = COALESCE(redacted_text, extracted_text),
          redacted_spans = COALESCE(redacted_spans, '[]'),
          classification_confidence = COALESCE(classification_confidence, 0),
          confirmation_status = COALESCE(confirmation_status, 'pending')
      WHERE redacted_text IS NULL
         OR redacted_spans IS NULL
         OR classification_confidence IS NULL
         OR confirmation_status IS NULL;
    `);

    // Set NOT NULL where schema requires it (if any). Keep nullable for columns.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op; cannot reliably undo a backfill.
    const _ = queryRunner;
  }
}
