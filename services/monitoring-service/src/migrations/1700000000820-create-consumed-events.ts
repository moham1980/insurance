import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConsumedEvents1700000000820 implements MigrationInterface {
  name = 'CreateConsumedEvents1700000000820';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS consumed_events;`);
  }
}
