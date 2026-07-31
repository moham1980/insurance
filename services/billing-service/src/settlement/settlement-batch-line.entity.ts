import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type SettlementBatchLineType = 'PREMIUM' | 'COMMISSION' | 'FEE' | 'CLAWBACK';
export type SettlementBatchLineStatus = 'included' | 'paid' | 'failed';

@Entity('settlement_batch_lines')
@Index(['batchId'])
@Index(['organizationId'])
@Index(['sourceType', 'sourceId'])
export class SettlementBatchLine {
  @PrimaryGeneratedColumn('uuid', { name: 'batch_line_id' })
  batchLineId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'batch_id', type: 'uuid' })
  batchId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'party_id', type: 'uuid', nullable: true })
  partyId!: string | null;

  @Column({ name: 'line_type', type: 'text' })
  lineType!: SettlementBatchLineType;

  @Column({ name: 'source_type', type: 'text' })
  sourceType!: string;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @Column({ name: 'amount_minor', type: 'numeric' })
  amountMinor!: string;

  @Column({ name: 'currency', type: 'text' })
  currency!: string;

  @Column({ name: 'netted_amount_minor', type: 'numeric' })
  nettedAmountMinor!: string;

  @Column({ name: 'status', type: 'text', default: 'included' })
  status!: SettlementBatchLineStatus;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
