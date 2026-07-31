import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('broker_transaction_reports')
@Index(['tenantId'])
@Index(['brokerOrganizationId'])
@Index(['periodId'])
@Index(['status'])
export class BrokerTransactionReport {
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null;

  @PrimaryGeneratedColumn('uuid', { name: 'report_id' })
  reportId!: string;

  @Column({ name: 'broker_organization_id', type: 'uuid', nullable: true })
  brokerOrganizationId!: string | null;

  @Column({ name: 'period_id', type: 'text' })
  periodId!: string;

  @Column({ name: 'period_start_date', type: 'timestamptz', nullable: true })
  periodStartDate!: Date | null;

  @Column({ name: 'period_end_date', type: 'timestamptz', nullable: true })
  periodEndDate!: Date | null;

  @Column({ name: 'report_type', type: 'text', default: 'broker_transaction' })
  reportType!: string;

  @Column({ name: 'status', type: 'text', default: 'draft' })
  status!: string;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'policy_count', type: 'int', default: 0 })
  policyCount!: number;

  @Column({ name: 'premium_amount', type: 'numeric', nullable: true })
  premiumAmount!: string | null;

  @Column({ name: 'claim_count', type: 'int', default: 0 })
  claimCount!: number;

  @Column({ name: 'claim_paid_amount', type: 'numeric', nullable: true })
  claimPaidAmount!: string | null;

  @Column({ name: 'commission_amount', type: 'numeric', nullable: true })
  commissionAmount!: string | null;

  @Column({ name: 'technical_result', type: 'numeric', nullable: true })
  technicalResult!: string | null;

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
