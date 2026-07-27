import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type DocumentAiDecision = 'extracted' | 'needs_review' | 'failed';

@Entity('document_ai_audit')
@Index(['documentId', 'createdAt'])
@Index(['decision', 'createdAt'])
export class DocumentAiAudit {
  @PrimaryGeneratedColumn('uuid', { name: 'audit_id' })
  auditId!: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @Column({ name: 'claim_id', type: 'uuid', nullable: true })
  claimId!: string | null;

  @Column({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId!: string | null;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'actor_user_id', type: 'text', nullable: true })
  actorUserId!: string | null;

  @Column({ name: 'action', type: 'text', nullable: true })
  action!: string | null;

  @Column({ name: 'status', type: 'text', nullable: true })
  status!: string | null;

  @Column({ name: 'input', type: 'jsonb', nullable: true })
  input!: any | null;

  @Column({ name: 'output', type: 'jsonb', nullable: true })
  output!: any | null;

  @Column({ name: 'confidence', type: 'numeric', precision: 6, scale: 3, nullable: true })
  confidence!: string | null;

  @Column({ name: 'decision', type: 'text' })
  decision!: DocumentAiDecision;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason!: string | null;

  @Column({ name: 'provider', type: 'jsonb', nullable: true })
  provider!: any | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'error_stack', type: 'text', nullable: true })
  errorStack!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
