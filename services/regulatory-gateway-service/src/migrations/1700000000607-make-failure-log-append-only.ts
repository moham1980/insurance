import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeFailureLogAppendOnly1700000000607 implements MigrationInterface {
  name = 'MakeFailureLogAppendOnly1700000000607';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'regulatory';
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION ${schema}.prevent_failure_log_mutation()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'regulatory_failure_log is append-only and cannot be modified or deleted';
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_prevent_failure_log_update ON ${schema}.regulatory_failure_log;`);
    await queryRunner.query(`
      CREATE TRIGGER trg_prevent_failure_log_update
      BEFORE UPDATE ON ${schema}.regulatory_failure_log
      FOR EACH ROW EXECUTE FUNCTION ${schema}.prevent_failure_log_mutation();
    `);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_prevent_failure_log_delete ON ${schema}.regulatory_failure_log;`);
    await queryRunner.query(`
      CREATE TRIGGER trg_prevent_failure_log_delete
      BEFORE DELETE ON ${schema}.regulatory_failure_log
      FOR EACH ROW EXECUTE FUNCTION ${schema}.prevent_failure_log_mutation();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'regulatory';
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_prevent_failure_log_delete ON ${schema}.regulatory_failure_log;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_prevent_failure_log_update ON ${schema}.regulatory_failure_log;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS ${schema}.prevent_failure_log_mutation();`);
  }
}
