import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type PayableType = 'PREMIUM' | 'TAX' | 'LEVY' | 'FEE';
export type PayableStatus = 'open' | 'paid' | 'overdue' | 'written_off' | 'disputed';

@Entity('brokerage_payables')
@Index(['debtorOrganizationId', 'status'])
@Index(['creditorOrganizationId', 'status'])
@Index(['relatedPolicyId'])
export class BrokeragePayable {
  @PrimaryGeneratedColumn('uuid', { name: 'payable_id' })
  payableId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'debtor_organization_id', type: 'uuid' })
  debtorOrganizationId!: string;

  @Column({ name: 'creditor_organization_id', type: 'uuid' })
  creditorOrganizationId!: string;

  @Column({ name: 'related_policy_id', type: 'uuid', nullable: true })
  relatedPolicyId!: string | null;

  @Column({ name: 'type', type: 'text' })
  type!: PayableType;

  @Column({ name: 'amount', type: 'numeric' })
  amount!: string;

  @Column({ name: 'currency', type: 'text' })
  currency!: string;

  @Column({ name: 'due_date', type: 'timestamptz' })
  dueDate!: Date;

  @Column({ name: 'status', type: 'text', default: 'open' })
  status!: PayableStatus;

  @Column({ name: 'source_type', type: 'text' })
  sourceType!: string;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true })
  journalEntryId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
