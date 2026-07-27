import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInstallmentReminderColumns1760000000702 implements MigrationInterface {
  name = 'AddInstallmentReminderColumns1760000000702';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE installments
      ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS reminder_count INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS overdue_notified_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMPTZ;
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_installments_reminder_due ON installments(due_date, reminder_sent_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_installments_overdue ON installments(due_date, overdue_notified_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_installments_reminder_due;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_installments_overdue;`);
    
    await queryRunner.query(`
      ALTER TABLE installments
      DROP COLUMN IF EXISTS reminder_sent_at,
      DROP COLUMN IF EXISTS reminder_count,
      DROP COLUMN IF EXISTS overdue_notified_at,
      DROP COLUMN IF EXISTS grace_period_end;
    `);
  }
}
