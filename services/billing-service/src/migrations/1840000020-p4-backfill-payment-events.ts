import { MigrationInterface, QueryRunner } from 'typeorm';

export class P4BackfillPaymentEvents1840000020 implements MigrationInterface {
  name = 'P4BackfillPaymentEvents1840000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Backfill old payment_transactions with default state values for P4 state machine
    await queryRunner.query(`
      UPDATE payment_transactions
      SET payment_state = CASE
        WHEN status = 'SUCCESS' THEN 'SETTLED'
        WHEN status = 'FAILED' THEN 'FAILED'
        WHEN status = 'CANCELLED' THEN 'CANCELLED'
        ELSE 'INITIATED'
      END,
      rail = COALESCE(rail, 'PAYA'),
      source_account = COALESCE(source_account, ''),
      destination_account_ref = COALESCE(destination_account_ref, 'insurance-premium-clearing')
      WHERE payment_state IS NULL;
    `);

    // Backfill old premium invoices from legacy Invoice table (best-effort)
    await queryRunner.query(`
      INSERT INTO premium_invoices (
        invoice_id, tenant_id, organization_id, policy_id, customer_party_id,
        invoice_number, issue_date, due_date, total_premium_amount_minor,
        total_premium_currency, taxes_amount_minor, taxes_currency, fees,
        total_amount_minor, total_amount_currency, currency, status,
        paid_amount_minor, paid_amount_currency, paid_at, metadata
      )
      SELECT
        id, tenant_id, tenant_id, COALESCE(policy_id, '00000000-0000-0000-0000-000000000000'),
        COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'),
        invoice_number, created_at, due_date,
        amount::text, 'IRR', tax_amount::text, 'IRR', '[]',
        (amount + tax_amount)::text, 'IRR', 'IRR',
        CASE
          WHEN status = 'PAID' THEN 'paid'
          WHEN status = 'CANCELLED' THEN 'cancelled'
          WHEN status = 'OVERDUE' THEN 'overdue'
          ELSE 'issued'
        END,
        paid_amount::text, 'IRR', paid_at, metadata
      FROM invoices
      WHERE NOT EXISTS (
        SELECT 1 FROM premium_invoices pi WHERE pi.invoice_id = invoices.id
      );
    `);

    // Backfill one default premium_invoice_line per migrated invoice
    await queryRunner.query(`
      INSERT INTO premium_invoice_lines (
        line_id, invoice_id, line_number, line_type, description,
        amount_minor, currency, tax_amount_minor
      )
      SELECT
        gen_random_uuid(), pi.invoice_id, 1, 'PREMIUM', 'Legacy premium',
        pi.total_premium_amount_minor, pi.currency, pi.taxes_amount_minor
      FROM premium_invoices pi
      LEFT JOIN premium_invoice_lines pil ON pi.invoice_id = pil.invoice_id
      WHERE pil.line_id IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reversible only for state columns, not for migrated rows
    await queryRunner.query(`
      UPDATE payment_transactions
      SET payment_state = NULL,
          rail = NULL,
          source_account = NULL,
          destination_account_ref = NULL
      WHERE payment_state IS NOT NULL;
    `);
  }
}
