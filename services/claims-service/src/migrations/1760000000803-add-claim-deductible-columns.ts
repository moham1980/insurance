import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClaimDeductibleColumns1760000000803 implements MigrationInterface {
  name = 'AddClaimDeductibleColumns1760000000803';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE claims
      ADD COLUMN IF NOT EXISTS deductible_amount NUMERIC DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS deductible_percentage NUMERIC DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS franchise_amount NUMERIC DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS franchise_percentage NUMERIC DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS gross_claim_amount NUMERIC DEFAULT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE claims
      DROP COLUMN IF EXISTS deductible_amount,
      DROP COLUMN IF EXISTS deductible_percentage,
      DROP COLUMN IF EXISTS franchise_amount,
      DROP COLUMN IF EXISTS franchise_percentage,
      DROP COLUMN IF EXISTS gross_claim_amount;
    `);
  }
}
