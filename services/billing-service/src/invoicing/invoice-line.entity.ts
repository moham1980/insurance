import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
// PremiumInvoice is referenced by invoiceId only to avoid circular dependency with premium-invoice.entity

export enum InvoiceLineType {
  PREMIUM = 'PREMIUM',
  TAX = 'TAX',
  FEE = 'FEE',
  STAMP_DUTY = 'STAMP_DUTY',
  COMMISSION = 'COMMISSION',
  OTHER = 'OTHER',
}

@Entity('premium_invoice_lines')
@Index(['invoiceId'])
@Index(['lineType'])
export class PremiumInvoiceLine {
  @PrimaryGeneratedColumn('uuid', { name: 'line_id' })
  lineId!: string;

  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId!: string;

  @Column({ name: 'line_number', type: 'int' })
  lineNumber!: number;

  @Column({ name: 'line_type', type: 'text' })
  lineType!: InvoiceLineType;

  @Column({ name: 'description', type: 'text' })
  description!: string;

  @Column({ name: 'amount_minor', type: 'numeric' })
  amountMinor!: string;

  @Column({ name: 'currency', type: 'text' })
  currency!: string;

  @Column({ name: 'tax_amount_minor', type: 'numeric', default: 0 })
  taxAmountMinor!: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
