import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceMatchingFields1760000000513 implements MigrationInterface {
  name = 'AddInvoiceMatchingFields1760000000513';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE re_reconciliations
      ADD COLUMN IF NOT EXISTS external_invoice_number TEXT NULL,
      ADD COLUMN IF NOT EXISTS external_invoice_date DATE NULL,
      ADD COLUMN IF NOT EXISTS external_invoice_amount NUMERIC NULL,
      ADD COLUMN IF NOT EXISTS external_invoice_currency TEXT NULL,
      ADD COLUMN IF NOT EXISTS received_from TEXT NULL,
      ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS match_confidence NUMERIC NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE re_reconciliations
      DROP COLUMN IF EXISTS external_invoice_number,
      DROP COLUMN IF EXISTS external_invoice_date,
      DROP COLUMN IF EXISTS external_invoice_amount,
      DROP COLUMN IF EXISTS external_invoice_currency,
      DROP COLUMN IF EXISTS received_from,
      DROP COLUMN IF EXISTS matched_at,
      DROP COLUMN IF EXISTS match_confidence
    `);
  }
}
