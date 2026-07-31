import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePartnerGatewayTables1700000000700 implements MigrationInterface {
  name = 'CreatePartnerGatewayTables1700000000700';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS partner_registrations (
        partner_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        partner_tenant_id TEXT NOT NULL,
        partner_organization_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        mtls_cert_subject TEXT NOT NULL,
        allowed_scopes JSONB DEFAULT '[]',
        allowed_apis JSONB DEFAULT '[]',
        rate_limit_rps INT DEFAULT 100,
        status TEXT DEFAULT 'active',
        valid_from TIMESTAMPTZ NOT NULL,
        valid_to TIMESTAMPTZ,
        distribution_agreement_id TEXT,
        token_exchange_endpoint TEXT,
        partner_api_gateway_url TEXT,
        revoked_at TIMESTAMPTZ,
        revoked_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_reg_tenant_pair ON partner_registrations(tenant_id, partner_tenant_id);
      CREATE INDEX IF NOT EXISTS idx_partner_reg_org ON partner_registrations(organization_id);
      CREATE INDEX IF NOT EXISTS idx_partner_reg_partner_org ON partner_registrations(partner_organization_id);
      CREATE INDEX IF NOT EXISTS idx_partner_reg_status ON partner_registrations(status);

      CREATE TABLE IF NOT EXISTS federation_nonces (
        nonce_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nonce TEXT NOT NULL UNIQUE,
        partner_id TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_fed_nonces_expires ON federation_nonces(expires_at);

      CREATE TABLE IF NOT EXISTS partner_certificates (
        cert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id TEXT NOT NULL,
        cert_subject TEXT NOT NULL,
        cert_serial TEXT NOT NULL,
        public_cert_pem TEXT NOT NULL,
        issuer TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        valid_from TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        rotated_at TIMESTAMPTZ,
        rotated_from_cert_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_partner_certs_partner ON partner_certificates(partner_id);
      CREATE INDEX IF NOT EXISTS idx_partner_certs_status ON partner_certificates(status);
      CREATE INDEX IF NOT EXISTS idx_partner_certs_expires ON partner_certificates(expires_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS partner_certificates;`);
    await queryRunner.query(`DROP TABLE IF EXISTS federation_nonces;`);
    await queryRunner.query(`DROP TABLE IF EXISTS partner_registrations;`);
  }
}
