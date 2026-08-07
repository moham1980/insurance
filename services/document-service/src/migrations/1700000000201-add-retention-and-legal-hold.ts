import { MigrationInterface, QueryRunner } from 'typeorm';

// P2 #7: Add retention policy and legal hold columns to documents table.
export class AddRetentionAndLegalHold1700000000201 implements MigrationInterface {
  name = 'AddRetentionAndLegalHold1700000000201';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'public';

    await queryRunner.query(`
      ALTER TABLE "${schema}".documents
      ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_retention_legal_hold
      ON "${schema}".documents(retention_until, legal_hold);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_deleted_at
      ON "${schema}".documents(deleted_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'public';

    await queryRunner.query(`DROP INDEX IF EXISTS "${schema}".idx_documents_deleted_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS "${schema}".idx_documents_retention_legal_hold;`);

    await queryRunner.query(`
      ALTER TABLE "${schema}".documents
      DROP COLUMN IF EXISTS deleted_at,
      DROP COLUMN IF EXISTS legal_hold,
      DROP COLUMN IF EXISTS retention_until;
    `);
  }
}
