import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DocumentStatus {
  PENDING = 'pending',
  INDEXED = 'indexed',
  FAILED = 'failed',
}

export enum DocumentType {
  POLICY = 'policy',
  CLAIM = 'claim',
  CONTRACT = 'contract',
  REGULATION = 'regulation',
  FAQ = 'faq',
  MANUAL = 'manual',
  OTHER = 'other',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Tenant isolation: ensures documents are scoped to a single tenant.
  // System/service accounts may leave this null for cross-tenant operations.
  @Column({ nullable: true })
  tenantId: string;

  @Column()
  externalId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
  })
  type: DocumentType;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  embeddings: number[];

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ nullable: true })
  language: string;

  @Column({ nullable: true })
  source: string;

  @Column({ nullable: true })
  sourceUrl: string;

  @Column({ type: 'int', nullable: true })
  version: number;

  @Column({ type: 'jsonb', nullable: true })
  indexingResult: {
    success: boolean;
    error?: string;
    indexedAt?: Date;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  indexedAt: Date;

  @Column({ type: 'text', nullable: true })
  lastError: string;
}
