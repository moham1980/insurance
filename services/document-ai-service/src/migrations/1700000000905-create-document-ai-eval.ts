import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentAiEval1700000000905 implements MigrationInterface {
  name = 'CreateDocumentAiEval1700000000905';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_ai.document_ai_eval_cases (
        case_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        document_id uuid NOT NULL UNIQUE,
        expected jsonb NOT NULL,
        tags text[] NULL,
        enabled boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_document_ai_eval_cases_enabled_created_at ON document_ai.document_ai_eval_cases(enabled, created_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_ai.document_ai_eval_runs (
        run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        status text NOT NULL DEFAULT 'queued',
        params jsonb NULL,
        error_message text NULL,
        error_stack text NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        started_at timestamptz NULL,
        finished_at timestamptz NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_document_ai_eval_runs_status_created_at ON document_ai.document_ai_eval_runs(status, created_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_ai.document_ai_eval_results (
        result_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id uuid NOT NULL,
        case_id uuid NOT NULL,
        document_id uuid NOT NULL,
        expected jsonb NULL,
        actual jsonb NULL,
        score numeric(6,4) NULL,
        diff jsonb NULL,
        error_message text NULL,
        error_stack text NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_document_ai_eval_results_run FOREIGN KEY (run_id) REFERENCES document_ai.document_ai_eval_runs(run_id) ON DELETE CASCADE,
        CONSTRAINT fk_document_ai_eval_results_case FOREIGN KEY (case_id) REFERENCES document_ai.document_ai_eval_cases(case_id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_document_ai_eval_results_run_created_at ON document_ai.document_ai_eval_results(run_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_document_ai_eval_results_case_created_at ON document_ai.document_ai_eval_results(case_id, created_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS document_ai.document_ai_eval_results');
    await queryRunner.query('DROP TABLE IF EXISTS document_ai.document_ai_eval_runs');
    await queryRunner.query('DROP TABLE IF EXISTS document_ai.document_ai_eval_cases');
  }
}
