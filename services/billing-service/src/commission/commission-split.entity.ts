import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type CommissionSplitRole = 'CARRIER' | 'BROKER' | 'AGENT' | 'SUB_AGENT' | 'MARKETER';
export type CommissionSplitBase = 'premium_gross' | 'premium_net';
export type CommissionSplitStatus = 'accrued' | 'paid' | 'clawback' | 'voided';

@Entity('commission_splits')
@Index(['journalEntryId'])
@Index(['organizationId', 'status'])
export class CommissionSplit {
  @PrimaryGeneratedColumn('uuid', { name: 'split_id' })
  splitId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true })
  journalEntryId!: string | null;

  @Column({ name: 'party_id', type: 'uuid', nullable: true })
  partyId!: string | null;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'role', type: 'text' })
  role!: CommissionSplitRole;

  @Column({ name: 'base', type: 'text' })
  base!: CommissionSplitBase;

  @Column({ name: 'share_bps', type: 'int' })
  shareBps!: number;

  @Column({ name: 'amount', type: 'numeric' })
  amount!: string;

  @Column({ name: 'currency', type: 'text' })
  currency!: string;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom!: Date;

  @Column({ name: 'status', type: 'text', default: 'accrued' })
  status!: CommissionSplitStatus;

  @Column({ name: 'commission_schedule_snapshot', type: 'jsonb', nullable: true })
  commissionScheduleSnapshot!: Record<string, any> | null;

  @Column({ name: 'source_type', type: 'text' })
  sourceType!: string;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
