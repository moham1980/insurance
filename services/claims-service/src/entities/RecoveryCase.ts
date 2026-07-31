import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type RecoveryCaseStatus = 'open' | 'in_negotiation' | 'recovered' | 'written_off';

@Entity('recovery_cases')
@Index(['claimId'])
@Index(['responsiblePartyId'])
@Index(['tenantId'])
export class RecoveryCase {
  @PrimaryGeneratedColumn('uuid', { name: 'recovery_id' })
  recoveryId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'claim_id', type: 'uuid' })
  claimId: string;

  @Column({ name: 'responsible_party_id', type: 'uuid', nullable: true })
  responsiblePartyId: string | null;

  @Column({ name: 'expected_recovery_amount', type: 'numeric' })
  expectedRecoveryAmount: number;

  @Column({ name: 'expected_recovery_currency', type: 'text', default: 'IRR' })
  expectedRecoveryCurrency: string;

  @Column({ name: 'recovered_amount', type: 'numeric', default: 0 })
  recoveredAmount: number;

  @Column({ name: 'recovered_currency', type: 'text', default: 'IRR' })
  recoveredCurrency: string;

  @Column({ name: 'status', type: 'text', default: 'open' })
  status: RecoveryCaseStatus;

  @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true })
  journalEntryId: string | null;

  @Column({ name: 'recovery_metadata', type: 'jsonb', nullable: true })
  recoveryMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
