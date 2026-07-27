import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureConsumedEvents1700000000602 implements MigrationInterface {
  name = 'EnsureConsumedEvents1700000000602';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS consumed_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id text NOT NULL,
      consumer_name text NOT NULL,
      topic text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_consumed_events_event_consumer ON consumed_events(event_id, consumer_name);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS consumed_events;`);
  }
}
