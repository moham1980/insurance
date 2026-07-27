import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000001400 implements MigrationInterface {
  name = 'Init1700000001400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
          CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'cancelled');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_type') THEN
          CREATE TYPE invoice_type AS ENUM ('policy_premium', 'claim_payout', 'commission', 'fee');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entry_status') THEN
          CREATE TYPE entry_status AS ENUM ('draft', 'posted', 'reversed');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
          CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_category') THEN
          CREATE TYPE account_category AS ENUM (
            'current_asset', 'fixed_asset', 'current_liability', 'long_term_liability',
            'owners_equity', 'operating_revenue', 'non_operating_revenue',
            'operating_expense', 'non_operating_expense'
          );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'period_status') THEN
          CREATE TYPE period_status AS ENUM ('open', 'closed', 'locked');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reconciliation_status') THEN
          CREATE TYPE reconciliation_status AS ENUM ('pending', 'matched', 'unmatched', 'manual_review');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_transaction_status') THEN
          CREATE TYPE payment_transaction_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider') THEN
          CREATE TYPE payment_provider AS ENUM ('ZARINPAL', 'IDPAY', 'PAYIR', 'BEHPARDAKHT', 'SAMAN', 'MELLAT', 'PASARGAD', 'ECOSYSTEM');
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        policy_id UUID,
        claim_id UUID,
        customer_id UUID,
        invoice_type invoice_type NOT NULL,
        status invoice_status DEFAULT 'draft',
        amount DECIMAL(15,2) NOT NULL,
        paid_amount DECIMAL(15,2) DEFAULT 0,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        due_date TIMESTAMP NOT NULL,
        paid_at TIMESTAMP,
        line_items JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_invoices_policy ON invoices(policy_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_claim ON invoices(claim_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

      CREATE TABLE IF NOT EXISTS journal_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        entry_number VARCHAR(50) NOT NULL,
        description VARCHAR(100) NOT NULL,
        business_key VARCHAR(100),
        business_type VARCHAR(50),
        entry_date DATE NOT NULL,
        status entry_status DEFAULT 'draft',
        posted_at TIMESTAMP,
        posted_by UUID,
        reversal_entry_number VARCHAR(50),
        lines JSONB,
        total_debit DECIMAL(15,2) NOT NULL,
        total_credit DECIMAL(15,2) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_tenant_number ON journal_entries(tenant_id, entry_number);
      CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_status ON journal_entries(tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_journal_entries_business_key ON journal_entries(business_key);
      CREATE INDEX IF NOT EXISTS idx_journal_entries_posted_at ON journal_entries(posted_at);

      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        account_code VARCHAR(20) NOT NULL UNIQUE,
        account_name VARCHAR(100) NOT NULL,
        description VARCHAR(200),
        account_type account_type NOT NULL,
        category account_category NOT NULL,
        parent_account_code VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        opening_balance DECIMAL(15,2) DEFAULT 0,
        opening_balance_date DATE,
        is_system_account BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_accounts_tenant_code ON accounts(tenant_id, account_code);
      CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);

      CREATE TABLE IF NOT EXISTS financial_periods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        period_name VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status period_status DEFAULT 'open',
        closed_at TIMESTAMP,
        closed_by UUID,
        fiscal_year VARCHAR(50),
        period_number INTEGER,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_financial_periods_tenant_status ON financial_periods(tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_financial_periods_dates ON financial_periods(start_date, end_date);

      CREATE TABLE IF NOT EXISTS cost_centers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(200),
        type VARCHAR(50) NOT NULL,
        parent_id UUID,
        metadata JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID,
        updated_by UUID,
        CONSTRAINT uq_cost_centers_tenant_code UNIQUE (tenant_id, code)
      );

      CREATE INDEX IF NOT EXISTS idx_cost_centers_tenant_active ON cost_centers(tenant_id, is_active);

      CREATE TABLE IF NOT EXISTS reconciliation_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        source_type VARCHAR(50) NOT NULL,
        source_id UUID NOT NULL,
        journal_entry_id UUID,
        expected_amount DECIMAL(15,2) NOT NULL,
        actual_amount DECIMAL(15,2) NOT NULL,
        variance DECIMAL(15,2) NOT NULL,
        status reconciliation_status DEFAULT 'pending',
        details JSONB,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        reconciled_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reconciled_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_reconciliation_tenant_status ON reconciliation_results(tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_reconciliation_source ON reconciliation_results(source_type, source_id);

      CREATE TABLE IF NOT EXISTS outbox_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        occurred_at TIMESTAMPTZ DEFAULT NOW(),
        topic TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_version INTEGER NOT NULL,
        correlation_id TEXT NOT NULL,
        subject_json JSONB NOT NULL,
        payload_json JSONB NOT NULL,
        status TEXT DEFAULT 'pending',
        attempt_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_outbox_status_occurred ON outbox_events(status, occurred_at);
      CREATE INDEX IF NOT EXISTS idx_outbox_correlation ON outbox_events(correlation_id);

      CREATE TABLE IF NOT EXISTS payment_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        invoice_id UUID NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        provider payment_provider NOT NULL,
        authority VARCHAR(255) NOT NULL,
        ref_id VARCHAR(255),
        status payment_transaction_status DEFAULT 'PENDING',
        callback_url TEXT NOT NULL,
        metadata JSONB,
        idempotency_key VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_invoice ON payment_transactions(tenant_id, invoice_id);
      CREATE INDEX IF NOT EXISTS idx_payment_transactions_authority ON payment_transactions(authority);
      CREATE INDEX IF NOT EXISTS idx_payment_transactions_idempotency ON payment_transactions(idempotency_key);

      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        key VARCHAR(255) NOT NULL,
        scope VARCHAR(100) NOT NULL,
        request_hash TEXT,
        response_json JSONB,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_idempotency_keys_tenant_key_scope UNIQUE (tenant_id, key, scope)
      );

      CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);

      CREATE TABLE IF NOT EXISTS auto_deposit_config (
        tenant_id UUID PRIMARY KEY,
        enabled BOOLEAN DEFAULT false,
        check_interval_minutes INTEGER DEFAULT 30,
        tolerance_amount DECIMAL(15,2) DEFAULT 1000,
        require_exact_match BOOLEAN DEFAULT false,
        auto_approve_high_confidence BOOLEAN DEFAULT false,
        bank_providers TEXT[],
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bank_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        account_number VARCHAR(100) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        transaction_date TIMESTAMP NOT NULL,
        reference VARCHAR(255),
        description TEXT,
        sender_name VARCHAR(200),
        sender_account VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        matched_invoice_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_bank_transactions_tenant_status ON bank_transactions(tenant_id, status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS bank_transactions;
      DROP TABLE IF EXISTS auto_deposit_config;
      DROP TABLE IF EXISTS idempotency_keys;
      DROP TABLE IF EXISTS payment_transactions;
      DROP INDEX IF EXISTS idx_outbox_correlation;
      DROP INDEX IF EXISTS idx_outbox_status_occurred;
      DROP TABLE IF EXISTS outbox_events;
      DROP TABLE IF EXISTS reconciliation_results;
      DROP TABLE IF EXISTS cost_centers;
      DROP TABLE IF EXISTS financial_periods;
      DROP TABLE IF EXISTS accounts;
      DROP TABLE IF EXISTS journal_entries;
      DROP INDEX IF EXISTS idx_invoices_due_date;
      DROP INDEX IF EXISTS idx_invoices_customer;
      DROP INDEX IF EXISTS idx_invoices_claim;
      DROP INDEX IF EXISTS idx_invoices_policy;
      DROP INDEX IF EXISTS idx_invoices_tenant_status;
      DROP TABLE IF EXISTS invoices;
      DROP TYPE IF EXISTS payment_provider;
      DROP TYPE IF EXISTS payment_transaction_status;
      DROP TYPE IF EXISTS reconciliation_status;
      DROP TYPE IF EXISTS period_status;
      DROP TYPE IF EXISTS account_category;
      DROP TYPE IF EXISTS account_type;
      DROP TYPE IF EXISTS entry_status;
      DROP TYPE IF EXISTS invoice_type;
      DROP TYPE IF EXISTS invoice_status;
    `);
  }
}
