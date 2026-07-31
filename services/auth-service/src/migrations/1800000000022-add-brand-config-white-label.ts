import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrandConfigWhiteLabel1800000000022 implements MigrationInterface {
  name = 'AddBrandConfigWhiteLabel1800000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE brand_configs ADD COLUMN IF NOT EXISTS custom_css TEXT;`);
    await queryRunner.query(`ALTER TABLE brand_configs ADD COLUMN IF NOT EXISTS legal_text_fa TEXT;`);
    await queryRunner.query(`ALTER TABLE brand_configs ADD COLUMN IF NOT EXISTS legal_text_en TEXT;`);
    await queryRunner.query(`ALTER TABLE brand_configs ADD COLUMN IF NOT EXISTS welcome_message_fa TEXT;`);
    await queryRunner.query(`ALTER TABLE brand_configs ADD COLUMN IF NOT EXISTS welcome_message_en TEXT;`);
    await queryRunner.query(`ALTER TABLE brand_configs ADD COLUMN IF NOT EXISTS support_url TEXT;`);
    await queryRunner.query(`ALTER TABLE brand_configs ADD COLUMN IF NOT EXISTS portal_login_background_url TEXT;`);
    await queryRunner.query(`ALTER TABLE brand_configs ADD COLUMN IF NOT EXISTS header_logo_url TEXT;`);
    await queryRunner.query(`ALTER TABLE brand_configs ADD COLUMN IF NOT EXISTS primary_font TEXT NOT NULL DEFAULT 'Vazirmatn';`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE brand_configs DROP COLUMN IF EXISTS primary_font;`);
    await queryRunner.query(`ALTER TABLE brand_configs DROP COLUMN IF EXISTS header_logo_url;`);
    await queryRunner.query(`ALTER TABLE brand_configs DROP COLUMN IF EXISTS portal_login_background_url;`);
    await queryRunner.query(`ALTER TABLE brand_configs DROP COLUMN IF EXISTS support_url;`);
    await queryRunner.query(`ALTER TABLE brand_configs DROP COLUMN IF EXISTS welcome_message_en;`);
    await queryRunner.query(`ALTER TABLE brand_configs DROP COLUMN IF EXISTS welcome_message_fa;`);
    await queryRunner.query(`ALTER TABLE brand_configs DROP COLUMN IF EXISTS legal_text_en;`);
    await queryRunner.query(`ALTER TABLE brand_configs DROP COLUMN IF EXISTS legal_text_fa;`);
    await queryRunner.query(`ALTER TABLE brand_configs DROP COLUMN IF EXISTS custom_css;`);
  }
}
