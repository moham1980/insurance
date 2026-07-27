import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000300 implements MigrationInterface {
  name = 'Init1700000000300';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    return;
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    return;
  }
}
