import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClaimNumberSeq1880000000001 implements MigrationInterface {
  name = 'CreateClaimNumberSeq1880000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create sequence for claim number generation (used by claims-service)
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS claim_number_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        NO CACHE
        CYCLE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE IF EXISTS claim_number_seq;`);
  }
}
