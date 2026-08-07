import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttachmentsToRmComplaints1700000000505 implements MigrationInterface {
  name = 'AddAttachmentsToRmComplaints1700000000505';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // P0 fix: add attachments JSONB column to rm_complaints to store
    // attachment metadata from ComplaintAttachmentAdded events.
    await queryRunner.query(`ALTER TABLE rm_complaints ADD COLUMN IF NOT EXISTS attachments JSONB;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE rm_complaints DROP COLUMN IF EXISTS attachments;`);
  }
}
