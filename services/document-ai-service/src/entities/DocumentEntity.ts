import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('documents')
@Index(['claimId'])
@Index(['status', 'createdAt'])
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'document_id' })
  documentId: string;

  @Column({ name: 'claim_id', type: 'uuid' })
  claimId: string;

  @Column({ name: 'document_type', type: 'text' })
  documentType: string;

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
  status: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
