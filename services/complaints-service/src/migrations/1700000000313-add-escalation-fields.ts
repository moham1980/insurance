import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEscalationFields1700000000313 implements MigrationInterface {
  name = 'AddEscalationFields1700000000313';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS escalated_reason TEXT;`);
    await queryRunner.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS escalated_by TEXT;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_complaints_escalated_by ON complaints(escalated_by);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_complaints_escalated_by;`);
    await queryRunner.query(`ALTER TABLE complaints DROP COLUMN IF EXISTS escalated_by;`);
    await queryRunner.query(`ALTER TABLE complaints DROP COLUMN IF EXISTS escalated_reason;`);
  }
}
