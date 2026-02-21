import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('documents')
@Index(['claimId'])
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

  @Column({ name: 'status', type: 'text' })
  status: string;

  @Column({ name: 'extracted_fields', type: 'jsonb', nullable: true })
  extractedFields: any | null;

  @Column({ name: 'extracted_text', type: 'text', nullable: true })
  extractedText: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
