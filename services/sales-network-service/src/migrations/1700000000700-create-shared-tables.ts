import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSharedTables1700000000700 implements MigrationInterface {
  name = 'CreateSharedTables1700000000700';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = queryRunner.connection.options.schema ?? 'public';
    const p = `${schema}.`;

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${p}outbox_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      occurred_at timestamptz NOT NULL DEFAULT now(),
      topic text NOT NULL,
      event_type text NOT NULL,
      event_version int NOT NULL,
      correlation_id text NOT NULL,
      tenant_id text NOT NULL,
      organization_id text,
      data_classification text,
      subject_json jsonb NOT NULL,
      payload_json jsonb NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      attempt_count int NOT NULL DEFAULT 0,
      error_message text
    );`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_outbox_events_status_occurred ON ${p}outbox_events(status, occurred_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_outbox_events_correlation ON ${p}outbox_events(correlation_id);`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${p}consumed_events (
      event_id uuid PRIMARY KEY,
      consumer_name text NOT NULL,
      tenant_id text NOT NULL,
      topic text NOT NULL,
      consumed_at timestamptz NOT NULL DEFAULT now()
    );`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_consumed_events_consumed_at ON ${p}consumed_events(consumed_at);`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${p}dead_letter_queue (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      topic text NOT NULL,
      message jsonb NOT NULL,
      error_message text NOT NULL,
      error_stack text,
      retry_count int NOT NULL DEFAULT 0,
      max_retries int NOT NULL DEFAULT 3,
      status text NOT NULL DEFAULT 'pending',
      next_retry_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_dlq_topic_status ON ${p}dead_letter_queue(topic, status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_dlq_retry_next ON ${p}dead_letter_queue(retry_count, next_retry_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_dlq_created_at ON ${p}dead_letter_queue(created_at);`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${p}audit_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id text NOT NULL,
      actor_user_id text,
      action text NOT NULL,
      resource_type text NOT NULL,
      resource_id text,
      details jsonb,
      ip_address text,
      user_agent text,
      correlation_id text,
      created_at timestamptz NOT NULL DEFAULT now()
    );`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_records_tenant_action_created ON ${p}audit_records(tenant_id, action, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_records_actor_created ON ${p}audit_records(actor_user_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_records_resource ON ${p}audit_records(resource_type, resource_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = queryRunner.connection.options.schema ?? 'public';
    const p = `${schema}.`;

    await queryRunner.query(`DROP TABLE IF EXISTS ${p}audit_records;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${p}dead_letter_queue;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${p}consumed_events;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${p}outbox_events;`);
  }
}
