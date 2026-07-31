import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type SettlementBatchStatus = 'draft' | 'approved' | 'confirmed' | 'paid' | 'reconciled' | 'disputed' | 'retry_pending' | 'manual_review';

@Entity('brokerage_settlement_batches')
@Index(['fromOrganizationId', 'toOrganizationId'])
@Index(['periodStart', 'periodEnd'])
export class BrokerageSettlementBatch {
  @PrimaryGeneratedColumn('uuid', { name: 'batch_id' })
  batchId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'from_organization_id', type: 'uuid' })
  fromOrganizationId!: string;

  @Column({ name: 'to_organization_id', type: 'uuid' })
  toOrganizationId!: string;

  @Column({ name: 'period_start', type: 'timestamptz' })
  periodStart!: Date;

  @Column({ name: 'period_end', type: 'timestamptz' })
  periodEnd!: Date;

  @Column({ name: 'total_premium_amount', type: 'numeric', default: 0 })
  totalPremiumAmount!: string;

  @Column({ name: 'total_premium_currency', type: 'text', default: 'IRR' })
  totalPremiumCurrency!: string;

  @Column({ name: 'total_commission_amount', type: 'numeric', default: 0 })
  totalCommissionAmount!: string;

  @Column({ name: 'total_commission_currency', type: 'text', default: 'IRR' })
  totalCommissionCurrency!: string;

  @Column({ name: 'net_settlement_amount', type: 'numeric', default: 0 })
  netSettlementAmount!: string;

  @Column({ name: 'net_settlement_currency', type: 'text', default: 'IRR' })
  netSettlementCurrency!: string;

  @Column({ name: 'reconciliation_hash', type: 'text' })
  reconciliationHash!: string;

  @Column({ name: 'status', type: 'text', default: 'draft' })
  status!: SettlementBatchStatus;

  @Column({ name: 'approved_by_party_id', type: 'uuid', nullable: true })
  approvedByPartyId!: string | null;

  @Column({ name: 'calculated_by_party_id', type: 'uuid', nullable: true })
  calculatedByPartyId!: string | null;

  @Column({ name: 'payment_id', type: 'text', nullable: true })
  paymentId!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
