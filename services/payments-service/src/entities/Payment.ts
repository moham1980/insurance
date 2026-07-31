import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('payments')
@Index(['tenantId'])
@Index(['paymentIntentId', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['tenantId', 'paymentIntentId', 'providerRef', 'status'], { unique: true })
export class Payment {
  @PrimaryGeneratedColumn('uuid', { name: 'payment_id' })
  paymentId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'policy_id', type: 'text', nullable: true })
  policyId!: string | null;

  @Column({ name: 'broker_organization_id', type: 'uuid', nullable: true })
  brokerOrganizationId!: string | null;

  @Column({ name: 'payment_type', type: 'text', nullable: true })
  paymentType!: 'claim_payment' | 'commission_settlement' | 'premium_payment' | 'refund' | 'transfer' | 'card_to_card' | 'bill_payment' | null;

  @Column({ name: 'payment_intent_id', type: 'uuid' })
  paymentIntentId!: string;

  @Column({ name: 'status', type: 'text' })
  status!: 'executed' | 'failed' | 'refunded' | 'partially_refunded' | 'disputed';

  @Column({ name: 'provider', type: 'text', nullable: true })
  provider!: string | null;

  @Column({ name: 'provider_ref', type: 'text', nullable: true })
  providerRef!: string | null;

  @Column({ name: 'amount', type: 'numeric' })
  amount!: number;

  @Column({ name: 'refunded_amount', type: 'numeric', default: 0 })
  refundedAmount!: number;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'details', type: 'jsonb', nullable: true })
  details!: Record<string, any> | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
