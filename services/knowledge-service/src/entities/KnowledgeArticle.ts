import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ArticleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum ArticleCategory {
  POLICY = 'policy',
  CLAIMS = 'claims',
  BILLING = 'billing',
  UNDERWRITING = 'underwriting',
  REGULATORY = 'regulatory',
  GENERAL = 'general',
}

@Entity('knowledge_articles')
@Index(['tenantId', 'status'])
@Index(['category'])
@Index(['title'], { fulltext: true })
export class KnowledgeArticle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'enum', enum: ArticleCategory })
  category!: ArticleCategory;

  @Column({ type: 'jsonb', nullable: true })
  tags!: string[] | null;

  @Column({ type: 'enum', enum: ArticleStatus, default: ArticleStatus.DRAFT })
  status!: ArticleStatus;

  @Column({ type: 'uuid', nullable: true })
  authorId!: string | null;

  @Column({ type: 'integer', default: 0 })
  viewCount!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
