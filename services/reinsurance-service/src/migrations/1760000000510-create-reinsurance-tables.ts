import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReinsuranceTables1760000000510 implements MigrationInterface {
  name = 'CreateReinsuranceTables1760000000510';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS re_treaties (
        treaty_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        treaty_number TEXT NOT NULL,
        reinsurer_name TEXT NOT NULL,
        treaty_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        effective_from DATE NOT NULL,
        effective_to DATE,
        currency TEXT NOT NULL DEFAULT 'IRR',
        terms JSONB,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_re_treaties_type CHECK (treaty_type IN ('proportional','non_proportional')),
        CONSTRAINT chk_re_treaties_status CHECK (status IN ('draft','active','closed'))
      );
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_re_treaties_treaty_number ON re_treaties(treaty_number);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_treaties_status_created_at ON re_treaties(status, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_treaties_reinsurer ON re_treaties(reinsurer_name);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS re_cessions (
        cession_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        treaty_id UUID NOT NULL,
        policy_id TEXT,
        risk_id TEXT,
        sum_insured NUMERIC(18,2),
        premium NUMERIC(18,2),
        cession_percent NUMERIC(6,3),
        ceded_amount NUMERIC(18,2),
        status TEXT NOT NULL DEFAULT 'pending',
        notes TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_re_cessions_status CHECK (status IN ('pending','approved','settled','rejected')),
        CONSTRAINT fk_re_cessions_treaty FOREIGN KEY (treaty_id) REFERENCES re_treaties(treaty_id) ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_cessions_treaty_created_at ON re_cessions(treaty_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_cessions_status_created_at ON re_cessions(status, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_cessions_policy_id ON re_cessions(policy_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS re_statements (
        statement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        treaty_id UUID NOT NULL,
        statement_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        totals JSONB,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_re_statements_type CHECK (statement_type IN ('bordereau','settlement')),
        CONSTRAINT chk_re_statements_status CHECK (status IN ('draft','issued','settled','canceled')),
        CONSTRAINT fk_re_statements_treaty FOREIGN KEY (treaty_id) REFERENCES re_treaties(treaty_id) ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_statements_treaty_created_at ON re_statements(treaty_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_statements_status_created_at ON re_statements(status, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_statements_period ON re_statements(period_start, period_end);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS re_reconciliations (
        reconciliation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        statement_id UUID NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        summary TEXT,
        details JSONB,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_re_reconciliations_status CHECK (status IN ('open','matched','disputed','closed')),
        CONSTRAINT fk_re_reconciliations_statement FOREIGN KEY (statement_id) REFERENCES re_statements(statement_id) ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_reconciliations_statement_created_at ON re_reconciliations(statement_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_reconciliations_status_created_at ON re_reconciliations(status, created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS re_reconciliations;`);
    await queryRunner.query(`DROP TABLE IF EXISTS re_statements;`);
    await queryRunner.query(`DROP TABLE IF EXISTS re_cessions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS re_treaties;`);
  }
}
