import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000104 implements MigrationInterface {
  name = 'Init1700000000104';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    return;
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    return;
  }
}
