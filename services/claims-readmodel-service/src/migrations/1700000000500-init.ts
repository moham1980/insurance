import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000500 implements MigrationInterface {
  name = 'Init1700000000500';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    return;
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    return;
  }
}
