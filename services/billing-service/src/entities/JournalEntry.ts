import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum EntryType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

export enum EntryStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  REVERSED = 'reversed',
}

@Entity('journal_entries')
@Index(['tenantId', 'status'])
@Index(['businessKey'])
@Index(['postedAt'])
export class JournalEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 50 })
  entryNumber!: string;

  @Column({ type: 'varchar', length: 100 })
  description!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  businessKey!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  businessType!: string | null;

  @Column({ type: 'date' })
  entryDate!: Date;

  @Column({ type: 'enum', enum: EntryStatus, default: EntryStatus.DRAFT })
  status!: EntryStatus;

  @Column({ type: 'timestamp', nullable: true })
  postedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  postedBy!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reversalEntryNumber!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  lines!: Array<{
    accountCode: string;
    description: string;
    debitAmount: number;
    creditAmount: number;
    reference?: string;
  }> | null;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalDebit!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalCredit!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
