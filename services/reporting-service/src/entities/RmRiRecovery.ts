import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('rm_ri_recoveries')
@Index(['contractId', 'updatedAt'])
@Index(['claimId', 'updatedAt'])
export class RmRiRecovery {
  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  tenantId?: string | null;

  @PrimaryColumn({ name: 'recovery_id', type: 'uuid' })
  recoveryId: string;

  @Column({ name: 'claim_id', type: 'text' })
  claimId: string;

  @Column({ name: 'contract_id', type: 'uuid' })
  contractId: string;

  @Column({ name: 'counterparty_id', type: 'text', nullable: true })
  counterpartyId: string | null;

  @Column({ name: 'recoverable_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  recoverableAmount: string | null;

  @Column({ name: 'recovered_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  recoveredAmount: string | null;

  @Column({ name: 'currency', type: 'text', nullable: true })
  currency: string | null;

  @Column({ name: 'identified_at', type: 'timestamptz', nullable: true })
  identifiedAt: Date | null;

  @Column({ name: 'received_at', type: 'timestamptz', nullable: true })
  receivedAt: Date | null;

  @Column({ name: 'occurred_at', type: 'timestamptz', nullable: true })
  occurredAt: Date | null;

  @Column({ name: 'last_event_id', type: 'uuid', nullable: true })
  lastEventId: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;
}
