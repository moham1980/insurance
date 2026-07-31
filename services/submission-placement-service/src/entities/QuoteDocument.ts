import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type QuoteDocumentStatus = 'required' | 'uploaded' | 'validated' | 'rejected';

@Entity('quote_documents')
@Index(['quoteResponseId'])
export class QuoteDocument {
  @PrimaryGeneratedColumn('uuid', { name: 'quote_document_id' })
  quoteDocumentId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'quote_response_id', type: 'uuid' })
  quoteResponseId!: string;

  @Column({ name: 'document_type', type: 'text' })
  documentType!: string;

  @Column({ name: 'status', type: 'text', default: 'required' })
  status!: QuoteDocumentStatus;

  @Column({ name: 'storage_ref', type: 'text', nullable: true })
  storageRef!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
