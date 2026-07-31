import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdvocacyTask1850000000011 implements MigrationInterface {
  name = 'CreateAdvocacyTask1850000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS advocacy_tasks (
        task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        case_id UUID NOT NULL,
        task_type TEXT NOT NULL,
        assigned_to_party_id UUID NOT NULL,
        due_date TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        outcome TEXT,
        task_metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_advocacy_tasks_case_id ON advocacy_tasks(case_id);
      CREATE INDEX IF NOT EXISTS idx_advocacy_tasks_assigned_to_party_id ON advocacy_tasks(assigned_to_party_id);
      CREATE INDEX IF NOT EXISTS idx_advocacy_tasks_status ON advocacy_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_advocacy_tasks_due_date ON advocacy_tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_advocacy_tasks_tenant_id ON advocacy_tasks(tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS advocacy_tasks;`);
  }
}
