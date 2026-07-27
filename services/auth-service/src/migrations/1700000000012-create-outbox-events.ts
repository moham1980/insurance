import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOutboxEvents1700000000012 implements MigrationInterface {
  name = 'CreateOutboxEvents1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_outbox_events_status_occurred_at ON outbox_events(status, occurred_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_outbox_events_correlation_id ON outbox_events(correlation_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS outbox_events;`);
  }
}
