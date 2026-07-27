import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('re_ticket_attachments')
@Index(['tenantId', 'ticketId', 'createdAt'])
@Index(['tenantId', 'documentId'])
export class ReTicketAttachment {
  @PrimaryGeneratedColumn('uuid', { name: 'ticket_attachment_id' })
  ticketAttachmentId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId!: string;

  @Column({ name: 'document_id', type: 'text' })
  documentId!: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
