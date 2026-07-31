import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type AdvocacyTaskType = 'follow_up' | 'document_request' | 'carrier_call' | 'customer_update' | 'adjuster_referral' | 'payment_check';
export type AdvocacyTaskStatus = 'pending' | 'in_progress' | 'done' | 'overdue';

@Entity('advocacy_tasks')
@Index(['caseId'])
@Index(['assignedToPartyId'])
@Index(['status'])
@Index(['dueDate'])
@Index(['tenantId'])
export class AdvocacyTask {
  @PrimaryGeneratedColumn('uuid', { name: 'task_id' })
  taskId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'case_id', type: 'uuid' })
  caseId: string;

  @Column({ name: 'task_type', type: 'text' })
  taskType: AdvocacyTaskType;

  @Column({ name: 'assigned_to_party_id', type: 'uuid' })
  assignedToPartyId: string;

  @Column({ name: 'due_date', type: 'timestamptz' })
  dueDate: Date;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status: AdvocacyTaskStatus;

  @Column({ name: 'outcome', type: 'text', nullable: true })
  outcome: string | null;

  @Column({ name: 'task_metadata', type: 'jsonb', nullable: true })
  taskMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
