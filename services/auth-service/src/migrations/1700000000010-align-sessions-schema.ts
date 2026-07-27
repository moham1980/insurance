import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Forward-only migration that aligns an existing sessions table with the
 * Session entity schema. It is idempotent: if the table already matches the
 * new schema (no `token_hash` column) it only ensures missing columns/indexes.
 */
export class AlignSessionsSchema1700000000010 implements MigrationInterface {
  name = 'AlignSessionsSchema1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        has_token_hash boolean;
      BEGIN
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'sessions' AND column_name = 'token_hash'
        ) INTO has_token_hash;

        IF has_token_hash THEN
          -- Build a canonical sessions table and migrate old data
          CREATE TABLE IF NOT EXISTS sessions_new (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            tenant_id UUID,
            device_fingerprint VARCHAR(64) NOT NULL DEFAULT 'unknown',
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

          INSERT INTO sessions_new (
            id, user_id, tenant_id, device_fingerprint, ip_address, user_agent,
            refresh_token_hash, refresh_token_expires_at, last_activity_at,
            is_revoked, status, created_at, updated_at
          )
          SELECT
            session_id,
            user_id,
            NULL,
            'unknown',
            COALESCE(NULLIF(host(ip_address), ''), NULL)::VARCHAR(255),
            user_agent,
            token_hash,
            expires_at,
            last_used_at,
            CASE WHEN is_active = false THEN true ELSE false END,
            CASE WHEN is_active = true THEN 'active' ELSE 'revoked' END,
            created_at,
            COALESCE(last_used_at, created_at)
          FROM sessions
          ON CONFLICT DO NOTHING;

          DROP TABLE IF EXISTS sessions;
          ALTER TABLE sessions_new RENAME TO sessions;
        END IF;
      END $$;
    `);

    // Ensure all canonical columns/indexes exist (idempotent for new DBs too)
    await queryRunner.query(`ALTER TABLE IF EXISTS sessions ADD COLUMN IF NOT EXISTS tenant_id UUID;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS sessions ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(64) NOT NULL DEFAULT 'unknown';`);
    await queryRunner.query(`ALTER TABLE IF EXISTS sessions ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(512);`);
    await queryRunner.query(`ALTER TABLE IF EXISTS sessions ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMPTZ;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS sessions ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS sessions ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN NOT NULL DEFAULT false;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS sessions ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active';`);
    await queryRunner.query(`ALTER TABLE IF EXISTS sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON sessions(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token_hash ON sessions(refresh_token_hash);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token_expires_at ON sessions(refresh_token_expires_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);`);

    // Drop stale columns from the old schema if they somehow remain
    await queryRunner.query(`ALTER TABLE IF EXISTS sessions DROP COLUMN IF EXISTS token_hash;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS sessions DROP COLUMN IF EXISTS expires_at;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS sessions DROP COLUMN IF EXISTS last_used_at;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS sessions DROP COLUMN IF EXISTS is_active;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS sessions DROP COLUMN IF EXISTS session_id;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sessions;`);
  }
}
