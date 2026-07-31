import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ReceivableType = 'COMMISSION' | 'BONUS' | 'SERVICE_FEE' | 'REFUND';
export type ReceivableStatus = 'open' | 'paid' | 'clawback' | 'written_off' | 'disputed';

@Entity('brokerage_receivables')
@Index(['creditorOrganizationId', 'status'])
@Index(['debtorOrganizationId', 'status'])
@Index(['relatedPolicyId'])
export class BrokerageReceivable {
  @PrimaryGeneratedColumn('uuid', { name: 'receivable_id' })
  receivableId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'creditor_organization_id', type: 'uuid' })
  creditorOrganizationId!: string;

  @Column({ name: 'debtor_organization_id', type: 'uuid' })
  debtorOrganizationId!: string;

  @Column({ name: 'related_policy_id', type: 'uuid', nullable: true })
  relatedPolicyId!: string | null;

  @Column({ name: 'type', type: 'text' })
  type!: ReceivableType;

  @Column({ name: 'amount', type: 'numeric' })
  amount!: string;

  @Column({ name: 'currency', type: 'text' })
  currency!: string;

  @Column({ name: 'due_date', type: 'timestamptz' })
  dueDate!: Date;

  @Column({ name: 'status', type: 'text', default: 'open' })
  status!: ReceivableStatus;

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
