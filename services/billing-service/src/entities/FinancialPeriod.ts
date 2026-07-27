import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum PeriodStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  LOCKED = 'locked',
}

@Entity('financial_periods')
@Index(['tenantId', 'status'])
@Index(['startDate', 'endDate'])
export class FinancialPeriod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 50 })
  periodName!: string;

  @Column({ type: 'date' })
  startDate!: Date;

  @Column({ type: 'date' })
  endDate!: Date;

  @Column({ type: 'enum', enum: PeriodStatus, default: PeriodStatus.OPEN })
  status!: PeriodStatus;

  @Column({ type: 'timestamp', nullable: true })
  closedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  closedBy!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  fiscalYear!: string | null;

  @Column({ type: 'integer', nullable: true })
  periodNumber!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
