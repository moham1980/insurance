import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdvocacyCommunication1850000000012 implements MigrationInterface {
  name = 'CreateAdvocacyCommunication1850000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS advocacy_communications (
        communication_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        case_id UUID NOT NULL,
        channel TEXT NOT NULL,
        direction TEXT NOT NULL,
        content_ref TEXT NOT NULL,
        content_encryption_key_ref TEXT,
        party_id UUID,
        subject TEXT,
        summary TEXT,
        is_pii BOOLEAN NOT NULL DEFAULT false,
        consent_record_id UUID,
        timestamp TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_advocacy_communications_case_id ON advocacy_communications(case_id);
      CREATE INDEX IF NOT EXISTS idx_advocacy_communications_party_id ON advocacy_communications(party_id);
      CREATE INDEX IF NOT EXISTS idx_advocacy_communications_tenant_id ON advocacy_communications(tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS advocacy_communications;`);
  }
}
