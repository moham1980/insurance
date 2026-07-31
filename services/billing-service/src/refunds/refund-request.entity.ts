import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type RefundSourceType = 'POLICY_CANCELLATION' | 'ENDORSEMENT' | 'OVERPAYMENT';
export type RefundStatus = 'pending' | 'approved' | 'sent' | 'settled' | 'failed';

@Entity('refund_requests')
@Index(['tenantId', 'organizationId'])
@Index(['sourceType', 'sourceId'])
export class RefundRequest {
  @PrimaryGeneratedColumn('uuid', { name: 'refund_id' })
  refundId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'source_type', type: 'text' })
  sourceType!: RefundSourceType;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @Column({ name: 'original_payment_id', type: 'uuid' })
  originalPaymentId!: string;

  @Column({ name: 'amount_minor', type: 'numeric' })
  amountMinor!: string;

  @Column({ name: 'currency', type: 'text' })
  currency!: string;

  @Column({ name: 'reason', type: 'text' })
  reason!: string;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: RefundStatus;

  @Column({ name: 'approved_by_party_id', type: 'uuid', nullable: true })
  approvedByPartyId!: string | null;

  @Column({ name: 'payment_id', type: 'text', nullable: true })
  paymentId!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
