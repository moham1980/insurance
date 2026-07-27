import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000900 implements MigrationInterface {
  name = 'Init1700000000900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS document_ai');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP SCHEMA IF EXISTS document_ai');
  }
}
