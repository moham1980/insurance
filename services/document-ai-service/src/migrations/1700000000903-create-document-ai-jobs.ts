import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentAiJobs1700000000903 implements MigrationInterface {
  name = 'CreateDocumentAiJobs1700000000903';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_ai.document_ai_jobs (
        job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        dedupe_key text NOT NULL UNIQUE,
        source_topic text NULL,
        source_event_id text NULL,
        document_id uuid NOT NULL,
        claim_id uuid NULL,
        correlation_id text NULL,
        tenant_id text NULL,
        actor_user_id text NULL,
        traceparent text NULL,
        status text NOT NULL DEFAULT 'pending',
        attempt int NOT NULL DEFAULT 0,
        max_attempts int NOT NULL DEFAULT 5,
        next_run_at timestamptz NULL,
        locked_at timestamptz NULL,
        locked_by text NULL,
        last_error_message text NULL,
        last_error_stack text NULL,
        dlq_reason text NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_document_ai_jobs_status_next_run ON document_ai.document_ai_jobs(status, next_run_at)`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_document_ai_jobs_document_created_at ON document_ai.document_ai_jobs(document_id, created_at)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS document_ai.document_ai_jobs');
  }
}
