import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLateFeeColumns1760000000802 implements MigrationInterface {
  name = 'AddLateFeeColumns1760000000802';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE installment_plans
      ADD COLUMN IF NOT EXISTS late_fee_rate_per_day NUMERIC DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS late_fee_max_days INT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS late_fee_max_amount NUMERIC DEFAULT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE installments
      ADD COLUMN IF NOT EXISTS late_fee_amount NUMERIC DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS late_fee_days INT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE installment_plans
      DROP COLUMN IF EXISTS late_fee_rate_per_day,
      DROP COLUMN IF EXISTS late_fee_max_days,
      DROP COLUMN IF EXISTS late_fee_max_amount;
    `);

    await queryRunner.query(`
      ALTER TABLE installments
      DROP COLUMN IF EXISTS late_fee_amount,
      DROP COLUMN IF EXISTS late_fee_days,
      DROP COLUMN IF EXISTS total_amount;
    `);
  }
}
