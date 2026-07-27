import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSharedEventTables1760000000512 implements MigrationInterface {
  name = 'CreateSharedEventTables1760000000512';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS outbox_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        topic TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_version INT NOT NULL,
        correlation_id TEXT NOT NULL,
        subject_json JSONB NOT NULL,
        payload_json JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempt_count INT NOT NULL DEFAULT 0,
        error_message TEXT
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_outbox_events_status_occurred_at ON outbox_events(status, occurred_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_outbox_events_correlation_id ON outbox_events(correlation_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS consumed_events (
        event_id UUID NOT NULL,
        consumer_name TEXT NOT NULL,
        consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        topic TEXT NOT NULL,
        PRIMARY KEY (event_id, consumer_name)
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_consumed_events_consumed_at ON consumed_events(consumed_at);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dead_letter_queue (
        dlq_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_event_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        partition INTEGER,
        "offset" TEXT,
        key TEXT,
        value JSONB NOT NULL,
        headers JSONB,
        error_message TEXT NOT NULL,
        error_stack TEXT,
        consumer_group TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        status TEXT NOT NULL DEFAULT 'pending',
        next_retry_at TIMESTAMPTZ,
        last_error_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_dlq_topic_status ON dead_letter_queue(topic, status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_dlq_retry_next ON dead_letter_queue(retry_count, next_retry_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_dlq_created_at ON dead_letter_queue(created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS dead_letter_queue;`);
    await queryRunner.query(`DROP TABLE IF EXISTS consumed_events;`);
    await queryRunner.query(`DROP TABLE IF EXISTS outbox_events;`);
  }
}
