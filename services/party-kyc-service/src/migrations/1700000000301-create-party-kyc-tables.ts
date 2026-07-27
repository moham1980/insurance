import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePartyKycTables1700000000301 implements MigrationInterface {
  name = 'CreatePartyKycTables1700000000301';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS parties (
        party_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        full_name TEXT NOT NULL,
        national_id TEXT NOT NULL,
        mobile TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_parties_national_id ON parties(national_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_parties_type_created_at ON parties(type, created_at);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kyc_reviews (
        kyc_review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        party_id UUID NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reviewer_user_id TEXT,
        notes TEXT,
        decided_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kyc_reviews_party_created_at ON kyc_reviews(party_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kyc_reviews_status_created_at ON kyc_reviews(status, created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS kyc_reviews;`);
    await queryRunner.query(`DROP TABLE IF EXISTS parties;`);
  }
}
