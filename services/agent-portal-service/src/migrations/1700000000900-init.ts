import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000900 implements MigrationInterface {
  name = 'Init1700000000900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE agent_session_status AS ENUM ('active', 'expired', 'revoked');

      CREATE TABLE agent_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        agent_id UUID NOT NULL,
        jwt_token VARCHAR(255) NOT NULL,
        status agent_session_status DEFAULT 'active',
        expires_at TIMESTAMP NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_agent_sessions_agent_status ON agent_sessions(agent_id, status);
      CREATE INDEX idx_agent_sessions_tenant ON agent_sessions(tenant_id);
      CREATE INDEX idx_agent_sessions_expires ON agent_sessions(expires_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_agent_sessions_expires;
      DROP INDEX IF EXISTS idx_agent_sessions_tenant;
      DROP INDEX IF EXISTS idx_agent_sessions_agent_status;
      DROP TABLE IF EXISTS agent_sessions;
      DROP TYPE IF EXISTS agent_session_status;
    `);
  }
}
