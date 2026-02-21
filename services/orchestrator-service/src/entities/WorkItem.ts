import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('work_items')
@Index(['sagaId'])
@Index(['status', 'createdAt'])
@Index(['assignedTo'])
export class WorkItem {
  @PrimaryGeneratedColumn('uuid', { name: 'work_item_id' })
  workItemId: string;

  @Column({ name: 'saga_id', type: 'uuid' })
  sagaId: string;

  @Column({ name: 'step_name', type: 'text' })
  stepName: string;

  @Column({ name: 'work_item_type', type: 'text' })
  workItemType: 'human_approval' | 'document_review' | 'fraud_check' | 'payment_approval';

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'escalated';

  @Column({ name: 'claim_id', type: 'uuid', nullable: true })
  claimId: string | null;

  @Column({ name: 'policy_id', type: 'uuid', nullable: true })
  policyId: string | null;

  @Column({ name: 'assigned_to', type: 'text', nullable: true })
  assignedTo: string | null;

  @Column({ name: 'priority', type: 'text', default: 'medium' })
  priority: 'low' | 'medium' | 'high' | 'critical';

  @Column({ name: 'context', type: 'jsonb', nullable: true })
  context: Record<string, any> | null;

  @Column({ name: 'decision_notes', type: 'text', nullable: true })
  decisionNotes: string | null;

  @Column({ name: 'decided_by', type: 'text', nullable: true })
  decidedBy: string | null;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
