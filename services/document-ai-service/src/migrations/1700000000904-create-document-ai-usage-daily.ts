import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentAiUsageDaily1700000000904 implements MigrationInterface {
  name = 'CreateDocumentAiUsageDaily1700000000904';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_ai.document_ai_usage_daily (
        usage_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        usage_date date NOT NULL,
        jobs_started int NOT NULL DEFAULT 0,
        jobs_completed int NOT NULL DEFAULT 0,
        jobs_failed int NOT NULL DEFAULT 0,
        ai_requests int NOT NULL DEFAULT 0,
        approx_input_chars int NOT NULL DEFAULT 0,
        approx_output_chars int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_document_ai_usage_daily UNIQUE (tenant_id, usage_date)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_document_ai_usage_daily_tenant_date ON document_ai.document_ai_usage_daily(tenant_id, usage_date)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS document_ai.document_ai_usage_daily');
  }
}
