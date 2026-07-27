import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('rm_payments')
@Index(['paymentId'])
@Index(['policyId'])
@Index(['status'])
@Index(['paymentType'])
@Index(['createdAt'])
export class RmPayment {
  @PrimaryGeneratedColumn('uuid', { name: 'payment_id' })
  paymentId!: string;

  @Column({ name: 'payment_number', type: 'text', unique: true })
  paymentNumber!: string;

  @Column({ name: 'policy_id', type: 'uuid', nullable: true })
  policyId!: string | null;

  @Column({ name: 'policy_number', type: 'text', nullable: true })
  policyNumber!: string | null;

  @Column({ name: 'claim_id', type: 'uuid', nullable: true })
  claimId!: string | null;

  @Column({ name: 'claim_number', type: 'text', nullable: true })
  claimNumber!: string | null;

  @Column({ name: 'payment_type', type: 'text' })
  paymentType!: string;

  @Column({ name: 'amount', type: 'numeric' })
  amount!: string;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'status', type: 'text' })
  status!: string;

  @Column({ name: 'party_id', type: 'uuid', nullable: true })
  partyId!: string | null;

  @Column({ name: 'party_name', type: 'text', nullable: true })
  partyName!: string | null;

  @Column({ name: 'payment_method', type: 'text', nullable: true })
  paymentMethod!: string | null;

  @Column({ name: 'reference', type: 'text', nullable: true })
  reference!: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt!: Date | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
