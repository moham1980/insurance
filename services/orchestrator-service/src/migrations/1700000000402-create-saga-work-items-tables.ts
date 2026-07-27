import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSagaWorkItemsTables1700000000402 implements MigrationInterface {
  name = 'CreateSagaWorkItemsTables1700000000402';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS saga_instances (
        saga_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        saga_type TEXT NOT NULL,
        status TEXT NOT NULL,
        correlation_id TEXT NOT NULL,
        claim_id UUID,
        policy_id UUID,
        current_step TEXT NOT NULL,
        completed_steps TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        context JSONB,
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_saga_instances_type_status ON saga_instances(saga_type, status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_saga_instances_correlation_id ON saga_instances(correlation_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_saga_instances_created_at ON saga_instances(created_at);`);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_item_status') THEN
          CREATE TYPE work_item_status AS ENUM ('pending', 'in_progress', 'approved', 'rejected', 'escalated', 'completed');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS work_items (
        work_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        saga_id UUID NOT NULL,
        step_name TEXT NOT NULL,
        work_item_type TEXT NOT NULL,
        status work_item_status NOT NULL DEFAULT 'pending',
        claim_id UUID,
        policy_id UUID,
        assigned_to TEXT,
        priority TEXT NOT NULL DEFAULT 'medium',
        context JSONB,
        decision_notes TEXT,
        decided_by TEXT,
        due_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_work_items_saga_id ON work_items(saga_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_work_items_tenant_id ON work_items(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_work_items_status_created_at ON work_items(status, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_work_items_assigned_to ON work_items(assigned_to);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS work_items;`);
    await queryRunner.query(`DROP TABLE IF EXISTS saga_instances;`);
    await queryRunner.query(`DROP TYPE IF EXISTS work_item_status;`);
  }
}
