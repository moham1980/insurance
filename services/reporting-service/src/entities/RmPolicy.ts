import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('rm_policies')
@Index(['policyNumber'])
@Index(['status'])
@Index(['holderPartyId'])
@Index(['insuredPartyId'])
@Index(['effectiveFrom', 'effectiveTo'])
@Index(['createdAt'])
export class RmPolicy {
  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  tenantId?: string | null;

  @PrimaryGeneratedColumn('uuid', { name: 'policy_id' })
  policyId!: string;

  @Column({ name: 'policy_number', type: 'text', unique: true })
  policyNumber!: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId!: string | null;

  @Column({ name: 'product_name', type: 'text', nullable: true })
  productName!: string | null;

  @Column({ name: 'line_of_business', type: 'text', nullable: true })
  lineOfBusiness!: string | null;

  @Column({ name: 'status', type: 'text' })
  status!: string;

  @Column({ name: 'holder_party_id', type: 'uuid', nullable: true })
  holderPartyId!: string | null;

  @Column({ name: 'holder_name', type: 'text', nullable: true })
  holderName!: string | null;

  @Column({ name: 'insured_party_id', type: 'uuid', nullable: true })
  insuredPartyId!: string | null;

  @Column({ name: 'insured_name', type: 'text', nullable: true })
  insuredName!: string | null;

  @Column({ name: 'effective_from', type: 'timestamptz', nullable: true })
  effectiveFrom!: Date | null;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo!: Date | null;

  @Column({ name: 'sum_insured', type: 'numeric', nullable: true })
  sumInsured!: string | null;

  @Column({ name: 'premium_amount', type: 'numeric', nullable: true })
  premiumAmount!: string | null;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'quoted_at', type: 'timestamptz', nullable: true })
  quotedAt!: Date | null;

  @Column({ name: 'issued_at', type: 'timestamptz', nullable: true })
  issuedAt!: Date | null;

  @Column({ name: 'renewed_at', type: 'timestamptz', nullable: true })
  renewedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'auto_renew', type: 'boolean', default: false })
  autoRenew!: boolean;

  @Column({ name: 'renewal_count', type: 'int', default: 0 })
  renewalCount!: number;

  @Column({ name: 'renewal_parent_id', type: 'uuid', nullable: true })
  renewalParentId!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
