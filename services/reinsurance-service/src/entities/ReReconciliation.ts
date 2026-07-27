import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ReReconciliationStatus = 'open' | 'matched' | 'disputed' | 'closed';

@Entity('re_reconciliations')
@Index(['tenantId', 'statementId', 'createdAt'])
@Index(['tenantId', 'status', 'createdAt'])
export class ReReconciliation {
  @PrimaryGeneratedColumn('uuid', { name: 'reconciliation_id' })
  reconciliationId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'statement_id', type: 'uuid' })
  statementId!: string;

  @Column({ name: 'status', type: 'text', default: 'open' })
  status!: ReReconciliationStatus;

  @Column({ name: 'summary', type: 'text', nullable: true })
  summary!: string | null;

  @Column({ name: 'details', type: 'jsonb', nullable: true })
  details!: any | null;

  // External invoice fields for auto-matching
  @Column({ name: 'external_invoice_number', type: 'text', nullable: true })
  externalInvoiceNumber!: string | null;

  @Column({ name: 'external_invoice_date', type: 'date', nullable: true })
  externalInvoiceDate!: string | null;

  @Column({ name: 'external_invoice_amount', type: 'numeric', nullable: true })
  externalInvoiceAmount!: number | null;

  @Column({ name: 'external_invoice_currency', type: 'text', nullable: true })
  externalInvoiceCurrency!: string | null;

  @Column({ name: 'received_from', type: 'text', nullable: true })
  receivedFrom!: string | null;

  @Column({ name: 'matched_at', type: 'timestamptz', nullable: true })
  matchedAt!: Date | null;

  @Column({ name: 'match_confidence', type: 'numeric', nullable: true })
  matchConfidence!: number | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
