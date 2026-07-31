import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { PremiumInvoiceLine } from './invoice-line.entity';
import type { PremiumInstallmentPlan } from './installment-plan.entity';

export type PremiumInvoiceStatus =
  | 'draft'
  | 'issued'
  | 'paid'
  | 'partial'
  | 'overdue'
  | 'cancelled';

export type PremiumPaymentMethod =
  | 'card'
  | 'account_transfer'
  | 'installment'
  | 'cash'
  | 'cheque';

export interface FeeLine {
  feeType: string;
  description: string;
  amountMinor: string;
  currency: string;
}

export interface Money {
  amountMinor: string;
  currency: string;
}

@Entity('premium_invoices')
@Index(['tenantId', 'organizationId'])
@Index(['policyId'])
@Index(['status'])
@Index(['dueDate'])
export class PremiumInvoice {
  @PrimaryGeneratedColumn('uuid', { name: 'invoice_id' })
  invoiceId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId!: string;

  @Column({ name: 'endorsement_id', type: 'uuid', nullable: true })
  endorsementId!: string | null;

  @Column({ name: 'customer_party_id', type: 'uuid' })
  customerPartyId!: string;

  @Column({ name: 'invoice_number', type: 'varchar', length: 50, unique: true })
  invoiceNumber!: string;

  @Column({ name: 'issue_date', type: 'timestamptz' })
  issueDate!: Date;

  @Column({ name: 'due_date', type: 'timestamptz' })
  dueDate!: Date;

  @Column({ name: 'total_premium_amount_minor', type: 'numeric' })
  totalPremiumAmountMinor!: string;

  @Column({ name: 'total_premium_currency', type: 'text' })
  totalPremiumCurrency!: string;

  @Column({ name: 'taxes_amount_minor', type: 'numeric' })
  taxesAmountMinor!: string;

  @Column({ name: 'taxes_currency', type: 'text' })
  taxesCurrency!: string;

  @Column({ name: 'fees', type: 'jsonb' })
  fees!: FeeLine[];

  @Column({ name: 'total_amount_minor', type: 'numeric' })
  totalAmountMinor!: string;

  @Column({ name: 'total_amount_currency', type: 'text' })
  totalAmountCurrency!: string;

  @Column({ name: 'currency', type: 'text' })
  currency!: string;

  @Column({ name: 'status', type: 'text', default: 'draft' })
  status!: PremiumInvoiceStatus;

  @Column({ name: 'payment_method', type: 'text', nullable: true })
  paymentMethod!: PremiumPaymentMethod | null;

  @Column({ name: 'installment_plan_id', type: 'uuid', nullable: true })
  installmentPlanId!: string | null;

  @Column({ name: 'paid_amount_minor', type: 'numeric', default: 0 })
  paidAmountMinor!: string;

  @Column({ name: 'paid_amount_currency', type: 'text', default: 'IRR' })
  paidAmountCurrency!: string;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  lines: PremiumInvoiceLine[] = [];

  installmentPlans: PremiumInstallmentPlan[] = [];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
