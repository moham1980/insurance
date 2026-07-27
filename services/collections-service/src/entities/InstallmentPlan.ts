import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Installment } from './Installment';

@Entity('installment_plans')
@Index(['policyId'])
@Index(['status', 'updatedAt'])
@Index(['idempotencyKey'], { unique: true })
export class InstallmentPlan {
  @PrimaryGeneratedColumn('uuid', { name: 'plan_id' })
  planId!: string;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId!: string;

  @Column({ name: 'premium_amount', type: 'numeric' })
  premiumAmount!: number;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: 'active' | 'completed' | 'cancelled';

  @Column({ name: 'idempotency_key', type: 'text', unique: true })
  idempotencyKey!: string;

  @Column({ name: 'meta', type: 'jsonb', nullable: true })
  meta!: Record<string, any> | null;

  // Late fee configuration
  @Column({ name: 'late_fee_rate_per_day', type: 'numeric', nullable: true })
  lateFeeRatePerDay!: number | null;

  @Column({ name: 'late_fee_max_days', type: 'int', nullable: true })
  lateFeeMaxDays!: number | null;

  @Column({ name: 'late_fee_max_amount', type: 'numeric', nullable: true })
  lateFeeMaxAmount!: number | null;

  @OneToMany(() => Installment, (i) => i.plan)
  installments!: Installment[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
