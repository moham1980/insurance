import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('endorsements')
@Index(['policyId', 'createdAt'])
@Index(['tenantId', 'status'])
export class Endorsement {
  @PrimaryGeneratedColumn('uuid', { name: 'endorsement_id' })
  endorsementId!: string;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId!: string;

  @Column({ name: 'endorsement_type', type: 'text' })
  endorsementType!: 'change' | 'renewal' | 'cancellation' | 'rewrite' | 'broker_change';

  @Column({ name: 'effective_date', type: 'timestamptz' })
  effectiveDate!: Date;

  @Column({ name: 'requested_by_party_id', type: 'uuid' })
  requestedByPartyId!: string;

  @Column({ name: 'approved_by_party_id', type: 'uuid', nullable: true })
  approvedByPartyId!: string | null;

  @Column({ name: 'premium_delta_amount', type: 'numeric', default: 0 })
  premiumDeltaAmount!: number;

  @Column({ name: 'premium_delta_currency', type: 'text', default: 'IRR' })
  premiumDeltaCurrency!: string;

  @Column({ name: 'tax_delta_amount', type: 'numeric', default: 0 })
  taxDeltaAmount!: number;

  @Column({ name: 'tax_delta_currency', type: 'text', default: 'IRR' })
  taxDeltaCurrency!: string;

  @Column({ name: 'status', type: 'text', default: 'draft' })
  status!: 'draft' | 'submitted' | 'approved' | 'applied' | 'rejected';

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason!: string | null;

  @Column({ name: 'source_placement_id', type: 'uuid', nullable: true })
  sourcePlacementId!: string | null;

  @Column({ name: 'applied_at', type: 'timestamptz', nullable: true })
  appliedAt!: Date | null;

  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt!: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
