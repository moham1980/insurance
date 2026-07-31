import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type EscrowSourceType = 'PREMIUM' | 'REFUND' | 'SETTLEMENT';
export type EscrowHoldingStatus = 'held' | 'released' | 'refunded';

@Entity('escrow_holdings')
@Index(['tenantId', 'escrowAccountRef'])
@Index(['sourceType', 'sourceId'])
@Index(['status'])
export class EscrowHolding {
  @PrimaryGeneratedColumn('uuid', { name: 'holding_id' })
  holdingId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'escrow_account_ref', type: 'text' })
  escrowAccountRef!: string;

  @Column({ name: 'source_type', type: 'text' })
  sourceType!: EscrowSourceType;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @Column({ name: 'amount_minor', type: 'numeric' })
  amountMinor!: string;

  @Column({ name: 'currency', type: 'text' })
  currency!: string;

  @Column({ name: 'status', type: 'text', default: 'held' })
  status!: EscrowHoldingStatus;

  @Column({ name: 'expected_release_at', type: 'timestamptz', nullable: true })
  expectedReleaseAt!: Date | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt!: Date | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
