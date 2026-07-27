import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSagaSteps1760000000800 implements MigrationInterface {
  name = 'CreateSagaSteps1760000000800';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS saga_steps (
        step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        saga_id UUID NOT NULL,
        step_name TEXT NOT NULL,
        step_order INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        input_payload JSONB,
        output_payload JSONB,
        error_message TEXT,
        error_code TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        compensated_at TIMESTAMPTZ,
        duration_ms INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_saga_steps_saga_id ON saga_steps(saga_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_saga_steps_tenant_id ON saga_steps(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_saga_steps_step_name ON saga_steps(step_name);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_saga_steps_status_started ON saga_steps(status, started_at);`);
    await queryRunner.query(`ALTER TABLE saga_steps ADD CONSTRAINT fk_saga_steps_saga_id FOREIGN KEY (saga_id) REFERENCES saga_instances(saga_id) ON DELETE CASCADE;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_saga_steps_status_started;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_saga_steps_step_name;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_saga_steps_saga_id;`);
    await queryRunner.query(`DROP TABLE IF EXISTS saga_steps;`);
  }
}
