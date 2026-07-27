import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('complaint_attachments')
@Index(['complaintId', 'createdAt'])
@Index(['documentId'])
export class ComplaintAttachment {
  @PrimaryGeneratedColumn('uuid', { name: 'complaint_attachment_id' })
  complaintAttachmentId!: string;

  @Column({ name: 'complaint_id', type: 'uuid' })
  complaintId!: string;

  @Column({ name: 'document_id', type: 'text' })
  documentId!: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
