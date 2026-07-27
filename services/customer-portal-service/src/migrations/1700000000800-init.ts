import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000800 implements MigrationInterface {
  name = 'Init1700000000800';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE session_status AS ENUM ('active', 'expired', 'revoked');

      CREATE TABLE customer_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        customer_id UUID,
        phone_number VARCHAR(20) NOT NULL,
        otp VARCHAR(10) NOT NULL,
        status session_status DEFAULT 'active',
        expires_at TIMESTAMP NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_customer_sessions_customer_status ON customer_sessions(customer_id, status);
      CREATE INDEX idx_customer_sessions_phone_status ON customer_sessions(phone_number, status);
      CREATE INDEX idx_customer_sessions_tenant ON customer_sessions(tenant_id);
      CREATE INDEX idx_customer_sessions_expires ON customer_sessions(expires_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_customer_sessions_expires;
      DROP INDEX IF EXISTS idx_customer_sessions_tenant;
      DROP INDEX IF EXISTS idx_customer_sessions_phone_status;
      DROP INDEX IF EXISTS idx_customer_sessions_customer_status;
      DROP TABLE IF EXISTS customer_sessions;
      DROP TYPE IF EXISTS session_status;
    `);
  }
}
