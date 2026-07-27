import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentMetadata1700000000504 implements MigrationInterface {
  name = 'AddPaymentMetadata1700000000504';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'payments';
    await queryRunner.query(`SET search_path TO ${schema}, public;`);
    await queryRunner.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'payments';
    await queryRunner.query(`SET search_path TO ${schema}, public;`);
    await queryRunner.query(`ALTER TABLE payments DROP COLUMN IF EXISTS metadata;`);
  }
}
