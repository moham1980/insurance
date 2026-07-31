import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BrokerageJournalLine } from './journal-line.entity';

export type BrokerageJournalSourceType = 'POLICY' | 'PAYMENT' | 'REFUND' | 'COMMISSION' | 'SETTLEMENT' | 'CLAWBACK' | 'ENDORSEMENT' | 'CANCELLATION' | 'CLAIM_PAYMENT' | 'RECOVERY';
export type BrokerageJournalEntryStatus = 'posted' | 'reversed';

@Entity('brokerage_journal_entries')
@Index(['tenantId', 'organizationId'])
@Index(['sourceType', 'sourceId'])
@Index(['idempotencyKey'])
export class BrokerageJournalEntry {
  @PrimaryGeneratedColumn('uuid', { name: 'journal_entry_id' })
  journalEntryId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'source_type', type: 'text' })
  sourceType!: BrokerageJournalSourceType;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @Column({ name: 'idempotency_key', type: 'text', unique: true })
  idempotencyKey!: string;

  @Column({ name: 'posting_date', type: 'timestamptz' })
  postingDate!: Date;

  @Column({ name: 'period_id', type: 'uuid' })
  periodId!: string;

  @Column({ name: 'status', type: 'text', default: 'posted' })
  status!: BrokerageJournalEntryStatus;

  @Column({ name: 'reversal_of_journal_entry_id', type: 'uuid', nullable: true })
  reversalOfJournalEntryId!: string | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @OneToMany(() => BrokerageJournalLine, (line) => line.journalEntry, { cascade: true })
  lines!: BrokerageJournalLine[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
