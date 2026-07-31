import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type EscrowReleaseType = 'CARRIER_SETTLEMENT' | 'BROKER_COMMISSION' | 'REFUND';
export type EscrowReleaseStatus = 'pending' | 'sent' | 'settled';

@Entity('escrow_releases')
@Index(['holdingId'])
@Index(['status'])
export class EscrowRelease {
  @PrimaryGeneratedColumn('uuid', { name: 'release_id' })
  releaseId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'holding_id', type: 'uuid' })
  holdingId!: string;

  @Column({ name: 'release_type', type: 'text' })
  releaseType!: EscrowReleaseType;

  @Column({ name: 'amount_minor', type: 'numeric' })
  amountMinor!: string;

  @Column({ name: 'currency', type: 'text' })
  currency!: string;

  @Column({ name: 'destination_account_ref', type: 'text' })
  destinationAccountRef!: string;

  @Column({ name: 'payment_id', type: 'text', nullable: true })
  paymentId!: string | null;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: EscrowReleaseStatus;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
