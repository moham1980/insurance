import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('underwriting_requests')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'createdAt'])
@Index(['policyId', 'createdAt'])
@Index(['status', 'createdAt'])
export class UnderwritingRequest {
  @PrimaryGeneratedColumn('uuid', { name: 'underwriting_request_id' })
  underwritingRequestId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId!: string;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: 'pending' | 'in_review' | 'approved' | 'rejected' | 'escalated';

  @Column({ name: 'reason_code', type: 'text' })
  reasonCode!: string;

  @Column({ name: 'input', type: 'jsonb', nullable: true })
  input!: Record<string, any> | null;

  @Column({ name: 'work_item_id', type: 'uuid', nullable: true })
  workItemId!: string | null;

  @Column({ name: 'work_item_saga_id', type: 'uuid', nullable: true })
  workItemSagaId!: string | null;

  @Column({ name: 'assigned_underwriter_id', type: 'text', nullable: true })
  assignedUnderwriterId!: string | null;

  @Column({ name: 'decision', type: 'text', nullable: true })
  decision!: 'approved' | 'rejected' | 'escalated' | null;

  @Column({ name: 'decision_notes', type: 'text', nullable: true })
  decisionNotes!: string | null;

  @Column({ name: 'escalation_reason', type: 'text', nullable: true })
  escalationReason!: string | null;

  @Column({ name: 'decided_by', type: 'text', nullable: true })
  decidedBy!: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt!: Date | null;

  @Column({ name: 'result', type: 'jsonb', nullable: true })
  result!: Record<string, any> | null;

  @Column({ name: 'risk_assessment_history', type: 'jsonb', nullable: true })
  riskAssessmentHistory!: Array<Record<string, any>> | null;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate!: Date | null;

  @Column({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId!: string | null;

  @Column({ name: 'source', type: 'text', nullable: true })
  source!: string | null;

  @Column({ name: 'version', type: 'int', default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
