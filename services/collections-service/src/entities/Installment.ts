import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { InstallmentPlan } from './InstallmentPlan';

@Entity('installments')
@Index(['planId', 'installmentNo'], { unique: true })
@Index(['policyId', 'dueDate'])
@Index(['status', 'updatedAt'])
@Index(['providerRef'], { unique: true, where: 'provider_ref IS NOT NULL' })
export class Installment {
  @PrimaryGeneratedColumn('uuid', { name: 'installment_id' })
  installmentId!: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId!: string;

  @Column({ name: 'installment_no', type: 'int' })
  installmentNo!: number;

  @Column({ name: 'due_date', type: 'timestamptz' })
  dueDate!: Date;

  @Column({ name: 'amount', type: 'numeric' })
  amount!: number;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: 'pending' | 'paid' | 'partially_paid' | 'cancelled' | 'waived';

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'provider', type: 'text', nullable: true })
  provider!: string | null;

  @Column({ name: 'provider_ref', type: 'text', nullable: true })
  providerRef!: string | null;

  @Column({ name: 'payment_details', type: 'jsonb', nullable: true })
  paymentDetails!: Record<string, any> | null;

  // Reminder fields for automatic notifications
  @Column({ name: 'reminder_sent_at', type: 'timestamptz', nullable: true })
  reminderSentAt!: Date | null;

  @Column({ name: 'reminder_count', type: 'int', default: 0 })
  reminderCount!: number;

  @Column({ name: 'overdue_notified_at', type: 'timestamptz', nullable: true })
  overdueNotifiedAt!: Date | null;

  @Column({ name: 'grace_period_end', type: 'timestamptz', nullable: true })
  gracePeriodEnd!: Date | null;

  // Late fee fields
  @Column({ name: 'late_fee_amount', type: 'numeric', nullable: true })
  lateFeeAmount!: number | null;

  @Column({ name: 'late_fee_days', type: 'int', nullable: true })
  lateFeeDays!: number | null;

  @Column({ name: 'total_amount', type: 'numeric', nullable: true })
  totalAmount!: number | null;

  @Column({ name: 'paid_amount', type: 'numeric', default: 0 })
  paidAmount!: number;

  @Column({ name: 'receivable_id', type: 'uuid', nullable: true })
  receivableId!: string | null;

  @ManyToOne(() => InstallmentPlan, (p) => p.installments)
  @JoinColumn({ name: 'plan_id' })
  plan!: InstallmentPlan;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
