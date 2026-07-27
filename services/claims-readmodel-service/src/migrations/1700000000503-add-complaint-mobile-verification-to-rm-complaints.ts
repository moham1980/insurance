import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComplaintMobileVerificationToRmComplaints1700000000503 implements MigrationInterface {
  name = 'AddComplaintMobileVerificationToRmComplaints1700000000503';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE rm_complaints ADD COLUMN IF NOT EXISTS complainant_mobile TEXT;`);
    await queryRunner.query(`ALTER TABLE rm_complaints ADD COLUMN IF NOT EXISTS complainant_mobile_verified BOOLEAN NOT NULL DEFAULT FALSE;`);
    await queryRunner.query(`ALTER TABLE rm_complaints ADD COLUMN IF NOT EXISTS complainant_mobile_verified_at TIMESTAMPTZ;`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_complaints_mobile_verified_updated_at ON rm_complaints(complainant_mobile_verified, updated_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_rm_complaints_mobile_verified_updated_at;`);
    await queryRunner.query(`ALTER TABLE rm_complaints DROP COLUMN IF EXISTS complainant_mobile_verified_at;`);
    await queryRunner.query(`ALTER TABLE rm_complaints DROP COLUMN IF EXISTS complainant_mobile_verified;`);
    await queryRunner.query(`ALTER TABLE rm_complaints DROP COLUMN IF EXISTS complainant_mobile;`);
  }
}
