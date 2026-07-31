import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommissionTiersToBrokerOffering1810000000002 implements MigrationInterface {
  name = 'AddCommissionTiersToBrokerOffering1810000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE broker_product_offerings
      ADD COLUMN IF NOT EXISTS commission_tiers JSONB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE broker_product_offerings
      DROP COLUMN IF EXISTS commission_tiers;
    `);
  }
}
