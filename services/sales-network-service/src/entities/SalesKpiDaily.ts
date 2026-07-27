import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('sales_kpi_daily')
@Index(['orgUnitId', 'day'], { unique: true })
@Index(['day'])
export class SalesKpiDaily {
  @PrimaryGeneratedColumn('uuid', { name: 'kpi_id' })
  kpiId!: string;

  @Column({ name: 'org_unit_id', type: 'uuid' })
  orgUnitId!: string;

  @Column({ name: 'day', type: 'date' })
  day!: string;

  @Column({ name: 'policies_issued_count', type: 'int', default: 0 })
  policiesIssuedCount!: number;

  @Column({ name: 'policies_renewed_count', type: 'int', default: 0 })
  policiesRenewedCount!: number;

  @Column({ name: 'policies_cancelled_count', type: 'int', default: 0 })
  policiesCancelledCount!: number;

  @Column({ name: 'complaints_created_count', type: 'int', default: 0 })
  complaintsCreatedCount!: number;

  @Column({ name: 'claims_created_count', type: 'int', default: 0 })
  claimsCreatedCount!: number;

  @Column({ name: 'claims_amount', type: 'numeric', default: 0 })
  claimsAmount!: string;

  @Column({ name: 'new_customers_count', type: 'int', default: 0 })
  newCustomersCount!: number;

  @Column({ name: 'premium_issued_amount', type: 'numeric', default: 0 })
  premiumIssuedAmount!: string;

  @Column({ name: 'commission_accrued_amount', type: 'numeric', default: 0 })
  commissionAccruedAmount!: string;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
