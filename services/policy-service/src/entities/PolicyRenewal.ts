import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type RenewalType = 'automatic' | 'manual' | 'scheduled';
export type RenewalStatus = 'pending' | 'reminder_sent' | 'approved' | 'rejected' | 'completed' | 'cancelled';

@Entity('policy_renewals')
@Index(['policyId', 'createdAt'])
@Index(['tenantId', 'createdAt'])
@Index(['status', 'dueDate'])
@Index(['type'])
export class PolicyRenewal {
  @PrimaryGeneratedColumn('uuid', { name: 'renewal_id' })
  renewalId!: string;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId!: string;

  @Column({ name: 'parent_policy_id', type: 'uuid', nullable: true })
  parentPolicyId!: string | null;

  @Column({ name: 'new_policy_id', type: 'uuid', nullable: true })
  newPolicyId!: string | null;

  @Column({ name: 'type', type: 'text', default: 'automatic' })
  type!: RenewalType;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: RenewalStatus;

  @Column({ name: 'previous_start_date', type: 'timestamptz', nullable: true })
  previousStartDate!: Date | null;

  @Column({ name: 'previous_end_date', type: 'timestamptz', nullable: true })
  previousEndDate!: Date | null;

  @Column({ name: 'new_start_date', type: 'timestamptz', nullable: true })
  newStartDate!: Date | null;

  @Column({ name: 'new_end_date', type: 'timestamptz', nullable: true })
  newEndDate!: Date | null;

  @Column({ name: 'previous_premium', type: 'numeric', nullable: true })
  previousPremium!: number | null;

  @Column({ name: 'new_premium', type: 'numeric', nullable: true })
  newPremium!: number | null;

  @Column({ name: 'premium_adjustment_reason', type: 'text', nullable: true })
  premiumAdjustmentReason!: string | null;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate!: Date | null;

  @Column({ name: 'reminder_sent_at', type: 'timestamptz', nullable: true })
  reminderSentAt!: Date | null;

  @Column({ name: 'reminder_count', type: 'int', default: 0 })
  reminderCount!: number;

  @Column({ name: 'approved_by', type: 'text', nullable: true })
  approvedBy!: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
