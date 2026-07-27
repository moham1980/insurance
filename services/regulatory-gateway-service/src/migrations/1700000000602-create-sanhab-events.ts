import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSanhabEvents1700000000602 implements MigrationInterface {
  name = 'CreateSanhabEvents1700000000602';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'regulatory';
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.sanhab_events (
        sanhab_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        external_event_id TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'sanhab',
        correlation_id TEXT NOT NULL,
        payload JSONB NOT NULL,
        headers JSONB,
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sanhab_events_event_type_received_at ON ${schema}.sanhab_events(event_type, received_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'regulatory';
    await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.sanhab_events;`);
  }
}
