import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum ReconciliationStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  UNMATCHED = 'unmatched',
  MANUAL_REVIEW = 'manual_review',
}

@Entity('reconciliation_results')
@Index(['tenantId', 'status'])
@Index(['sourceType', 'sourceId'])
export class ReconciliationResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 50 })
  sourceType!: string; // 'policy', 'claim', 'payment', etc.

  @Column({ type: 'uuid' })
  sourceId!: string;

  @Column({ type: 'uuid', nullable: true })
  journalEntryId!: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  expectedAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  actualAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  variance!: number;

  @Column({
    type: 'enum',
    enum: ReconciliationStatus,
    default: ReconciliationStatus.PENDING,
  })
  status!: ReconciliationStatus;

  @Column({ type: 'jsonb', nullable: true })
  details!: {
    differences: Record<string, any>;
    notes?: string;
  } | null;

  @Column({ type: 'timestamp' })
  periodStart!: Date;

  @Column({ type: 'timestamp' })
  periodEnd!: Date;

  @Column({ type: 'uuid', nullable: true })
  reconciledBy!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  reconciledAt!: Date | null;
}
