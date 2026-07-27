import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFederatedIdentitiesTable1700000000014 implements MigrationInterface {
  name = 'CreateFederatedIdentitiesTable1700000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS federated_identities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        provider_id VARCHAR(100) NOT NULL,
        provider_user_id VARCHAR(255) NOT NULL,
        attributes JSONB,
        linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_federated_identities_user_provider ON federated_identities(user_id, provider_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_federated_identities_provider_user ON federated_identities(provider_id, provider_user_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS federated_identities;`);
  }
}
