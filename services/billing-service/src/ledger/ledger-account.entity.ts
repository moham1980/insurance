import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type BrokerageLedgerAccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'CONTROL';

@Entity('brokerage_ledger_accounts')
@Index(['tenantId', 'code'])
@Index(['organizationId', 'code'])
export class BrokerageLedgerAccount {
  @PrimaryGeneratedColumn('uuid', { name: 'account_id' })
  accountId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'code', type: 'text' })
  code!: string;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'type', type: 'text' })
  type!: BrokerageLedgerAccountType;

  @Column({ name: 'currency', type: 'text' })
  currency!: string;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: 'active' | 'closed';

  @Column({ name: 'parent_account_id', type: 'uuid', nullable: true })
  parentAccountId!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
