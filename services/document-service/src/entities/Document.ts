import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('documents')
@Index(['tenantId'])
@Index(['claimId'])
@Index(['reconciliationId'])
@Index(['status', 'createdAt'])
@Index(['tenantId', 'status'])
export class Document {
  @PrimaryGeneratedColumn('uuid', { name: 'document_id' })
  documentId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'claim_id', type: 'uuid', nullable: true })
  claimId: string | null;

  @Column({ name: 'reconciliation_id', type: 'uuid', nullable: true })
  reconciliationId: string | null;

  @Column({ name: 'document_type', type: 'text' })
  documentType: 'invoice' | 'medical_report' | 'police_report' | 'photo' | 'receipt' | 'other' | 'reinsurance_invoice';

  @Column({ name: 'file_name', type: 'text' })
  fileName: string;

  @Column({ name: 'storage_ref', type: 'text' })
  storageRef: string;

  @Column({ name: 'mime_type', type: 'text', nullable: true })
  mimeType: string | null;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize: number | null;

  @Column({ name: 'extracted_text', type: 'text', nullable: true })
  extractedText: string | null;

  @Column({ name: 'extracted_fields', type: 'jsonb', nullable: true })
  extractedFields: object | null;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status: 'pending' | 'extracting' | 'extracted' | 'failed';

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: object | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;
}
