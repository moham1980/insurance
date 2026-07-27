import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePolicySchema1699999999999 implements MigrationInterface {
  name = 'CreatePolicySchema1699999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS policy;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no-op: don't drop schema in down migration
  }
}
