import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrchestratorTenantOutbox1700000000403 implements MigrationInterface {
  name = 'OrchestratorTenantOutbox1700000000403';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tenant isolation for existing deployments that ran the initial migrations
    await queryRunner.query(`
      ALTER TABLE saga_instances
      ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    `);
    await queryRunner.query(`
      ALTER TABLE work_items
      ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    `);
    await queryRunner.query(`
      ALTER TABLE saga_steps
      ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_saga_instances_tenant_id ON saga_instances(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_work_items_tenant_id ON work_items(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_saga_steps_tenant_id ON saga_steps(tenant_id);`);

    // Work item status enum for existing deployments where the column is still TEXT
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_item_status') THEN
          CREATE TYPE work_item_status AS ENUM ('pending', 'in_progress', 'approved', 'rejected', 'escalated', 'completed');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'work_items' AND column_name = 'status' AND data_type = 'text'
        ) THEN
          ALTER TABLE work_items ALTER COLUMN status TYPE work_item_status USING status::work_item_status;
        END IF;
      END $$;
    `);

    // Outbox event table for reliable saga event publishing
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS outbox_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        topic TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_version INTEGER NOT NULL,
        correlation_id TEXT NOT NULL,
        subject_json JSONB NOT NULL,
        payload_json JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempt_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_outbox_events_status_occurred_at ON outbox_events(status, occurred_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_outbox_events_correlation_id ON outbox_events(correlation_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS outbox_events;`);

    await queryRunner.query(`ALTER TABLE work_items DROP COLUMN IF EXISTS tenant_id;`);
    await queryRunner.query(`ALTER TABLE saga_steps DROP COLUMN IF EXISTS tenant_id;`);
    await queryRunner.query(`ALTER TABLE saga_instances DROP COLUMN IF EXISTS tenant_id;`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_saga_instances_tenant_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_work_items_tenant_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_saga_steps_tenant_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_outbox_events_status_occurred_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_outbox_events_correlation_id;`);
  }
}
