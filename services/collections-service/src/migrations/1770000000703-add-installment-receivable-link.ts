import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInstallmentReceivableLink1770000000703 implements MigrationInterface {
  name = 'AddInstallmentReceivableLink1770000000703';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "installments"
      ADD COLUMN IF NOT EXISTS "receivable_id" uuid
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_installments_receivable_id"
      ON "installments" ("receivable_id")
      WHERE "receivable_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_installments_receivable_id"`);
    await queryRunner.query(`ALTER TABLE "installments" DROP COLUMN IF EXISTS "receivable_id"`);
  }
}
