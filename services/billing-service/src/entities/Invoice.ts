import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum InvoiceType {
  POLICY_PREMIUM = 'policy_premium',
  CLAIM_PAYOUT = 'claim_payout',
  COMMISSION = 'commission',
  FEE = 'fee',
}

@Entity('invoices')
@Index(['tenantId', 'status'])
@Index(['policyId'])
@Index(['dueDate'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  invoiceNumber!: string;

  @Column({ type: 'uuid', nullable: true })
  policyId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  claimId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  customerId!: string | null;

  @Column({ type: 'enum', enum: InvoiceType })
  invoiceType!: InvoiceType;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status!: InvoiceStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  paidAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ type: 'timestamp' })
  dueDate!: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  lineItems!: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
