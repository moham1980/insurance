import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantIndexToFailureLog1700000000605 implements MigrationInterface {
  name = 'AddTenantIndexToFailureLog1700000000605';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'regulatory';
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_regulatory_failure_log_tenant_id_created_at ON ${schema}.regulatory_failure_log(tenant_id, created_at);`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'regulatory';
    await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.idx_regulatory_failure_log_tenant_id_created_at;`);
  }
}
