import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type CommissionLedgerStatus = 'accrued' | 'voided' | 'paid';

@Entity('commission_ledger')
@Index(['orgUnitId', 'createdAt'])
@Index(['policyId'])
@Index(['eventId'], { unique: true })
@Index(['status', 'createdAt'])
export class CommissionLedgerEntry {
  @PrimaryGeneratedColumn('uuid', { name: 'ledger_entry_id' })
  ledgerEntryId!: string;

  @Column({ name: 'event_id', type: 'text' })
  eventId!: string;

  @Column({ name: 'event_type', type: 'text' })
  eventType!: string;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;

  @Column({ name: 'org_unit_id', type: 'uuid' })
  orgUnitId!: string;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId!: string;

  @Column({ name: 'policy_number', type: 'text', nullable: true })
  policyNumber!: string | null;

  @Column({ name: 'line_of_business', type: 'text', nullable: true })
  lineOfBusiness!: string | null;

  @Column({ name: 'premium_amount', type: 'numeric', nullable: true })
  premiumAmount!: string | null;

  @Column({ name: 'commission_rate', type: 'numeric', nullable: true })
  commissionRate!: string | null;

  @Column({ name: 'commission_amount', type: 'numeric' })
  commissionAmount!: string;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate!: Date | null;

  @Column({ name: 'paid_date', type: 'timestamptz', nullable: true })
  paidDate!: Date | null;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'contract_id', type: 'uuid', nullable: true })
  contractId!: string | null;

  @Column({ name: 'status', type: 'text', default: 'accrued' })
  status!: CommissionLedgerStatus;

  @Column({ name: 'void_reason', type: 'text', nullable: true })
  voidReason!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
