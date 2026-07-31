import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('sales_kpi_daily')
@Index(['orgUnitId', 'day'], { unique: true })
@Index(['organizationId', 'day'])
@Index(['day'])
export class SalesKpiDaily {
  @PrimaryGeneratedColumn('uuid', { name: 'kpi_id' })
  kpiId!: string;

  @Column({ name: 'org_unit_id', type: 'uuid' })
  orgUnitId!: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId!: string | null;

  @Column({ name: 'day', type: 'date' })
  day!: string;

  @Column({ name: 'policies_issued_count', type: 'int', default: 0 })
  policiesIssuedCount!: number;

  @Column({ name: 'policies_renewed_count', type: 'int', default: 0 })
  policiesRenewedCount!: number;

  @Column({ name: 'policies_cancelled_count', type: 'int', default: 0 })
  policiesCancelledCount!: number;

  @Column({ name: 'policies_active_count', type: 'int', default: 0 })
  policiesActiveCount!: number;

  @Column({ name: 'policies_lapsed_count', type: 'int', default: 0 })
  policiesLapsedCount!: number;

  @Column({ name: 'complaints_created_count', type: 'int', default: 0 })
  complaintsCreatedCount!: number;

  @Column({ name: 'claims_created_count', type: 'int', default: 0 })
  claimsCreatedCount!: number;

  @Column({ name: 'claims_amount', type: 'numeric', default: 0 })
  claimsAmount!: string;

  @Column({ name: 'claims_paid_amount', type: 'numeric', default: 0 })
  claimsPaidAmount!: string;

  @Column({ name: 'new_customers_count', type: 'int', default: 0 })
  newCustomersCount!: number;

  @Column({ name: 'premium_issued_amount', type: 'numeric', default: 0 })
  premiumIssuedAmount!: string;

  @Column({ name: 'premium_renewed_amount', type: 'numeric', default: 0 })
  premiumRenewedAmount!: string;

  @Column({ name: 'commission_accrued_amount', type: 'numeric', default: 0 })
  commissionAccruedAmount!: string;

  @Column({ name: 'commission_clawback_amount', type: 'numeric', default: 0 })
  commissionClawbackAmount!: string;

  @Column({ name: 'persistency_rate_bps', type: 'int', nullable: true })
  persistencyRateBps!: number | null;

  @Column({ name: 'retention_rate_bps', type: 'int', nullable: true })
  retentionRateBps!: number | null;

  @Column({ name: 'loss_ratio_bps', type: 'int', nullable: true })
  lossRatioBps!: number | null;

  @Column({ name: 'avg_premium_per_policy_minor', type: 'numeric', nullable: true })
  avgPremiumPerPolicyMinor!: string | null;

  @Column({ name: 'conversion_rate_bps', type: 'int', nullable: true })
  conversionRateBps!: number | null;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
