import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNbaActionLogs1700000000702 implements MigrationInterface {
  name = 'CreateNbaActionLogs1700000000702';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS nba_action_logs (
        log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action_id TEXT NOT NULL,
        action_code TEXT NOT NULL,
        context_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        actor_user_id TEXT,
        tenant_id TEXT,
        status TEXT NOT NULL DEFAULT 'recommended',
        payload JSONB,
        reason_code TEXT,
        opt_out_reason TEXT,
        confidence DOUBLE PRECISION NOT NULL DEFAULT 0.8,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_nba_status CHECK (status IN ('recommended', 'executed', 'opted_out', 'dismissed'))
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_nba_action_logs_context ON nba_action_logs(context_type, resource_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_nba_action_logs_action_code_actor ON nba_action_logs(action_code, actor_user_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS nba_action_logs;`);
  }
}
