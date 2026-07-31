import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type DocumentRefStatus = 'required' | 'uploaded' | 'validated' | 'rejected';

@Entity('document_refs')
@Index(['submissionId'])
@Index(['quoteResponseId'])
export class DocumentRef {
  @PrimaryGeneratedColumn('uuid', { name: 'document_id' })
  documentId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'submission_id', type: 'uuid' })
  submissionId!: string;

  @Column({ name: 'quote_response_id', type: 'uuid', nullable: true })
  quoteResponseId!: string | null;

  @Column({ name: 'document_type', type: 'text' })
  documentType!: string;

  @Column({ name: 'status', type: 'text', default: 'required' })
  status!: DocumentRefStatus;

  @Column({ name: 'storage_ref', type: 'text', nullable: true })
  storageRef!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ name: 'validated_at', type: 'timestamptz', nullable: true })
  validatedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
