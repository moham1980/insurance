import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMobileVerificationFields1700000000312 implements MigrationInterface {
  name = 'AddMobileVerificationFields1700000000312';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complainant_mobile_verified BOOLEAN NOT NULL DEFAULT FALSE;`);
    await queryRunner.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complainant_mobile_verified_at TIMESTAMPTZ;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_complaints_mobile_verified ON complaints(complainant_mobile_verified);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_complaints_mobile_verified;`);
    await queryRunner.query(`ALTER TABLE complaints DROP COLUMN IF EXISTS complainant_mobile_verified_at;`);
    await queryRunner.query(`ALTER TABLE complaints DROP COLUMN IF EXISTS complainant_mobile_verified;`);
  }
}
