import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartialPaymentFields1700000000503 implements MigrationInterface {
  name = 'AddPartialPaymentFields1700000000503';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'payments';
    await queryRunner.query(`SET search_path TO ${schema}, public;`);
    await queryRunner.query(`
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS partial_index INTEGER NULL,
      ADD COLUMN IF NOT EXISTS total_partial_count INTEGER NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_intents
      DROP COLUMN IF EXISTS is_partial,
      DROP COLUMN IF EXISTS partial_index,
      DROP COLUMN IF EXISTS total_partial_count
    `);
  }
}
