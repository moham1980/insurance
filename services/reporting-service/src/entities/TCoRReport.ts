import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('tcor_reports')
@Index(['tenantId'])
@Index(['periodId'])
@Index(['status'])
export class TCoRReport {
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null;

  @PrimaryGeneratedColumn('uuid', { name: 'report_id' })
  reportId!: string;

  @Column({ name: 'period_id', type: 'text' })
  periodId!: string;

  @Column({ name: 'period_start_date', type: 'timestamptz', nullable: true })
  periodStartDate!: Date | null;

  @Column({ name: 'period_end_date', type: 'timestamptz', nullable: true })
  periodEndDate!: Date | null;

  @Column({ name: 'report_type', type: 'text', default: 'tcor' })
  reportType!: string;

  @Column({ name: 'status', type: 'text', default: 'draft' })
  status!: string;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'total_premium', type: 'numeric', nullable: true })
  totalPremium!: string | null;

  @Column({ name: 'total_claim_paid', type: 'numeric', nullable: true })
  totalClaimPaid!: string | null;

  @Column({ name: 'acquisition_cost', type: 'numeric', nullable: true })
  acquisitionCost!: string | null;

  @Column({ name: 'operating_expense', type: 'numeric', nullable: true })
  operatingExpense!: string | null;

  @Column({ name: 'reinsurance_cost', type: 'numeric', nullable: true })
  reinsuranceCost!: string | null;

  @Column({ name: 'total_cost_of_risk', type: 'numeric', nullable: true })
  totalCostOfRisk!: string | null;

  @Column({ name: 'combined_ratio', type: 'numeric', nullable: true })
  combinedRatio!: string | null;

  @Column({ name: 'loss_ratio', type: 'numeric', nullable: true })
  lossRatio!: string | null;

  @Column({ name: 'expense_ratio', type: 'numeric', nullable: true })
  expenseRatio!: string | null;

  @Column({ name: 'generated_at', type: 'timestamptz', nullable: true })
  generatedAt!: Date | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt!: Date | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy!: string | null;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
