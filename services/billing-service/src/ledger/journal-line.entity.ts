import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { BrokerageJournalEntry } from './journal-entry.entity';

@Entity('brokerage_journal_lines')
@Index(['journalEntryId'])
@Index(['accountId'])
export class BrokerageJournalLine {
  @PrimaryGeneratedColumn('uuid', { name: 'journal_line_id' })
  journalLineId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'journal_entry_id', type: 'uuid' })
  journalEntryId!: string;

  @ManyToOne('BrokerageJournalEntry', (entry: BrokerageJournalEntry) => entry.lines)
  @JoinColumn({ name: 'journal_entry_id' })
  journalEntry!: BrokerageJournalEntry;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId!: string;

  @Column({ name: 'debit_amount', type: 'numeric', default: 0 })
  debitAmount!: string;

  @Column({ name: 'debit_currency', type: 'text', default: 'IRR' })
  debitCurrency!: string;

  @Column({ name: 'credit_amount', type: 'numeric', default: 0 })
  creditAmount!: string;

  @Column({ name: 'credit_currency', type: 'text', default: 'IRR' })
  creditCurrency!: string;

  @Column({ name: 'dimensions', type: 'jsonb', nullable: true })
  dimensions!: Record<string, string> | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;
}
