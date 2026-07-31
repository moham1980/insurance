import { MigrationInterface, QueryRunner } from 'typeorm';

export class P3LedgerTables1830000000030 implements MigrationInterface {
  name = 'P3LedgerTables1830000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS brokerage_ledger_accounts (
        account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        organization_id UUID NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        currency TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        parent_account_id UUID,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_brokerage_ledger_accounts_tenant_org_code
        ON brokerage_ledger_accounts(tenant_id, organization_id, code);
      CREATE INDEX IF NOT EXISTS idx_brokerage_ledger_accounts_type ON brokerage_ledger_accounts(type);

      CREATE TABLE IF NOT EXISTS brokerage_journal_entries (
        journal_entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        organization_id UUID NOT NULL,
        source_type TEXT NOT NULL,
        source_id UUID NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        posting_date TIMESTAMPTZ NOT NULL,
        period_id UUID NOT NULL,
        status TEXT DEFAULT 'posted',
        reversal_of_journal_entry_id UUID,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_brokerage_journal_entries_tenant_org ON brokerage_journal_entries(tenant_id, organization_id);
      CREATE INDEX IF NOT EXISTS idx_brokerage_journal_entries_source ON brokerage_journal_entries(source_type, source_id);

      CREATE TABLE IF NOT EXISTS brokerage_journal_lines (
        journal_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        journal_entry_id UUID NOT NULL,
        account_id UUID NOT NULL,
        debit_amount NUMERIC DEFAULT 0,
        debit_currency TEXT DEFAULT 'IRR',
        credit_amount NUMERIC DEFAULT 0,
        credit_currency TEXT DEFAULT 'IRR',
        dimensions JSONB,
        description TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_brokerage_journal_lines_entry_id ON brokerage_journal_lines(journal_entry_id);
      CREATE INDEX IF NOT EXISTS idx_brokerage_journal_lines_account_id ON brokerage_journal_lines(account_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_brokerage_journal_lines_account_id;
      DROP INDEX IF EXISTS idx_brokerage_journal_lines_entry_id;
      DROP TABLE IF EXISTS brokerage_journal_lines;
      DROP INDEX IF EXISTS idx_brokerage_journal_entries_source;
      DROP INDEX IF EXISTS idx_brokerage_journal_entries_tenant_org;
      DROP TABLE IF EXISTS brokerage_journal_entries;
      DROP INDEX IF EXISTS idx_brokerage_ledger_accounts_type;
      DROP INDEX IF EXISTS idx_brokerage_ledger_accounts_tenant_org_code;
      DROP TABLE IF EXISTS brokerage_ledger_accounts;
    `);
  }
}
