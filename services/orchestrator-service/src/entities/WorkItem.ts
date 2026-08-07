import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum WorkItemStatus {
  pending = 'pending',
  in_progress = 'in_progress',
  approved = 'approved',
  rejected = 'rejected',
  escalated = 'escalated',
  completed = 'completed',
}

export enum WorkItemPriority {
  low = 'low',
  medium = 'medium',
  high = 'high',
  critical = 'critical',
}

@Entity('work_items')
@Index(['sagaId'])
@Index(['tenantId'])
@Index(['status', 'createdAt'])
@Index(['assignedTo'])
export class WorkItem {
  @PrimaryGeneratedColumn('uuid', { name: 'work_item_id' })
  workItemId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'saga_id', type: 'uuid' })
  sagaId: string;

  @Column({ name: 'step_name', type: 'text' })
  stepName: string;

  @Column({ name: 'work_item_type', type: 'text' })
  workItemType:
    | 'human_approval'
    | 'document_review'
    | 'fraud_check'
    | 'suspicious_case'
    | 'sanhab_followup'
    | 'underwriting_review'
    | 'override_review'
    | 'payment_prepare'
    | 'payment_finance_approval'
    | 'payment_execute'
    | 'payment_notify'
    | 'complaint_triage'
    | 'complaint_sla_breach'
    | 'fraud_case_escalation'
    | 'sla_escalation';

  @Column({ name: 'status', type: 'enum', enum: WorkItemStatus, enumName: 'work_item_status', default: WorkItemStatus.pending })
  status: WorkItemStatus;

  @Column({ name: 'claim_id', type: 'uuid', nullable: true })
  claimId: string | null;

  @Column({ name: 'policy_id', type: 'uuid', nullable: true })
  policyId: string | null;

  @Column({ name: 'assigned_to', type: 'text', nullable: true })
  assignedTo: string | null;

  @Column({ name: 'priority', type: 'text', default: WorkItemPriority.medium })
  priority: WorkItemPriority;

  @Column({ name: 'context', type: 'jsonb', nullable: true })
  context: Record<string, any> | null;

  @Column({ name: 'decision_notes', type: 'text', nullable: true })
  decisionNotes: string | null;

  @Column({ name: 'decided_by', type: 'text', nullable: true })
  decidedBy: string | null;

  // P1 #5 (SoD): tracks who submitted/created the work item for approval.
  // The approver (decidedBy) must be a different user (submitter != approver).
  @Column({ name: 'submitted_by', type: 'text', nullable: true })
  submittedBy: string | null;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
