import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000800 implements MigrationInterface {
  name = 'Init1700000000800';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS monitoring');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS monitoring.metrics (
        metric_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_name text NOT NULL,
        metric_name text NOT NULL,
        metric_type text NOT NULL,
        value numeric NOT NULL,
        labels jsonb NULL,
        timestamp timestamptz NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_metrics_service_metric_ts ON monitoring.metrics(service_name, metric_name, timestamp)');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS monitoring.slos (
        slo_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_name text NOT NULL,
        slo_name text NOT NULL,
        description text NULL,
        target numeric NOT NULL,
        "window" text NOT NULL,
        current_value numeric NULL,
        status text NOT NULL DEFAULT 'healthy',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_slos_service_name_slo_name ON monitoring.slos(service_name, slo_name)');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS monitoring.alerts (
        alert_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slo_id uuid NULL,
        service_name text NOT NULL,
        alert_name text NOT NULL,
        description text NOT NULL,
        severity text NOT NULL,
        status text NOT NULL DEFAULT 'firing',
        value numeric NOT NULL,
        threshold numeric NOT NULL,
        acknowledged_by text NULL,
        acknowledged_at timestamptz NULL,
        resolved_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_alerts_status_severity ON monitoring.alerts(status, severity)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON monitoring.alerts(created_at)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS monitoring.alerts');
    await queryRunner.query('DROP TABLE IF EXISTS monitoring.slos');
    await queryRunner.query('DROP TABLE IF EXISTS monitoring.metrics');
    await queryRunner.query('DROP SCHEMA IF EXISTS monitoring');
    await queryRunner.query('DROP EXTENSION IF EXISTS pgcrypto');
  }
}
