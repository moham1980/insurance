import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ReCessionStatus = 'pending' | 'approved' | 'settled' | 'rejected';

@Entity('re_cessions')
@Index(['tenantId', 'treatyId', 'createdAt'])
@Index(['tenantId', 'status', 'createdAt'])
@Index(['tenantId', 'policyId'])
export class ReCession {
  @PrimaryGeneratedColumn('uuid', { name: 'cession_id' })
  cessionId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'treaty_id', type: 'uuid' })
  treatyId!: string;

  @Column({ name: 'policy_id', type: 'text', nullable: true })
  policyId!: string | null;

  @Column({ name: 'policy_number', type: 'text', nullable: true })
  policyNumber!: string | null;

  @Column({ name: 'risk_id', type: 'text', nullable: true })
  riskId!: string | null;

  @Column({ name: 'cession_type', type: 'text', nullable: true })
  cessionType!: string | null;

  @Column({ name: 'sum_insured', type: 'numeric', precision: 18, scale: 2, nullable: true })
  sumInsured!: string | null;

  @Column({ name: 'premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  premium!: string | null;

  @Column({ name: 'cession_percent', type: 'numeric', precision: 6, scale: 3, nullable: true })
  cessionPercent!: string | null;

  @Column({ name: 'ceded_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  cededAmount!: string | null;

  @Column({ name: 'ceded_premium', type: 'numeric', precision: 18, scale: 2, nullable: true })
  cededPremium!: string | null;

  @Column({ name: 'ceded_sum_insured', type: 'numeric', precision: 18, scale: 2, nullable: true })
  cededSumInsured!: string | null;

  @Column({ name: 'retention_rate', type: 'numeric', nullable: true })
  retentionRate!: string | null;

  @Column({ name: 'cession_rate', type: 'numeric', nullable: true })
  cessionRate!: string | null;

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom!: string | null;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo!: string | null;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: ReCessionStatus;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
