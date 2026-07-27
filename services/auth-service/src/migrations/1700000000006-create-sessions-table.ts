import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessionsTable1700000000006 implements MigrationInterface {
  name = 'CreateSessionsTable1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        tenant_id UUID,
        device_fingerprint VARCHAR(64) NOT NULL,
        ip_address VARCHAR(255),
        user_agent TEXT,
        refresh_token_hash VARCHAR(512),
        refresh_token_expires_at TIMESTAMPTZ,
        last_activity_at TIMESTAMPTZ,
        is_revoked BOOLEAN NOT NULL DEFAULT false,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON sessions(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token_hash ON sessions(refresh_token_hash);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token_expires_at ON sessions(refresh_token_expires_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sessions;`);
  }
}
