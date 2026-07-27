import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOutboxEvents1700000000604 implements MigrationInterface {
  name = 'CreateOutboxEvents1700000000604';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'regulatory';
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.outbox_events (
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_outbox_events_status_occurred_at ON ${schema}.outbox_events(status, occurred_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_outbox_events_correlation_id ON ${schema}.outbox_events(correlation_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'regulatory';
    await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.outbox_events;`);
  }
}
