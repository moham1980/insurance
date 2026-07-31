import { MigrationInterface, QueryRunner } from 'typeorm';

export class P1AgreementReconciliation1810000000001 implements MigrationInterface {
  name = 'P1AgreementReconciliation1810000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Backfill version chain for pre-P1 agreements
    await queryRunner.query(`
      UPDATE distribution_agreements
      SET version_chain_id = agreement_id,
          previous_agreement_id = NULL
      WHERE version_chain_id IS NULL;
    `);

    // Reconciliation check: log agreements with active status but no approvals if created after P1
    // This is a placeholder for a real reconciliation report; here we ensure schema consistency.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_distribution_agreements_status_lob
      ON distribution_agreements(status, lines_of_business);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_distribution_agreements_status_lob;`);
  }
}
