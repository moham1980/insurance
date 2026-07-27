import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('fraud_document_attachment_audit')
@Index(['claimId', 'createdAt'])
@Index(['documentId', 'createdAt'])
export class FraudDocumentAttachmentAudit {
  @PrimaryGeneratedColumn('uuid', { name: 'audit_id' })
  auditId!: string;

  @Column({ name: 'claim_id', type: 'text' })
  claimId!: string;

  @Column({ name: 'document_id', type: 'text' })
  documentId!: string;

  @Column({ name: 'document_type', type: 'text', nullable: true })
  documentType!: string | null;

  @Column({ name: 'source', type: 'text', nullable: true })
  source!: string | null;

  @Column({ name: 'storage_ref', type: 'text', nullable: true })
  storageRef!: string | null;

  @Column({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId!: string | null;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'actor_user_id', type: 'text', nullable: true })
  actorUserId!: string | null;

  @Column({ name: 'event_id', type: 'text', nullable: true })
  eventId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
