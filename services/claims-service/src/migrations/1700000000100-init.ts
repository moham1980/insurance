import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000100 implements MigrationInterface {
  name = 'Init1700000000100';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    return;
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    return;
  }
}
