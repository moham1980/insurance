import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('rm_ri_ceded')
@Index(['contractId', 'updatedAt'])
@Index(['policyId', 'updatedAt'])
@Index(['claimId', 'updatedAt'])
export class RmRiCeded {
  @PrimaryColumn({ name: 'ri_key', type: 'text' })
  riKey: string;

  @Column({ name: 'contract_id', type: 'uuid' })
  contractId: string;

  @Column({ name: 'policy_id', type: 'text', nullable: true })
  policyId: string | null;

  @Column({ name: 'claim_id', type: 'text', nullable: true })
  claimId: string | null;

  @Column({ name: 'calculation_basis', type: 'text' })
  calculationBasis: string;

  @Column({ name: 'gross_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  grossAmount: string | null;

  @Column({ name: 'ceded_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  cededAmount: string | null;

  @Column({ name: 'retained_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  retainedAmount: string | null;

  @Column({ name: 'currency', type: 'text', nullable: true })
  currency: string | null;

  @Column({ name: 'counterparty_id', type: 'text', nullable: true })
  counterpartyId: string | null;

  @Column({ name: 'occurred_at', type: 'timestamptz', nullable: true })
  occurredAt: Date | null;

  @Column({ name: 'last_event_id', type: 'uuid', nullable: true })
  lastEventId: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;
}
