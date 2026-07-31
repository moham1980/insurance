import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type TransactionScreeningType = 'commission' | 'settlement_batch' | 'commission_batch';
export type TransactionScreeningStatus = 'not_started' | 'in_progress' | 'passed' | 'failed' | 'manual_review';

@Entity('transaction_aml_screenings')
@Index(['tenantId', 'transactionType', 'createdAt'])
@Index(['tenantId', 'partyId', 'createdAt'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'batchId'])
export class TransactionAmlScreening {
  @PrimaryGeneratedColumn('uuid', { name: 'screening_id' })
  screeningId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'party_id', type: 'uuid' })
  partyId!: string;

  @Column({ name: 'transaction_type', type: 'text' })
  transactionType!: TransactionScreeningType;

  @Column({ name: 'transaction_id', type: 'text', nullable: true })
  transactionId!: string | null;

  @Column({ name: 'batch_id', type: 'text', nullable: true })
  batchId!: string | null;

  @Column({ name: 'amount', type: 'numeric', precision: 18, scale: 2 })
  amount!: number;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'status', type: 'text', default: 'not_started' })
  status!: TransactionScreeningStatus;

  @Column({ name: 'screening_results', type: 'jsonb', nullable: true })
  screeningResults!: Record<string, any> | null;

  @Column({ name: 'risk_level', type: 'text', nullable: true })
  riskLevel!: 'low' | 'medium' | 'high' | 'critical' | null;

  @Column({ name: 'risk_factors', type: 'jsonb', nullable: true })
  riskFactors!: string[] | null;

  @Column({ name: 'screened_at', type: 'timestamptz', nullable: true })
  screenedAt!: Date | null;

  @Column({ name: 'reviewed_by', type: 'text', nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
