import { MigrationInterface, QueryRunner } from 'typeorm';

export class P2RlsSubmissionPlacement1820000000003 implements MigrationInterface {
  name = 'P2RlsSubmissionPlacement1820000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'submissions',
      'coverage_requests',
      'document_refs',
      'quote_requests',
      'quote_responses',
      'quote_errors',
      'placements',
      'subjectivities',
      'quote_documents',
      'connector_configs',
    ]) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table};`);
      await queryRunner.query(`
        CREATE POLICY ${table}_tenant_isolation ON ${table}
        USING (tenant_id = current_setting('app.current_tenant')::UUID);
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'submissions',
      'coverage_requests',
      'document_refs',
      'quote_requests',
      'quote_responses',
      'quote_errors',
      'placements',
      'subjectivities',
      'quote_documents',
      'connector_configs',
    ]) {
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table};`);
      await queryRunner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
    }
  }
}
