import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000001200 implements MigrationInterface {
  name = 'Init1700000001200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE article_status AS ENUM ('draft', 'published', 'archived');
      CREATE TYPE article_category AS ENUM ('policy', 'claims', 'billing', 'underwriting', 'regulatory', 'general');

      CREATE TABLE knowledge_articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        category article_category NOT NULL,
        tags JSONB,
        status article_status DEFAULT 'draft',
        author_id UUID,
        view_count INTEGER DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_knowledge_articles_tenant_status ON knowledge_articles(tenant_id, status);
      CREATE INDEX idx_knowledge_articles_category ON knowledge_articles(category);
      CREATE INDEX idx_knowledge_articles_title ON knowledge_articles USING gin(to_tsvector('english', title));
      CREATE INDEX idx_knowledge_articles_content ON knowledge_articles USING gin(to_tsvector('english', content));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_knowledge_articles_content;
      DROP INDEX IF EXISTS idx_knowledge_articles_title;
      DROP INDEX IF EXISTS idx_knowledge_articles_category;
      DROP INDEX IF EXISTS idx_knowledge_articles_tenant_status;
      DROP TABLE IF EXISTS knowledge_articles;
      DROP TYPE IF EXISTS article_category;
      DROP TYPE IF EXISTS article_status;
    `);
  }
}
