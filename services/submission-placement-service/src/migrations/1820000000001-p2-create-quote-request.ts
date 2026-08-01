import { MigrationInterface, QueryRunner } from 'typeorm';

export class P2CreateQuoteRequest1820000000001 implements MigrationInterface {
  name = 'P2CreateQuoteRequest1820000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS quote_requests (
        quote_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        submission_id UUID NOT NULL,
        correlation_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ,
        quote_count INT NOT NULL DEFAULT 0,
        carriers_requested UUID[] NOT NULL DEFAULT ARRAY[]::uuid[],
        carriers_responded UUID[] NOT NULL DEFAULT ARRAY[]::uuid[],
        timeout_ms INT NOT NULL DEFAULT 30000,
        subjectivities_snapshot JSONB,
        aml_snapshot JSONB,
        underwriting_snapshot JSONB,
        selection_criteria JSONB,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_quote_requests_tenant ON quote_requests(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_quote_requests_submission ON quote_requests(submission_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_quote_requests_correlation ON quote_requests(correlation_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS quote_responses (
        quote_response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        quote_request_id UUID NOT NULL,
        submission_id UUID NOT NULL,
        carrier_organization_id UUID NOT NULL,
        carrier_connector_id UUID,
        status TEXT NOT NULL DEFAULT 'pending',
        received_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        premium_amount_minor NUMERIC(24,0) NOT NULL,
        premium_currency TEXT NOT NULL DEFAULT 'IRR',
        base_premium_minor NUMERIC(24,0),
        taxes_minor NUMERIC(24,0),
        fees_minor NUMERIC(24,0),
        deductible_amount_minor NUMERIC(24,0),
        coverage_snapshot JSONB,
        quote_snapshot JSONB NOT NULL DEFAULT '{}',
        rank_score NUMERIC(24,6),
        comparison_factors JSONB,
        commission_rate_bps INT,
        commission_amount_minor NUMERIC(24,0),
        markup_amount_minor NUMERIC(24,0) NOT NULL DEFAULT 0,
        is_selected BOOLEAN NOT NULL DEFAULT false,
        selected_at TIMESTAMPTZ,
        idempotency_key TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_quote_responses_tenant ON quote_responses(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_quote_responses_quote_request ON quote_responses(quote_request_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_quote_responses_submission ON quote_responses(submission_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_quote_responses_carrier ON quote_responses(carrier_organization_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_quote_responses_status ON quote_responses(status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_quote_responses_selected ON quote_responses(is_selected);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_responses_idempotency ON quote_responses(idempotency_key) WHERE idempotency_key IS NOT NULL;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS quote_errors (
        quote_error_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        quote_request_id UUID NOT NULL,
        submission_id UUID NOT NULL,
        carrier_organization_id UUID NOT NULL,
        carrier_connector_id UUID,
        connector_type TEXT,
        error_code TEXT NOT NULL,
        error_message TEXT,
        error_detail JSONB,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_quote_errors_quote_request ON quote_errors(quote_request_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_quote_errors_submission ON quote_errors(submission_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_quote_errors_carrier ON quote_errors(carrier_organization_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS quote_errors;`);
    await queryRunner.query(`DROP TABLE IF EXISTS quote_responses;`);
    await queryRunner.query(`DROP TABLE IF EXISTS quote_requests;`);
  }
}
