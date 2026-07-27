import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantIdToSanhabEvents1700000000603 implements MigrationInterface {
  name = 'AddTenantIdToSanhabEvents1700000000603';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'regulatory';
    await queryRunner.query(`ALTER TABLE ${schema}.sanhab_events ADD COLUMN IF NOT EXISTS tenant_id TEXT;`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_sanhab_events_tenant_id_received_at ON ${schema}.sanhab_events(tenant_id, received_at);`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'regulatory';
    await queryRunner.query(`DROP INDEX IF EXISTS ${schema}.idx_sanhab_events_tenant_id_received_at;`);
    await queryRunner.query(`ALTER TABLE ${schema}.sanhab_events DROP COLUMN IF EXISTS tenant_id;`);
  }
}
