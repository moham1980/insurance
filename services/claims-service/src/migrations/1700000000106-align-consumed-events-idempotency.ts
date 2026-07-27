import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignConsumedEventsIdempotency1700000000106 implements MigrationInterface {
  name = 'AlignConsumedEventsIdempotency1700000000106';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS consumed_events
      ADD COLUMN IF NOT EXISTS consumer_name TEXT NOT NULL DEFAULT 'legacy';
    `);

    // Make legacy columns nullable so idempotency inserts can write minimal data.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consumed_events' AND column_name='event_type') THEN
          EXECUTE 'ALTER TABLE consumed_events ALTER COLUMN event_type DROP NOT NULL';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consumed_events' AND column_name='event_version') THEN
          EXECUTE 'ALTER TABLE consumed_events ALTER COLUMN event_version DROP NOT NULL';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consumed_events' AND column_name='correlation_id') THEN
          EXECUTE 'ALTER TABLE consumed_events ALTER COLUMN correlation_id DROP NOT NULL';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consumed_events' AND column_name='subject_json') THEN
          EXECUTE 'ALTER TABLE consumed_events ALTER COLUMN subject_json DROP NOT NULL';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consumed_events' AND column_name='payload_json') THEN
          EXECUTE 'ALTER TABLE consumed_events ALTER COLUMN payload_json DROP NOT NULL';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_consumed_events_event_consumer
      ON consumed_events(event_id, consumer_name);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_consumed_events_consumed_at
      ON consumed_events(consumed_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_consumed_events_consumed_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_consumed_events_event_consumer;`);

    // Best-effort rollback: restore NOT NULL constraints if columns exist.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consumed_events' AND column_name='payload_json') THEN
          EXECUTE 'ALTER TABLE consumed_events ALTER COLUMN payload_json SET NOT NULL';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consumed_events' AND column_name='subject_json') THEN
          EXECUTE 'ALTER TABLE consumed_events ALTER COLUMN subject_json SET NOT NULL';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consumed_events' AND column_name='correlation_id') THEN
          EXECUTE 'ALTER TABLE consumed_events ALTER COLUMN correlation_id SET NOT NULL';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consumed_events' AND column_name='event_version') THEN
          EXECUTE 'ALTER TABLE consumed_events ALTER COLUMN event_version SET NOT NULL';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consumed_events' AND column_name='event_type') THEN
          EXECUTE 'ALTER TABLE consumed_events ALTER COLUMN event_type SET NOT NULL';
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE IF EXISTS consumed_events DROP COLUMN IF EXISTS consumer_name;`);
  }
}
