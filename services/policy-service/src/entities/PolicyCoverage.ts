import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export interface Money {
  amountMinor: string;
  currency: string;
}

@Entity('policy_coverages')
@Index(['policyId', 'coverageCode'])
export class PolicyCoverage {
  @PrimaryGeneratedColumn('uuid', { name: 'policy_coverage_id' })
  policyCoverageId!: string;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId!: string;

  @Column({ name: 'coverage_code', type: 'text' })
  coverageCode!: string;

  @Column({ name: 'limit_amount', type: 'numeric', default: 0 })
  limitAmount!: number;

  @Column({ name: 'limit_currency', type: 'text', default: 'IRR' })
  limitCurrency!: string;

  @Column({ name: 'deductible_amount', type: 'numeric', default: 0 })
  deductibleAmount!: number;

  @Column({ name: 'deductible_currency', type: 'text', default: 'IRR' })
  deductibleCurrency!: string;

  @Column({ name: 'premium_amount', type: 'numeric', default: 0 })
  premiumAmount!: number;

  @Column({ name: 'premium_currency', type: 'text', default: 'IRR' })
  premiumCurrency!: string;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: 'active' | 'removed';

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
