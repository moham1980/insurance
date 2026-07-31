import { MigrationInterface, QueryRunner } from 'typeorm';

export class P2CreateSubmission1820000000000 implements MigrationInterface {
  name = 'P2CreateSubmission1820000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        broker_tenant_id UUID,
        broker_organization_id UUID NOT NULL,
        broker_license_id UUID,
        party_id UUID NOT NULL,
        product_id UUID NOT NULL,
        product_version INT NOT NULL,
        line_of_business TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        exposure JSONB NOT NULL DEFAULT '{}',
        requested_deductibles JSONB,
        documents JSONB,
        effective_from TIMESTAMPTZ NOT NULL,
        effective_to TIMESTAMPTZ NOT NULL,
        territory TEXT,
        distribution_agreement_id UUID,
        metadata JSONB,
        idempotency_key TEXT,
        created_by TEXT,
        version INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_submissions_tenant ON submissions(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_submissions_broker_org ON submissions(broker_organization_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_submissions_product ON submissions(product_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_submissions_party ON submissions(party_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(tenant_id, status);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_idempotency ON submissions(idempotency_key) WHERE idempotency_key IS NOT NULL;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coverage_requests (
        coverage_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        submission_id UUID NOT NULL,
        product_coverage_id UUID NOT NULL,
        coverage_code TEXT NOT NULL,
        coverage_name_fa TEXT,
        requested_limit_amount_minor NUMERIC(24,0),
        currency TEXT NOT NULL DEFAULT 'IRR',
        terms JSONB,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_coverage_requests_submission ON coverage_requests(submission_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_coverage_requests_product_coverage ON coverage_requests(product_coverage_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_refs (
        document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        submission_id UUID NOT NULL,
        quote_response_id UUID,
        document_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'required',
        storage_ref TEXT,
        metadata JSONB,
        validated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_document_refs_submission ON document_refs(submission_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_document_refs_quote ON document_refs(quote_response_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS document_refs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS coverage_requests;`);
    await queryRunner.query(`DROP TABLE IF EXISTS submissions;`);
  }
}
