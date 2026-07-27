import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRegulatoryFailureLog1700000000601 implements MigrationInterface {
  name = 'AddRegulatoryFailureLog1700000000601';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS regulatory_failure_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        correlation_id TEXT,
        tenant_id TEXT,
        actor_user_id TEXT,
        operation TEXT NOT NULL,
        upstream TEXT,
        error_code TEXT,
        http_status INT,
        error_message TEXT,
        error_stack TEXT,
        request_json JSONB,
        response_json JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_regulatory_failure_log_created_at ON regulatory_failure_log(created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_regulatory_failure_log_correlation_id ON regulatory_failure_log(correlation_id);`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_regulatory_failure_log_operation_upstream_created_at ON regulatory_failure_log(operation, upstream, created_at);`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS regulatory_failure_log;`);
  }
}
