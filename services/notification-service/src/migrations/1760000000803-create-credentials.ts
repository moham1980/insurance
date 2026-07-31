import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCredentials1760000000803 implements MigrationInterface {
  name = 'CreateCredentials1760000000803';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE credential_provider AS ENUM (
        'kavenegar', 'twilio', 'mellipayamak', 'sendgrid', 'aws_ses', 'fcm', 'apns'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE credential_type AS ENUM (
        'api_key', 'api_secret', 'auth_token', 'username_password', 'webhook_secret'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS credentials (
        credential_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        provider credential_provider NOT NULL,
        credential_type credential_type NOT NULL,
        encrypted_value TEXT NOT NULL,
        masked_value TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        expires_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_credentials_tenant ON credentials(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_credentials_tenant_provider_type ON credentials(tenant_id, provider, credential_type);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_credentials_tenant_provider_type;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_credentials_tenant;`);
    await queryRunner.query(`DROP TABLE IF EXISTS credentials;`);
    await queryRunner.query(`DROP TYPE IF EXISTS credential_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS credential_provider;`);
  }
}
