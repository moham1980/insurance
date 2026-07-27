import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000700 implements MigrationInterface {
  name = 'Init1700000000700';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    return;
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    return;
  }
}
