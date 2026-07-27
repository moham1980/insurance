import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSalesNetworkTables1700000000600 implements MigrationInterface {
  name = 'CreateSalesNetworkTables1700000000600';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS sales_partners (
      partner_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_unit_id uuid NOT NULL,
      kind text NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      display_name text NOT NULL,
      legal_national_id text,
      license_code text,
      contact_mobile text,
      contact_email text,
      bank_iban text,
      metadata jsonb,
      verified_at timestamptz,
      verified_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_partners_org_unit ON sales_partners(org_unit_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sales_partners_kind_status_updated ON sales_partners(kind, status, updated_at);`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS commission_contracts (
      contract_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_unit_id uuid NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      line_of_business text,
      base text NOT NULL DEFAULT 'premium_gross',
      rate_bps int,
      fixed_fee_amount numeric,
      currency text NOT NULL DEFAULT 'IRR',
      effective_from timestamptz NOT NULL,
      effective_to timestamptz,
      rules jsonb,
      created_by text,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_commission_contracts_org_status_eff ON commission_contracts(org_unit_id, status, effective_from);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_commission_contracts_status_eff ON commission_contracts(status, effective_from);`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS commission_ledger (
      ledger_entry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id text NOT NULL,
      event_type text NOT NULL,
      occurred_at timestamptz NOT NULL,
      org_unit_id uuid NOT NULL,
      policy_id uuid NOT NULL,
      policy_number text,
      line_of_business text,
      premium_amount numeric,
      commission_amount numeric NOT NULL,
      currency text NOT NULL DEFAULT 'IRR',
      contract_id uuid,
      status text NOT NULL DEFAULT 'accrued',
      void_reason text,
      metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_ledger_event_id ON commission_ledger(event_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_commission_ledger_org_created ON commission_ledger(org_unit_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_commission_ledger_policy ON commission_ledger(policy_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_commission_ledger_status_created ON commission_ledger(status, created_at);`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS sales_kpi_daily (
      kpi_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_unit_id uuid NOT NULL,
      day date NOT NULL,
      policies_issued_count int NOT NULL DEFAULT 0,
      premium_issued_amount numeric NOT NULL DEFAULT 0,
      commission_accrued_amount numeric NOT NULL DEFAULT 0,
      currency text NOT NULL DEFAULT 'IRR',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_kpi_daily_org_day ON sales_kpi_daily(org_unit_id, day);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sales_kpi_daily_day ON sales_kpi_daily(day);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sales_kpi_daily;`);
    await queryRunner.query(`DROP TABLE IF EXISTS commission_ledger;`);
    await queryRunner.query(`DROP TABLE IF EXISTS commission_contracts;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sales_partners;`);
  }
}
